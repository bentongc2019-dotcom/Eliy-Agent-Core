import { createHash } from "node:crypto";

import type {
  LlmCapabilityAdapter,
  LlmCapabilityAdapterInput,
  LlmCapabilityAdapterResult,
} from "../capabilities/llm-capability-adapter-contract";
import { createEliyRuntimeSystemMessage } from "../../provider/identity-boundary";

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
    thinking?: {
      type: "disabled";
    };
  };
}

export const DEEPSEEK_CAPABILITY_FINISH_REASONS = [
  "stop",
  "length",
  "content_filter",
  "tool_calls",
  "insufficient_system_resource",
] as const;

export type DeepSeekCapabilityFinishReason =
  (typeof DEEPSEEK_CAPABILITY_FINISH_REASONS)[number];

export interface DeepSeekCapabilityProviderUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
}

export interface DeepSeekCapabilityLlmTransportResponseSuccess {
  ok: true;
  text: string | null;
  finishReason: DeepSeekCapabilityFinishReason;
  reasoningContentPresent: boolean;
  reasoningContentLength?: number;
  usage?: DeepSeekCapabilityProviderUsage;
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
  thinkingMode?: "disabled";
}

const HANDLER = "deepseek-capability-llm-adapter";
const SYSTEM_MESSAGE = "DeepSeek capability adapter invocation.";

function fingerprint(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex")}`;
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedFinishReason(
  value: unknown,
): value is DeepSeekCapabilityFinishReason {
  return DEEPSEEK_CAPABILITY_FINISH_REASONS.some((reason) => reason === value);
}

function readOptionalTokenCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function readProviderUsage(
  value: unknown,
): DeepSeekCapabilityProviderUsage | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const usage = value as Record<string, unknown>;
  const parsed: DeepSeekCapabilityProviderUsage = {
    promptTokens: readOptionalTokenCount(usage.prompt_tokens),
    completionTokens: readOptionalTokenCount(usage.completion_tokens),
    totalTokens: readOptionalTokenCount(usage.total_tokens),
    promptCacheHitTokens: readOptionalTokenCount(usage.prompt_cache_hit_tokens),
    promptCacheMissTokens: readOptionalTokenCount(usage.prompt_cache_miss_tokens),
  };

  return Object.values(parsed).some((tokenCount) => tokenCount !== undefined)
    ? parsed
    : undefined;
}

export function parseDeepSeekCapabilityLlmTransportResponse(
  responseBody: string,
): DeepSeekCapabilityLlmTransportResponseSuccess {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseBody);
  } catch {
    throw new Error("provider_response_invalid");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("provider_response_invalid");
  }

  const response = parsed as Record<string, unknown>;
  const choices = response.choices;
  const choice = Array.isArray(choices) ? choices[0] : undefined;

  if (!choice || typeof choice !== "object") {
    throw new Error("provider_response_invalid");
  }

  const finishReason = (choice as Record<string, unknown>).finish_reason;

  if (!isAllowedFinishReason(finishReason)) {
    throw new Error("provider_finish_reason_invalid");
  }

  const message = (choice as Record<string, unknown>).message;

  if (!message || typeof message !== "object") {
    throw new Error("provider_response_invalid");
  }

  const messageRecord = message as Record<string, unknown>;
  const content = messageRecord.content;

  if (content !== null && typeof content !== "string") {
    throw new Error("provider_response_invalid");
  }

  const reasoningContent = messageRecord.reasoning_content;
  const reasoningContentLength =
    typeof reasoningContent === "string" && reasoningContent.length > 0
      ? reasoningContent.length
      : undefined;
  const usage = readProviderUsage(response.usage);

  return {
    ok: true,
    text: content,
    finishReason,
    reasoningContentPresent: reasoningContentLength !== undefined,
    ...(reasoningContentLength === undefined ? {} : { reasoningContentLength }),
    ...(usage === undefined ? {} : { usage }),
  };
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
  if (input.executionContext) {
    return JSON.stringify({ payload: input.payload }, null, 2);
  }

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

interface AssembledSystemMessage {
  content: string;
  stableContextInjected: boolean;
  assetInstructionsInjected: boolean;
  hlamtInjectionVerified: boolean;
  outputBoundaryInjected: boolean;
}

type SystemMessageSectionKind =
  | "base"
  | "stable_context"
  | "asset_instructions"
  | "hlamt_context"
  | "output_boundary";

interface SystemMessageSection {
  kind: SystemMessageSectionKind;
  content: string;
}

function createSystemMessage(
  input: Readonly<LlmCapabilityAdapterInput>,
): AssembledSystemMessage {
  const context = input.executionContext;

  if (!context) {
    return {
      content: SYSTEM_MESSAGE,
      stableContextInjected: false,
      assetInstructionsInjected: false,
      hlamtInjectionVerified: false,
      outputBoundaryInjected: false,
    };
  }

  const sections: SystemMessageSection[] = [
    {
      kind: "stable_context",
      content: createEliyRuntimeSystemMessage(context.stableContext),
    },
    { kind: "base", content: SYSTEM_MESSAGE },
    {
      kind: "asset_instructions",
      content: `[CAPABILITY INSTRUCTIONS]\n${context.asset.instructions}\n[/CAPABILITY INSTRUCTIONS]`,
    },
  ];

  if (context.hlamt.injectionRequested) {
    sections.push(
      {
        kind: "hlamt_context",
        content: `[HLAMT CONTEXT]\n${context.hlamt.summary}\n[/HLAMT CONTEXT]`,
      },
    );
  }

  sections.push(
    {
      kind: "output_boundary",
      content: `[OUTPUT BOUNDARY]\n${JSON.stringify(context.outputBoundary)}\n[/OUTPUT BOUNDARY]`,
    },
  );

  return {
    content: sections.map((section) => section.content).join("\n\n"),
    stableContextInjected: sections.some(
      (section) => section.kind === "stable_context",
    ),
    assetInstructionsInjected: sections.some(
      (section) => section.kind === "asset_instructions",
    ),
    hlamtInjectionVerified: sections.some(
      (section) => section.kind === "hlamt_context",
    ),
    outputBoundaryInjected: sections.some(
      (section) => section.kind === "output_boundary",
    ),
  };
}

function createTransportRequest(
  config: DeepSeekCapabilityLlmAdapterConfig,
  input: Readonly<LlmCapabilityAdapterInput>,
): {
  request: DeepSeekCapabilityLlmTransportRequest;
  systemMessage: AssembledSystemMessage;
} {
  const systemMessage = createSystemMessage(input);

  return {
    systemMessage,
    request: {
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
            content: systemMessage.content,
          },
          {
            role: "user",
            content: createUserMessage(input),
          },
        ],
        ...(config.thinkingMode === "disabled"
          ? { thinking: { type: "disabled" as const } }
          : {}),
      },
    },
  };
}

function createAdapterResult(
  input: Readonly<LlmCapabilityAdapterInput>,
  response: DeepSeekCapabilityLlmTransportResponseSuccess,
  request: DeepSeekCapabilityLlmTransportRequest,
  systemMessage: AssembledSystemMessage,
): LlmCapabilityAdapterResult {
  if (!isAllowedFinishReason(response.finishReason)) {
    throw new Error("provider_finish_reason_invalid");
  }

  const resultText = response.text;

  if (response.finishReason === "length") {
    throw new Error("provider_output_truncated");
  }

  if (response.finishReason === "content_filter") {
    throw new Error("provider_output_filtered");
  }

  if (response.finishReason === "insufficient_system_resource") {
    throw new Error("provider_output_resource_interrupted");
  }

  if (typeof resultText !== "string" || resultText.trim() === "") {
    throw new Error("provider_output_empty");
  }

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
    ...(input.executionContext
      ? {
          invocationEvidence: {
            stableContextInjected: systemMessage.stableContextInjected,
            assetInstructionsInjected: systemMessage.assetInstructionsInjected,
            hlamtInjectionVerified: systemMessage.hlamtInjectionVerified,
            outputBoundaryInjected: systemMessage.outputBoundaryInjected,
            requestFingerprint: fingerprint(request.body),
            thinkingMode:
              request.body.thinking?.type === "disabled"
                ? "disabled"
                : "provider_default",
            finishReason: response.finishReason,
            contentPresent: true,
            contentLength: resultText.length,
            reasoningContentPresent: response.reasoningContentPresent,
            ...(response.reasoningContentLength === undefined
              ? {}
              : { reasoningContentLength: response.reasoningContentLength }),
            ...(response.usage === undefined
              ? {}
              : { providerUsage: { ...response.usage } }),
          },
        }
      : {}),
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

    const { request, systemMessage } = createTransportRequest(config, input);
    const response = await config.transport(request);

    if (!response || response.ok !== true) {
      throw new Error(
        readTransportFailureMessage(
          response && response.ok === false ? response : undefined,
        ),
      );
    }

    return createAdapterResult(input, response, request, systemMessage);
  };
}
