/**
 * Eliy Agent Core — 实时语音通话会话管理
 *
 * 管理全双工语音对话的完整生命周期：
 * - 用户说话 → STT → LLM → TTS → Lip Sync → 播放
 * - 支持用户随时打断（interrupt）
 * - 投料阶段感知：不同阶段使用不同语气模板
 */

import type { ReleasePhase } from '../methodology/types.js';
import type { LLMAdapter, LLMRequest } from '../../adapters/llm/types.js';
import { DefaultLLMGovernance } from '../../adapters/llm/types.js';
import type { RealtimeVoiceAdapter, TranscriptEvent, VADEvent, SpeakChunk, VisemeEvent } from '../../adapters/voice/realtime.js';
import { SessionManager } from './session.js';

// === 通话状态 ===
export type VoiceSessionStatus =
  | 'IDLE'           // 未开始
  | 'LISTENING'      // 正在听用户说话
  | 'PROCESSING'     // LLM 思考中
  | 'SPEAKING'       // Eliy 正在说话
  | 'INTERRUPTED';   // 被用户打断

export interface VoiceSessionState {
  status: VoiceSessionStatus;
  currentPhase: ReleasePhase;
  /** 累计通话时长 (ms) */
  durationMs: number;
  /** 当前 viseme（用于驱动头像动画） */
  currentViseme: VisemeEvent | null;
  /** 是否已播放欢迎语 */
  welcomePlayed: boolean;
}

// === 事件回调 ===
export interface VoiceSessionCallbacks {
  /** 状态变更 */
  onStatusChange: (status: VoiceSessionStatus) => void;
  /** Viseme 更新（驱动头像唇形） */
  onViseme: (viseme: VisemeEvent) => void;
  /** Eliy 的文字输出（同步显示字幕） */
  onSubtitle: (text: string, done: boolean) => void;
  /** 用户的语音转文字 */
  onUserTranscript: (text: string, isFinal: boolean) => void;
  /** 投料阶段变更 */
  onPhaseChange: (phase: ReleasePhase) => void;
  /** 错误 */
  onError: (error: string) => void;
}

// === 欢迎语（宪法合规） ===
const WELCOME_MESSAGE =
  '你好，我是 Eliy，你的商业诊断教练。' +
  '我会用清晰、专业的判断帮助你分析挑战、量化瓶颈、做出投料决策。' +
  '请直接告诉我：你当前面临的最大商业挑战是什么？';

// === 实时通话会话管理器 ===
export class VoiceSessionManager {
  private state: VoiceSessionState;
  private voice: RealtimeVoiceAdapter;
  private llm: LLMAdapter;
  private session: SessionManager;
  private callbacks: VoiceSessionCallbacks;
  private governance = new DefaultLLMGovernance();
  private startTime = 0;
  private userBuffer = ''; // 用户说话的文字缓冲区

  constructor(
    voice: RealtimeVoiceAdapter,
    llm: LLMAdapter,
    session: SessionManager,
    callbacks: VoiceSessionCallbacks,
  ) {
    this.voice = voice;
    this.llm = llm;
    this.session = session;
    this.callbacks = callbacks;
    this.state = {
      status: 'IDLE',
      currentPhase: 'INTAKE',
      durationMs: 0,
      currentViseme: null,
      welcomePlayed: false,
    };
  }

  /** 开始实时通话 */
  async start(userId: string): Promise<void> {
    await this.session.createSession(userId);
    await this.voice.startSession();
    this.startTime = Date.now();

    // 注册 STT 回调
    this.voice.onTranscript((event: TranscriptEvent) => {
      this.handleTranscript(event);
    });

    // 注册 VAD 回调（语音活动检测）
    this.voice.onVAD((event: VADEvent) => {
      this.handleVAD(event);
    });

    // 播放欢迎语
    this.setStatus('SPEAKING');
    await this.speakWithLipSync(WELCOME_MESSAGE);
    this.state.welcomePlayed = true;
    this.setStatus('LISTENING');
  }

  /** 结束通话 */
  async end(): Promise<void> {
    this.voice.interrupt();
    await this.voice.endSession();
    this.state.durationMs = Date.now() - this.startTime;
    this.setStatus('IDLE');
    this.session.endSession();
  }

  /** 用户打断 Eliy */
  interrupt(): void {
    if (this.state.status === 'SPEAKING') {
      this.voice.interrupt();
      this.setStatus('INTERRUPTED');
      // 短暂延迟后切回 LISTENING
      setTimeout(() => this.setStatus('LISTENING'), 200);
    }
  }

  getState(): Readonly<VoiceSessionState> {
    return { ...this.state };
  }

  // === 内部处理 ===

  private handleTranscript(event: TranscriptEvent): void {
    this.callbacks.onUserTranscript(event.text, event.isFinal);

    if (event.isFinal) {
      this.userBuffer += event.text;
      // 用户说完一句话 → 触发 LLM 响应
      this.processUserInput(this.userBuffer);
      this.userBuffer = '';
    } else {
      // 中间结果：累积到缓冲区
      this.userBuffer = event.text;
    }
  }

  private handleVAD(event: VADEvent): void {
    if (event.type === 'SPEECH_START') {
      // 用户开始说话
      if (this.state.status === 'SPEAKING') {
        // 全双工：用户打断 Eliy
        this.interrupt();
      }
      this.setStatus('LISTENING');
    }
  }

  private async processUserInput(text: string): Promise<void> {
    if (!text.trim()) return;

    this.session.addMessage('user', text);
    this.setStatus('PROCESSING');

    const currentSession = this.session.getCurrentSession();
    if (!currentSession) return;

    // 构建 LLM 请求
    const request: LLMRequest = {
      messages: this.session.getConversationHistory(),
      systemPrompt: this.buildVoiceSystemPrompt(currentSession.currentPhase),
      releasePhase: currentSession.currentPhase,
      stream: true,
      governance: {
        sessionId: currentSession.id,
        userId: currentSession.userId,
        purpose: 'COMMUNICATION',
      },
    };

    // 治理检查
    const preCheck = this.governance.preCallCheck(request);
    if (!preCheck.passed) {
      const blocks = preCheck.violations.filter(v => v.severity === 'BLOCK');
      if (blocks.length) {
        this.callbacks.onError(blocks.map(b => b.description).join('; '));
        this.setStatus('LISTENING');
        return;
      }
    }

    // Streaming LLM → TTS → Lip Sync
    let fullResponse = '';
    try {
      this.setStatus('SPEAKING');
      let sentenceBuffer = '';

      for await (const chunk of this.llm.stream(request)) {
        fullResponse += chunk.content;
        sentenceBuffer += chunk.content;

        // 字幕同步
        this.callbacks.onSubtitle(chunk.content, chunk.done);

        // 句子级 TTS：遇到句号/问号/感叹号时合成
        if (/[。？！.?!]/.test(chunk.content) || chunk.done) {
          if (sentenceBuffer.trim()) {
            await this.speakWithLipSync(sentenceBuffer.trim());
          }
          sentenceBuffer = '';
        }

        if (chunk.done) break;
      }

      this.session.addMessage('assistant', fullResponse);
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err.message : 'LLM 调用失败');
    }

    this.setStatus('LISTENING');
  }

  /** 合成语音并驱动唇形动画 */
  private async speakWithLipSync(text: string): Promise<void> {
    for await (const chunk of this.voice.speak(text)) {
      if (this.state.status !== 'SPEAKING') break; // 被打断

      // 驱动头像唇形
      this.state.currentViseme = chunk.viseme;
      this.callbacks.onViseme(chunk.viseme);
    }

    // 说完后闭嘴
    const silentViseme = { visemeId: 'sil' as const, duration: 0, amplitude: 0, timestamp: Date.now() };
    this.state.currentViseme = silentViseme;
    this.callbacks.onViseme(silentViseme);
  }

  /** 语音场景的 System Prompt（更口语化） */
  private buildVoiceSystemPrompt(phase: ReleasePhase): string {
    return [
      '你是 Eliy，一个经验丰富的商业诊断教练。你正在通过语音与创业者实时对话。',
      '',
      '语音对话规则：',
      '- 回答要简洁有力，每次回应控制在 3-5 句话',
      '- 使用口语化表达，但保持专业判断力',
      '- 关键判断必须附带置信度（高/中/低）',
      '- 不要使用"加油""相信自己"等空洞表达',
      '- 如果信息不够，直接提问，不要猜测',
      '',
      `当前投料阶段: ${phase}`,
      phase === 'INTAKE' ? '现在是信息收集阶段，多问少判断。' :
      phase === 'DIAGNOSIS' ? '现在是诊断阶段，可以给出有依据的判断。' :
      '按阶段行事，不跳阶段。',
    ].join('\n');
  }

  private setStatus(status: VoiceSessionStatus): void {
    this.state.status = status;
    this.callbacks.onStatusChange(status);
  }
}
