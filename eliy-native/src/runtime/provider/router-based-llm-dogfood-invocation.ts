import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import type {
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
  DeepSeekCapabilityLlmTransportResponse,
} from "./deepseek-capability-llm-adapter";
import type { LlmCapabilityAdapterInput } from "../capabilities/llm-capability-adapter-contract";
import { createDeepSeekCapabilityLlmAdapter } from "./deepseek-capability-llm-adapter";
import { createLlmProviderRouter } from "./llm-provider-router";

export interface RouterBasedLlmDogfoodInvocationInput {
  providerId: string;
  model: string;
  endpoint: string;
  apiKey: string;
  capabilityId: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityKind: LlmCapabilityAdapterInput["capabilityKind"];
  payload: Record<string, unknown>;
  transport?: DeepSeekCapabilityLlmTransport;
}

export interface RouterBasedLlmDogfoodInvocationResult {
  ok: true;
  command: "router-based-llm-dogfood";
  provider_id: string;
  capability_id: string;
  model: string;
  status: "real_completed";
  trace_id: string;
}

const SYSTEM_MESSAGE = "DeepSeek capability adapter invocation.";
const COMMAND = "router-based-llm-dogfood" as const;

function buildTraceId(input: RouterBasedLlmDogfoodInvocationInput): string {
  return `${COMMAND}:${input.providerId}:${input.capabilityId}:${input.model}`;
}

function createJsonTransportResponse(text: string): DeepSeekCapabilityLlmTransportResponse {
  return {
    ok: true,
    text,
  };
}

function readResponseText(responseBody: string): string {
  if (responseBody.trim() === "") {
    throw new Error("Router-based LLM dogfood transport failed with empty response");
  }

  try {
    const parsed = JSON.parse(responseBody) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
      output_text?: unknown;
      text?: unknown;
    };

    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }

    if (typeof parsed.output_text === "string") {
      return parsed.output_text;
    }

    if (typeof parsed.text === "string") {
      return parsed.text;
    }
  } catch {
    return responseBody;
  }

  return responseBody;
}

function createDefaultTransport(): DeepSeekCapabilityLlmTransport {
  return async (request: DeepSeekCapabilityLlmTransportRequest) => {
    const url = new URL(request.endpoint);
    const requestBody = JSON.stringify(request.body);
    const transport = url.protocol === "http:" ? httpRequest : httpsRequest;

    return await new Promise<DeepSeekCapabilityLlmTransportResponse>((resolve, reject) => {
      const req = transport(
        url,
        {
          method: "POST",
          headers: {
            authorization: request.headers.authorization,
            "content-type": request.headers.contentType,
            "content-length": Buffer.byteLength(requestBody),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });
          res.on("end", () => {
            const responseText = Buffer.concat(chunks).toString("utf8");

            if (typeof res.statusCode !== "number" || res.statusCode < 200 || res.statusCode >= 300) {
              reject(
                new Error(
                  `Router-based LLM dogfood transport failed with HTTP status: ${res.statusCode ?? "unknown"}`,
                ),
              );
              return;
            }

            resolve(createJsonTransportResponse(readResponseText(responseText)));
          });
        },
      );

      req.on("error", () => {
        reject(new Error("Router-based LLM dogfood transport failed"));
      });

      req.write(requestBody);
      req.end();
    });
  };
}

export async function runRouterBasedLlmDogfoodInvocation(
  input: Readonly<RouterBasedLlmDogfoodInvocationInput>,
): Promise<RouterBasedLlmDogfoodInvocationResult> {
  const transport = input.transport ?? createDefaultTransport();
  const deepseekAdapter = createDeepSeekCapabilityLlmAdapter({
    apiKey: input.apiKey,
    model: input.model,
    endpoint: input.endpoint,
    enableRealLlm: true,
    transport,
  });
  const router = createLlmProviderRouter({
    adapterMap: {
      deepseek: deepseekAdapter,
    },
  });

  await router({
    providerId: input.providerId,
    model: input.model,
    capabilityId: input.capabilityId,
    capabilityName: input.capabilityName,
    capabilityVersion: input.capabilityVersion,
    capabilityKind: input.capabilityKind,
    payload: input.payload,
  });

  return {
    ok: true,
    command: COMMAND,
    provider_id: input.providerId,
    capability_id: input.capabilityId,
    model: input.model,
    status: "real_completed",
    trace_id: buildTraceId(input),
  };
}

export const ROUTER_BASED_LLM_DOGFOOD_SYSTEM_MESSAGE = SYSTEM_MESSAGE;
