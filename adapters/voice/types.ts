/**
 * Eliy Agent Core — 语音适配器抽象接口
 */

/** STT（语音转文字）接口 */
export interface STTAdapter {
  readonly name: string;
  /** 将音频流转为文字 */
  transcribe(audio: ArrayBuffer, options?: { language?: string; format?: string }): Promise<STTResult>;
  /** 实时 streaming 转写 */
  streamTranscribe?(audioStream: AsyncIterable<ArrayBuffer>): AsyncIterable<STTStreamChunk>;
}

export interface STTResult {
  text: string;
  language: string;
  confidence: number;
  durationMs: number;
}

export interface STTStreamChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
}

/** TTS（文字转语音）接口 */
export interface TTSAdapter {
  readonly name: string;
  /** 将文字转为音频 */
  synthesize(text: string, options?: { voice?: string; speed?: number }): Promise<TTSResult>;
  /** 实时 streaming 合成 */
  streamSynthesize?(text: string): AsyncIterable<ArrayBuffer>;
}

export interface TTSResult {
  audio: ArrayBuffer;
  format: string;
  durationMs: number;
}

// 骨架实现
export class DefaultSTT implements STTAdapter {
  readonly name = 'DefaultSTT';
  async transcribe(_audio: ArrayBuffer): Promise<STTResult> {
    throw new Error('STT adapter: 待实现 — 需要 Whisper / Google Speech API');
  }
}

export class DefaultTTS implements TTSAdapter {
  readonly name = 'DefaultTTS';
  async synthesize(_text: string): Promise<TTSResult> {
    throw new Error('TTS adapter: 待实现 — 需要 ElevenLabs / Google TTS API');
  }
}
