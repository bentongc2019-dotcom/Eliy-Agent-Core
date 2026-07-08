import type {
  LlmCapabilityAdapter,
  LlmCapabilityAdapterInput,
  LlmCapabilityAdapterResult,
} from "../capabilities/llm-capability-adapter-contract";

export interface DeepSeekCapabilityLlmTransportRequest {
  endpoint: string;
  headers: {
    authorization: string;
    contentType: string;
  };
  body: {
    model: string;
    messages: Array<{
      role: "system" | "user";
      content: string;
    }>;
  };
}

export interface DeepSeekCapabilityLlmTransportResponseSuccess {
  ok: true;
  text: string;
}

export interface DeepSeekCapabilityLlmTransportResponseFailure {
  ok: false;
  error: string;
}

export type DeepSeekCapabilityLlmTransportResponse =
  | DeepSeekCapabilityLlmTransportResponseSuccess
  | DeepSeekCapabilityLlmTransportResponseFailure;

export type DeepSeekCapabilityLlmTransport = (
  request: Readonly<DeepSeekCapabilityLlmTransportRequest>,
) =>
  | DeepSeekCapabilityLlmTransportResponse
  | Promise<DeepSeekCapabilityLlmTransportResponse>;

export interface DeepSeekCapabilityLlmAdapterConfig {
  apiKey: string;
  model: string;
  endpoint: string;
  enableRealLlm: boolean;
  transport: DeepSeekCapabilityLlmTransport;
}

const HANDLER = "deepseek-capability-llm-adapter";
const SYSTEM_MESSAGE = "DeepSeek capability adapter invocation.";

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function ensureEnabled(config: DeepSeekCapabilityLlmAdapterConfig): void {
  if (config.enableRealLlm !== true) {
    throw new Error("DeepSeek real LLM adapter requires enableRealLlm: true");
  }

  if (trimText(config.apiKey) === "") {
    throw new Error("DeepSeek real LLM adapter requires apiKey");
  }

  if (trimText(config.model) === "") {
    throw new Error("DeepSeek real LLM adapter requires model");
  }

  if (trimText(config.endpoint) === "") {
    throw new Error("DeepSeek real LLM adapter requires endpoint");
  }

  if (typeof config.transport !== "function") {
    throw new Error("DeepSeek real LLM adapter requires transport");
  }
}

function createUserMessage(input: Readonly<LlmCapabilityAdapterInput>): string {
  return JSON.stringify(
    {
      capability: {
        capabilityId: input.capabilityId,
        capabilityName: input.capabilityName,
        capabilityVersion: input.capabilityVersion,
        capabilityKind: input.capabilityKind,
      },
      payload: input.payload,
    },
    null,
    2,
  );
}

function createTransportRequest(
  config: DeepSeekCapabilityLlmAdapterConfig,
  input: Readonly<LlmCapabilityAdapterInput>,
): DeepSeekCapabilityLlmTransportRequest {
  return {
    endpoint: config.endpoint,
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      contentType: "application/json",
    },
    body: {
      model: config.model,
      messages: [
        {
          role: "system",
          content: SYSTEM_MESSAGE,
        },
        {
          role: "user",
          content: createUserMessage(input),
        },
      ],
    },
  };
}

function createAdapterResult(
  input: Readonly<LlmCapabilityAdapterInput>,
  resultText: string,
): LlmCapabilityAdapterResult {
  return {
    ok: true,
    mode: "real",
    capabilityId: input.capabilityId,
    handler: HANDLER,
    resultText,
    metadata: {
      capabilityId: input.capabilityId,
      capabilityName: input.capabilityName,
      capabilityVersion: input.capabilityVersion,
      capabilityKind: input.capabilityKind,
    },
  };
}

function readTransportFailureMessage(
  response: DeepSeekCapabilityLlmTransportResponseFailure | undefined,
): string {
  if (response && trimText(response.error) !== "") {
    return response.error;
  }

  return "DeepSeek real LLM transport failed";
}

export function createDeepSeekCapabilityLlmAdapter(
  config: DeepSeekCapabilityLlmAdapterConfig,
): LlmCapabilityAdapter {
  return async (input) => {
    ensureEnabled(config);

    const response = await config.transport(createTransportRequest(config, input));

    if (!response || response.ok !== true) {
      throw new Error(
        readTransportFailureMessage(
          response && response.ok === false ? response : undefined,
        ),
      );
    }

    return createAdapterResult(input, response.text);
  };
}
