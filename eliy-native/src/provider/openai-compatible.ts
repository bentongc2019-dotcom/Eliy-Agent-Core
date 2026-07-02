export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ProviderState =
  | { enabled: false; reason: "missing_config" }
  | { enabled: true; config: ProviderConfig };

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

export function readProviderState(env: NodeJS.ProcessEnv = process.env): ProviderState {
  const baseUrl = env.ELIY_PROVIDER_BASE_URL?.trim() ?? "";
  const apiKey = env.ELIY_PROVIDER_API_KEY?.trim() ?? "";
  const model = env.ELIY_PROVIDER_MODEL?.trim() ?? "";

  if (!baseUrl || !apiKey || !model) {
    return { enabled: false, reason: "missing_config" };
  }

  return {
    enabled: true,
    config: {
      baseUrl,
      apiKey,
      model
    }
  };
}

export async function completeChat(input: {
  config: ProviderConfig;
  userInput: string;
  timeoutMs?: number;
}): Promise<string> {
  const endpoint = `${input.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const timeoutMs = input.timeoutMs ?? 10_000;
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.config.apiKey}`
      },
      body: JSON.stringify({
        model: input.config.model,
        messages: [
          {
            role: "user",
            content: input.userInput
          }
        ]
      })
    });
  } catch {
    if (didTimeout) {
      throw new Error("Provider request timed out with redacted details.");
    }
    throw new Error("Provider request failed with redacted details.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Provider request failed with redacted details. HTTP status: ${response.status}.`);
  }

  let payload: ChatCompletionResponse;
  try {
    payload = await response.json() as ChatCompletionResponse;
  } catch {
    throw new Error("Provider response was invalid with redacted details.");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Provider response was invalid with redacted details.");
  }

  return content;
}
