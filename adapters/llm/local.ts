/**
 * 本地模型 LLM 适配器骨架（Ollama / llama.cpp / vLLM）
 */
import type { LLMAdapter, LLMRequest, LLMResponse, LLMStreamChunk } from './types.js';

export class LocalLLMAdapter implements LLMAdapter {
  readonly name = 'Local';
  readonly defaultModel = 'llama3.1:8b';
  readonly supportedModels = ['llama3.1:8b', 'qwen2.5:14b', 'mistral:7b'];

  private endpoint: string;

  constructor(config: { endpoint?: string }) {
    this.endpoint = config.endpoint ?? 'http://localhost:11434';
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // TODO: 实现 Ollama /api/chat 调用
    // 本地模型的优势：数据不出本机，适合处理敏感商业数据
    throw new Error('Local adapter: complete() 待实现');
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    throw new Error('Local adapter: stream() 待实现');
  }

  async healthCheck() {
    // TODO: 调用 Ollama /api/tags 检查
    return { available: false, latencyMs: 0, error: '待实现' };
  }
}
