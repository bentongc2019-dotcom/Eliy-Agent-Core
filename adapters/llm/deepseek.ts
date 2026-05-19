/**
 * DeepSeek LLM 适配器
 * 支持 deepseek-chat (V4) 和 deepseek-reasoner (R1)
 */
import type { LLMAdapter, LLMRequest, LLMResponse, LLMStreamChunk } from './types.js';

export class DeepSeekAdapter implements LLMAdapter {
  readonly name = 'DeepSeek';
  readonly defaultModel = 'deepseek-chat';
  readonly supportedModels = ['deepseek-chat', 'deepseek-reasoner'];

  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    // 默认使用官方 API 地址
    this.baseUrl = config.baseUrl ?? 'https://api.deepseek.com';
  }

  private buildPayload(request: LLMRequest, model: string) {
    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: request.stream ?? false,
    };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    // 优先从环境变量或外部配置获取当前选定的模型，这里暂时默认 deepseek-chat
    // 实际的 active 模型应由 runtime 根据 currentModel 决定，但适配器层暂取 defaultModel
    // 为了支持模型切换，可以通过 config 传入 activeModel 或者在此处扩展。
    // 在这个实现中，我们可以从 request 的某些上下文或者默认使用 deepseek-chat。
    // 由于 LLMRequest 目前没有 model 字段，我们使用 this.defaultModel
    const payload = this.buildPayload(request, this.defaultModel);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json() as any;
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || this.defaultModel,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: data.choices[0]?.finish_reason || 'stop',
      latencyMs: Date.now() - start,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const payload = this.buildPayload(request, this.defaultModel);
    payload.stream = true;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API Error: ${res.status} - ${errText}`);
    }

    if (!res.body) {
      throw new Error('DeepSeek API Error: No response body for streaming');
    }

    // 简单的 SSE 解析器
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // 保留最后一行（可能未接收完整）
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6);
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || '';
              const isDone = data.choices?.[0]?.finish_reason != null;
              
              yield {
                content,
                done: isDone,
                usage: isDone && data.usage ? {
                  promptTokens: data.usage.prompt_tokens,
                  completionTokens: data.usage.completion_tokens,
                  totalTokens: data.usage.total_tokens,
                } : undefined
              };
            } catch (e) {
              console.warn('[DeepSeek] SSE parsing error:', e, dataStr);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    yield { content: '', done: true };
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      if (res.ok) {
        return { available: true, latencyMs: Date.now() - start };
      } else {
        return { available: false, latencyMs: Date.now() - start, error: await res.text() };
      }
    } catch (err) {
      return { available: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
