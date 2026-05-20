/**
 * Base LLM Adapter (OpenAI 兼容基础类)
 * 支持标准的 OpenAI API 格式以及 SSE 流式解析
 */
import type { LLMAdapter, LLMRequest, LLMResponse, LLMStreamChunk } from './types.js';

export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract readonly name: string;
  abstract readonly defaultModel: string;
  abstract readonly supportedModels: string[];

  protected apiKey: string;
  protected baseUrl: string;

  constructor(config: { apiKey: string; baseUrl: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  /**
   * 构建 OpenAI 兼容的消息 Payload
   */
  protected buildPayload(request: LLMRequest, model: string) {
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

  /**
   * 通用的 OpenAI 兼容 complete 实现
   */
  async complete(request: LLMRequest, model?: string): Promise<LLMResponse> {
    const start = Date.now();
    const activeModel = model ?? this.defaultModel;
    const payload = this.buildPayload(request, activeModel);

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
      throw new Error(`${this.name} API 错误: ${res.status} - ${errText}`);
    }

    const data = await res.json() as any;
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || activeModel,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: data.choices[0]?.finish_reason || 'stop',
      latencyMs: Date.now() - start,
    };
  }

  /**
   * 通用的 OpenAI 兼容 SSE 流式 stream 实现
   */
  async *stream(request: LLMRequest, model?: string): AsyncIterable<LLMStreamChunk> {
    const activeModel = model ?? this.defaultModel;
    const payload = this.buildPayload(request, activeModel);
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
      throw new Error(`${this.name} API 错误: ${res.status} - ${errText}`);
    }

    if (!res.body) {
      throw new Error(`${this.name} API 错误: 未返回流式响应体`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
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
              console.warn(`[${this.name}] SSE 流式解析错误:`, e, dataStr);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    yield { content: '', done: true };
  }

  /**
   * 通用的模型健康检查
   */
  async healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
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
