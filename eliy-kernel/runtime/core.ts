/**
 * Eliy Agent Core — 主运行时引擎
 * 加载 Kernel + Adapters，管理会话生命周期，执行治理检查
 */

import type { MethodologyInput, MethodologyOutput, ReleasePhase } from '../methodology/types.js';
import { TPLiteEngine } from '../methodology/tp_lite.js';
import { SFocusEngine } from '../methodology/sfocus.js';
import { HaystackFilterEngine } from '../methodology/haystack_filter.js';
import type { LLMAdapter, LLMRequest, LLMResponse, LLMGovernanceHook } from '../../adapters/llm/types.js';
import { DefaultLLMGovernance } from '../../adapters/llm/types.js';
import { ToolExecutor, type ToolAdapter } from '../../adapters/tools/types.js';
import type { RelationalStorage, VectorStorage } from '../../adapters/storage/types.js';
import type { UIAdapter, UIInputEvent, UIOutputEvent } from '../../adapters/ui/types.js';
import type { STTAdapter, TTSAdapter } from '../../adapters/voice/types.js';
import { SessionManager, type SessionState } from './session.js';

// === 配置 ===
export interface EliyRuntimeConfig {
  llm: LLMAdapter;
  llmGovernance?: LLMGovernanceHook;
  ui: UIAdapter;
  relationalStorage?: RelationalStorage;
  vectorStorage?: VectorStorage;
  stt?: STTAdapter;
  tts?: TTSAdapter;
  tools?: ToolAdapter[];
}

export type RuntimeStatus = 'IDLE' | 'INITIALIZING' | 'RUNNING' | 'ERROR' | 'SHUTDOWN';

// === 主引擎 ===
export class EliyRuntime {
  private status: RuntimeStatus = 'IDLE';
  private config: EliyRuntimeConfig;
  private governance: LLMGovernanceHook;
  private toolExecutor: ToolExecutor;
  private sessionManager: SessionManager;
  // 方法论引擎（Kernel 内部，不可被外部替换）
  private readonly tpLite = new TPLiteEngine();
  private readonly sFocus = new SFocusEngine();
  private readonly haystack = new HaystackFilterEngine();

  constructor(config: EliyRuntimeConfig) {
    this.config = config;
    this.governance = config.llmGovernance ?? new DefaultLLMGovernance();
    this.toolExecutor = new ToolExecutor();
    this.sessionManager = new SessionManager(config.relationalStorage);
    config.tools?.forEach(t => this.toolExecutor.register(t));
  }

  // === 生命周期 ===
  async start(): Promise<void> {
    this.status = 'INITIALIZING';
    const llmHealth = await this.config.llm.healthCheck();
    if (!llmHealth.available) console.warn(`[Runtime] ⚠️ LLM 不可用: ${llmHealth.error}`);
    if (this.config.relationalStorage) {
      const db = await this.config.relationalStorage.healthCheck();
      if (!db.connected) console.warn('[Runtime] ⚠️ DB 不可用，降级为内存模式');
    }
    this.setupUIEventHandlers();
    this.status = 'RUNNING';
    console.log(`[Runtime] ✅ 启动完成 | LLM: ${this.config.llm.name} | UI: ${this.config.ui.name}`);
  }

  async shutdown(): Promise<void> {
    this.config.ui.disconnect();
    this.status = 'SHUTDOWN';
  }

  getStatus() { return this.status; }

  // === UI 事件路由 ===
  private setupUIEventHandlers(): void {
    this.config.ui.onInput(async (event: UIInputEvent) => {
      try {
        switch (event.type) {
          case 'SESSION_START': await this.handleSessionStart(event.userId); break;
          case 'USER_MESSAGE': await this.handleUserMessage(event.content); break;
          case 'VOICE_INPUT': await this.handleVoiceInput(event.audio); break;
          case 'HITL_CONFIRM': await this.handleHITLConfirm(event.judgmentId, event.decision, event.modification); break;
          case 'RADAR_ADJUST': await this.handleRadarAdjust(event.dimension, event.newScore); break;
          case 'SESSION_END': await this.handleSessionEnd(); break;
        }
      } catch (err) {
        this.emitToUI({ type: 'ERROR', message: err instanceof Error ? err.message : '未知错误', recoverable: true });
      }
    });
  }

  // === 核心处理 ===
  private async handleSessionStart(userId: string): Promise<void> {
    const session = await this.sessionManager.createSession(userId);
    this.emitToUI({ type: 'PHASE_UPDATE', phase: session.currentPhase, progress: 0 });
    await this.streamLLMResponse({
      messages: [{ role: 'user', content: '开始新会话' }],
      systemPrompt: this.buildSystemPrompt(session),
      releasePhase: session.currentPhase, stream: true,
      governance: { sessionId: session.id, userId, purpose: 'COMMUNICATION' },
    });
  }

  private async handleUserMessage(content: string): Promise<void> {
    const session = this.sessionManager.getCurrentSession();
    if (!session) { this.emitToUI({ type: 'ERROR', message: '请先开始会话', recoverable: true }); return; }
    this.sessionManager.addMessage('user', content);

    const request: LLMRequest = {
      messages: this.sessionManager.getConversationHistory(),
      systemPrompt: this.buildSystemPrompt(session),
      releasePhase: session.currentPhase, stream: true,
      governance: { sessionId: session.id, userId: session.userId, purpose: this.inferPurpose(session.currentPhase) },
    };

    // 治理前置检查
    const pre = this.governance.preCallCheck(request);
    if (!pre.passed) {
      const blocks = pre.violations.filter(v => v.severity === 'BLOCK');
      if (blocks.length) { this.emitToUI({ type: 'ERROR', message: blocks.map(b => b.description).join('; '), recoverable: true }); return; }
    }
    await this.streamLLMResponse(request);
  }

  private async handleVoiceInput(audio: ArrayBuffer): Promise<void> {
    if (!this.config.stt) { this.emitToUI({ type: 'ERROR', message: '语音未配置', recoverable: true }); return; }
    const r = await this.config.stt.transcribe(audio);
    await this.handleUserMessage(r.text);
  }

  private async handleHITLConfirm(judgmentId: string, decision: 'APPROVE' | 'REJECT' | 'MODIFY', mod?: string): Promise<void> {
    this.sessionManager.recordHITLDecision(judgmentId, decision, mod);
    if (decision === 'APPROVE' && this.sessionManager.getPendingConfirmations().length === 0) this.tryAdvancePhase();
  }

  private async handleRadarAdjust(dim: string, score: number): Promise<void> {
    this.sessionManager.updateRadarScore(dim, score);
    this.emitToUI({ type: 'RADAR_UPDATE', scores: this.sessionManager.getRadarScores() });
  }

  private async handleSessionEnd(): Promise<void> {
    const s = this.sessionManager.getCurrentSession();
    if (s && this.config.relationalStorage) {
      await this.config.relationalStorage.saveSession({
        id: s.id, userId: s.userId, startedAt: s.startedAt,
        endedAt: new Date().toISOString(), releasePhase: s.currentPhase,
        methodologyExecutions: s.methodologyExecutionIds,
      });
    }
    this.sessionManager.endSession();
  }

  // === 方法论执行 ===
  async runTPLite(input: MethodologyInput): Promise<MethodologyOutput> {
    const r = this.tpLite.execute(input);
    this.sessionManager.recordMethodologyExecution(r.executionId);
    r.pendingUserConfirmation.forEach(jId => {
      const j = r.judgments.find(x => x.id === jId);
      if (j) this.emitToUI({ type: 'JUDGMENT_PENDING', judgmentId: j.id, statement: j.statement, confidence: j.confidence.level });
    });
    return r;
  }
  async runSFocus(input: MethodologyInput): Promise<MethodologyOutput> {
    const r = this.sFocus.execute(input); this.sessionManager.recordMethodologyExecution(r.executionId); return r;
  }
  async runHaystack(input: MethodologyInput): Promise<MethodologyOutput> {
    const r = this.haystack.execute(input); this.sessionManager.recordMethodologyExecution(r.executionId); return r;
  }

  // === 内部辅助 ===
  private buildSystemPrompt(session: SessionState): string {
    const phaseGuide: Record<ReleasePhase, string> = {
      INTAKE: '当前应专注收集信息，不要急于下结论',
      FRAMING: '当前应构建问题框架，可以提出初步假设',
      DIAGNOSIS: '当前可以给出诊断判断，但必须有依据',
      PRESCRIPTION: '当前可以给出行动建议，必须标注确认等级',
      FOLLOW_UP: '跟踪复盘阶段，关注行动结果与预期偏差',
    };
    return `你是 Eliy，商业诊断教练（不是聊天助手）。\n角色：帮助创业者看清问题、做判断。\n当前阶段: ${session.currentPhase} — ${phaseGuide[session.currentPhase]}\n禁止空洞表达、捏造数据、跳阶段处方。`;
  }

  private async streamLLMResponse(request: LLMRequest): Promise<void> {
    let full = '';
    try {
      for await (const chunk of this.config.llm.stream(request)) {
        full += chunk.content;
        this.emitToUI({ type: 'TEXT_CHUNK', content: chunk.content, done: chunk.done });
        if (chunk.done) {
          this.governance.postCallCheck(request, { content: full, model: this.config.llm.defaultModel, usage: chunk.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latencyMs: 0 });
        }
      }
      if (this.config.tts && full.length < 500) {
        const tts = await this.config.tts.synthesize(full);
        this.emitToUI({ type: 'VOICE_OUTPUT', audio: tts.audio });
      }
      this.sessionManager.addMessage('assistant', full);
    } catch (err) {
      this.emitToUI({ type: 'ERROR', message: `LLM 失败: ${err instanceof Error ? err.message : ''}`, recoverable: true });
    }
  }

  private inferPurpose(phase: ReleasePhase): LLMRequest['governance']['purpose'] {
    const map: Record<ReleasePhase, LLMRequest['governance']['purpose']> = {
      INTAKE: 'COMMUNICATION', FRAMING: 'INTERNAL_REASONING', DIAGNOSIS: 'DIAGNOSIS', PRESCRIPTION: 'ARTIFACT_GENERATION', FOLLOW_UP: 'COMMUNICATION',
    };
    return map[phase];
  }

  private tryAdvancePhase(): void {
    const s = this.sessionManager.getCurrentSession();
    if (!s) return;
    const phases: ReleasePhase[] = ['INTAKE', 'FRAMING', 'DIAGNOSIS', 'PRESCRIPTION', 'FOLLOW_UP'];
    const idx = phases.indexOf(s.currentPhase);
    if (idx < phases.length - 1) {
      this.sessionManager.updatePhase(phases[idx + 1]);
      this.emitToUI({ type: 'PHASE_UPDATE', phase: phases[idx + 1], progress: ((idx + 1) / (phases.length - 1)) * 100 });
    }
  }

  private emitToUI(event: UIOutputEvent): void { this.config.ui.emit(event); }
}
