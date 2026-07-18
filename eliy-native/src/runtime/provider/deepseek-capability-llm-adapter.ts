import { createHash } from "node:crypto";

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

function fingerprint(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex")}`;
}

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
  assetInstructionsInjected: boolean;
  hlamtInjectionVerified: boolean;
  outputBoundaryInjected: boolean;
}

type SystemMessageSectionKind =
  | "base"
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
      assetInstructionsInjected: false,
      hlamtInjectionVerified: false,
      outputBoundaryInjected: false,
    };
  }

  const sections: SystemMessageSection[] = [
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
    },
    },
  };
}

function createAdapterResult(
  input: Readonly<LlmCapabilityAdapterInput>,
  resultText: string,
  request: DeepSeekCapabilityLlmTransportRequest,
  systemMessage: AssembledSystemMessage,
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
    ...(input.executionContext
      ? {
          invocationEvidence: {
            assetInstructionsInjected: systemMessage.assetInstructionsInjected,
            hlamtInjectionVerified: systemMessage.hlamtInjectionVerified,
            outputBoundaryInjected: systemMessage.outputBoundaryInjected,
            requestFingerprint: fingerprint(request.body),
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

    return createAdapterResult(input, response.text, request, systemMessage);
  };
}
