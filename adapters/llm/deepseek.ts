/**
 * DeepSeek LLM 适配器
 * 支持 deepseek-chat (V4) 和 deepseek-reasoner (R1)
 * 继承自 OpenAI 兼容模式的 BaseLLMAdapter
 */
import { BaseLLMAdapter } from './base.js';
import type { LLMRequest, LLMResponse, LLMStreamChunk } from './types.js';

export class DeepSeekAdapter extends BaseLLMAdapter {
  readonly name = 'DeepSeek';
  readonly defaultModel = 'deepseek-v4-flash';
  readonly supportedModels = ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash'];

  private activeModel: string = 'deepseek-v4-flash';

  constructor(config?: { apiKey?: string; baseUrl?: string; activeModel?: string }) {
    let apiKey = config?.apiKey;

    // 1. 尝试从 Vite 环境变量读取 (符合 VITE_DEEPSEEK_API_KEY 要求)
    if (!apiKey) {
      try {
        const meta = import.meta as any;
        if (typeof import.meta !== 'undefined' && meta && meta.env && meta.env.VITE_DEEPSEEK_API_KEY) {
          apiKey = meta.env.VITE_DEEPSEEK_API_KEY;
        }
      } catch (e) {
        // 忽略在 Node 下对 import.meta.env 的编译或运行报错
      }
    }

    // 2. 尝试从 Node.js 环境变量读取作为 Fallback
    if (!apiKey) {
      try {
        if (typeof process !== 'undefined' && process.env && process.env.DEEPSEEK_API_KEY) {
          apiKey = process.env.DEEPSEEK_API_KEY;
        }
      } catch (e) {
        // 忽略
      }
    }

    // 3. 兜底使用用户指定的安全占位符
    apiKey = apiKey || 'sk-your-deepseek-api-key-here';

    const baseUrl = config?.baseUrl ?? 'https://api.deepseek.com';

    super({ apiKey, baseUrl });

    if (config?.activeModel && this.supportedModels.includes(config.activeModel)) {
      this.activeModel = config.activeModel;
    }
  }

  /**
   * 动态切换选中的模型（支持 deepseek-chat 与 deepseek-reasoner）
   */
  public selectModel(modelName: string): boolean {
    if (this.supportedModels.includes(modelName)) {
      this.activeModel = modelName;
      return true;
    }
    return false;
  }

  /**
   * 获取当前激活的模型名
   */
  public getActiveModel(): string {
    return this.activeModel;
  }

  /**
   * 执行完整的 Non-streaming 请求
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    return super.complete(request, this.activeModel);
  }

  /**
   * 执行 SSE 流式 Streaming 请求
   */
  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    yield* super.stream(request, this.activeModel);
  }
}
