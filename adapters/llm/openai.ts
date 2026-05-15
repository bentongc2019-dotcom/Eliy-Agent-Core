/**
 * OpenAI LLM 适配器骨架
 * 具体 API 调用待 npm 网络可用后实现
 */
import type { LLMAdapter, LLMRequest, LLMResponse, LLMStreamChunk } from './types.js';

export class OpenAIAdapter implements LLMAdapter {
  readonly name = 'OpenAI';
  readonly defaultModel = 'gpt-4o';
  readonly supportedModels = ['gpt-4o', 'gpt-4o-mini', 'o3-mini'];

  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    // 宪法安全：API Key 必须从环境变量传入，不可硬编码
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // TODO: 实现 OpenAI Chat Completions API 调用
    // 要点：
    // 1. 将 LLMRequest 转换为 OpenAI 格式
    // 2. 发送请求前执行 governance.preCallCheck
    // 3. 接收响应后执行 governance.postCallCheck
    throw new Error('OpenAI adapter: complete() 待实现 — 需要 npm install openai');
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    // TODO: 实现 OpenAI streaming
    throw new Error('OpenAI adapter: stream() 待实现');
  }

  async healthCheck() {
    // TODO: 调用 /v1/models 检查连通性
    return { available: false, latencyMs: 0, error: '待实现' };
  }
}
