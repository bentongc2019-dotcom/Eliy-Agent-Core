/**
 * Eliy Agent Core — 实时语音适配器
 *
 * 集成 STT + TTS + Lip Sync，支持全双工实时语音通话。
 * 架构设计：
 * - STT: Deepgram / OpenAI Whisper streaming
 * - TTS: ElevenLabs / OpenAI TTS streaming
 * - Lip Sync: Web Audio API viseme 映射（无需外部服务）
 */

import type { STTAdapter, TTSAdapter, STTResult, TTSResult, STTStreamChunk } from './types.js';

// ============================================================
// Viseme 类型（唇形映射）
// ============================================================

/** 国际音标到唇形的映射 */
export type VisemeId =
  | 'sil'    // 静音/闭嘴
  | 'PP'     // p, b, m
  | 'FF'     // f, v
  | 'TH'     // θ, ð
  | 'DD'     // t, d, n
  | 'kk'     // k, g
  | 'CH'     // tʃ, dʒ, ʃ
  | 'SS'     // s, z
  | 'nn'     // l, r
  | 'RR'     // ɹ
  | 'aa'     // ɑ, a
  | 'E'      // e, ɛ
  | 'I'      // i, ɪ
  | 'O'      // o, ɔ
  | 'U';     // u, ʊ

export interface VisemeEvent {
  visemeId: VisemeId;
  /** 持续时间 (ms) */
  duration: number;
  /** 张嘴幅度 0-1 */
  amplitude: number;
  timestamp: number;
}

// ============================================================
// 实时语音会话配置
// ============================================================

export interface RealtimeVoiceConfig {
  sttProvider: 'deepgram' | 'openai_whisper' | 'web_speech_api';
  ttsProvider: 'elevenlabs' | 'openai_tts' | 'web_speech_api';
  lipSyncMode: 'viseme' | 'external_service';
  /** STT 语言 */
  language: string;
  /** TTS 音色 ID */
  voiceId?: string;
  /** TTS 语速 0.5-2.0 */
  speed?: number;
  /** 是否启用全双工（用户可打断） */
  fullDuplex: boolean;
  /** 静音检测阈值 (ms) */
  silenceThreshold: number;
  /** VAD（语音活动检测）灵敏度 */
  vadSensitivity: 'low' | 'medium' | 'high';
}

// ============================================================
// 实时语音适配器
// ============================================================

export interface RealtimeVoiceAdapter {
  readonly config: RealtimeVoiceConfig;

  /** 开始实时语音会话 */
  startSession(): Promise<void>;

  /** 结束会话 */
  endSession(): Promise<void>;

  /** 输入音频数据（来自麦克风） */
  feedAudio(chunk: Float32Array): void;

  /** 合成语音并输出（返回 viseme 事件流） */
  speak(text: string): AsyncIterable<SpeakChunk>;

  /** 立即停止当前语音输出（用户打断） */
  interrupt(): void;

  /** 监听 STT 结果 */
  onTranscript(handler: (result: TranscriptEvent) => void): void;

  /** 监听 VAD 事件 */
  onVAD(handler: (event: VADEvent) => void): void;
}

export interface SpeakChunk {
  /** PCM 音频数据 */
  audio: Float32Array;
  /** 对应的 viseme 事件 */
  viseme: VisemeEvent;
  /** 是否为最后一个 chunk */
  done: boolean;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface VADEvent {
  type: 'SPEECH_START' | 'SPEECH_END';
  timestamp: number;
}

// ============================================================
// Web Audio Viseme 生成器（纯前端，无需外部服务）
// ============================================================

export class WebAudioVisemeGenerator {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  /** 从 AudioContext 创建分析器 */
  attach(audioContext: AudioContext, sourceNode: AudioNode): void {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.7;
    sourceNode.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /** 获取当前帧的 viseme（每帧调用） */
  getCurrentViseme(): VisemeEvent {
    if (!this.analyser || !this.dataArray) {
      return { visemeId: 'sil', duration: 33, amplitude: 0, timestamp: Date.now() };
    }

    this.analyser.getByteFrequencyData(this.dataArray as any);

    // 计算频段能量
    const low = this.bandEnergy(0, 4);      // 低频 (嘴唇振动)
    const mid = this.bandEnergy(4, 16);     // 中频 (元音)
    const high = this.bandEnergy(16, 48);   // 高频 (辅音)
    const total = (low + mid + high) / 3;

    // 基于频率分布映射到 viseme
    let visemeId: VisemeId = 'sil';
    if (total < 10) {
      visemeId = 'sil';
    } else if (high > mid && high > low) {
      visemeId = total > 100 ? 'SS' : 'FF';
    } else if (mid > low) {
      visemeId = mid > 150 ? 'aa' : mid > 100 ? 'E' : 'O';
    } else {
      visemeId = low > 150 ? 'PP' : 'DD';
    }

    return {
      visemeId,
      duration: 33, // ~30fps
      amplitude: Math.min(1, total / 200),
      timestamp: Date.now(),
    };
  }

  private bandEnergy(start: number, end: number): number {
    if (!this.dataArray) return 0;
    let sum = 0;
    for (let i = start; i < Math.min(end, this.dataArray.length); i++) {
      sum += this.dataArray[i];
    }
    return sum / (end - start);
  }
}

// ============================================================
// 默认实现（Web Speech API + Web Audio viseme）
// ============================================================

export class DefaultRealtimeVoice implements RealtimeVoiceAdapter {
  readonly config: RealtimeVoiceConfig;
  private transcriptHandlers: Array<(e: TranscriptEvent) => void> = [];
  private vadHandlers: Array<(e: VADEvent) => void> = [];
  private isSpeaking = false;
  private visemeGenerator = new WebAudioVisemeGenerator();

  constructor(config?: Partial<RealtimeVoiceConfig>) {
    this.config = {
      sttProvider: 'web_speech_api',
      ttsProvider: 'web_speech_api',
      lipSyncMode: 'viseme',
      language: 'zh-CN',
      speed: 1.0,
      fullDuplex: true,
      silenceThreshold: 1500,
      vadSensitivity: 'medium',
      ...config,
    };
  }

  async startSession(): Promise<void> {
    console.log('[RealtimeVoice] 会话已启动');
  }

  async endSession(): Promise<void> {
    this.interrupt();
    console.log('[RealtimeVoice] 会话已结束');
  }

  feedAudio(_chunk: Float32Array): void {
    // Web Speech API 模式下由浏览器内部处理
    // Deepgram/OpenAI 模式下通过 WebSocket 发送
  }

  async *speak(text: string): AsyncIterable<SpeakChunk> {
    this.isSpeaking = true;
    // 简化实现：使用 Web Speech API 合成，同时生成 viseme
    // 真实实现会使用 ElevenLabs streaming API
    const words = text.split('');
    for (let i = 0; i < words.length; i++) {
      if (!this.isSpeaking) break; // 被打断
      const amplitude = /[aeiouāáǎàēéěèīíǐìōóǒòūúǔù]/.test(words[i]) ? 0.7 : 0.4;
      yield {
        audio: new Float32Array(0), // 占位，实际由 TTS API 提供
        viseme: {
          visemeId: this.charToViseme(words[i]),
          duration: 80,
          amplitude,
          timestamp: Date.now(),
        },
        done: i === words.length - 1,
      };
      await new Promise(r => setTimeout(r, 80));
    }
    this.isSpeaking = false;
  }

  interrupt(): void {
    this.isSpeaking = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  onTranscript(handler: (e: TranscriptEvent) => void): void {
    this.transcriptHandlers.push(handler);
  }

  onVAD(handler: (e: VADEvent) => void): void {
    this.vadHandlers.push(handler);
  }

  private charToViseme(char: string): VisemeId {
    if (/[aāáǎà]/.test(char)) return 'aa';
    if (/[eēéěè]/.test(char)) return 'E';
    if (/[iīíǐì]/.test(char)) return 'I';
    if (/[oōóǒò]/.test(char)) return 'O';
    if (/[uūúǔù]/.test(char)) return 'U';
    if (/[bpmf]/.test(char)) return 'PP';
    if (/[sz]/.test(char)) return 'SS';
    if (/[tdnl]/.test(char)) return 'DD';
    if (/[kg]/.test(char)) return 'kk';
    return 'sil';
  }
}
