/**
 * Anthropic LLM 适配器骨架
 */
import type { LLMAdapter, LLMRequest, LLMResponse, LLMStreamChunk } from './types.js';

export class AnthropicAdapter implements LLMAdapter {
  readonly name = 'Anthropic';
  readonly defaultModel = 'claude-sonnet-4-20250514';
  readonly supportedModels = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-haiku-20241022'];

  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // TODO: 实现 Anthropic Messages API
    // 注意：Anthropic 的 system prompt 放在 request 顶层，不在 messages 里
    throw new Error('Anthropic adapter: complete() 待实现 — 需要 npm install @anthropic-ai/sdk');
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    throw new Error('Anthropic adapter: stream() 待实现');
  }

  async healthCheck() {
    return { available: false, latencyMs: 0, error: '待实现' };
  }
}
