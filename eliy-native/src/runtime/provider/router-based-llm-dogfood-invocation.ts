import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import type {
  DeepSeekCapabilityLlmTransport,
  DeepSeekCapabilityLlmTransportRequest,
  DeepSeekCapabilityLlmTransportResponse,
} from "./deepseek-capability-llm-adapter";
import type { LlmCapabilityAdapterInput } from "../capabilities/llm-capability-adapter-contract";
import type { CapabilityManifest } from "../capabilities/capability-contract";
import { invokeCapabilityWithRealLlmBoundary } from "../capabilities/capability-invocation-real-llm-boundary";
import { assembleCapabilityExecutionContext } from "../capabilities/capability-execution-context-implementation";
import type { RealCapabilityInvocationTraceRecord } from "../capabilities/capability-invocation-trace-record";
import { createMinimalCapabilityLoader } from "../capabilities/capability-loader-minimal-implementation";
import { evidenceExtractCapabilityManifests } from "../../../skills/evidence-extract/evidence-extract-capability-manifest";
import {
  createDeepSeekCapabilityLlmAdapter,
  parseDeepSeekCapabilityLlmTransportResponse,
} from "./deepseek-capability-llm-adapter";
import { createLlmProviderRouter } from "./llm-provider-router";

export interface RouterBasedLlmDogfoodInvocationInput {
  projectRoot: string;
  providerId: string;
  model: string;
  endpoint: string;
  apiKey: string;
  capabilityId: string;
  invocationId: string;
  createdAt: string;
  condition: "baseline" | "candidate";
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
  condition: "baseline" | "candidate";
  output: {
    kind: "candidate";
    text: string;
    requiresConfirmation: true;
    canonicalMutationAllowed: false;
  };
  traceRecord: RealCapabilityInvocationTraceRecord;
}

const COMMAND = "router-based-llm-dogfood" as const;

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

            resolve(parseDeepSeekCapabilityLlmTransportResponse(responseText));
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
  const registry = createMinimalCapabilityLoader(
    evidenceExtractCapabilityManifests,
  ).loadRegistry();
  let manifest: CapabilityManifest;

  try {
    manifest = registry.resolve(input.capabilityId);
  } catch {
    throw new Error(`Capability not available for dogfood: ${input.capabilityId}`);
  }

  const transport = input.transport ?? createDefaultTransport();
  const deepseekAdapter = createDeepSeekCapabilityLlmAdapter({
    apiKey: input.apiKey,
    model: input.model,
    endpoint: input.endpoint,
    enableRealLlm: true,
    transport,
    thinkingMode: "disabled",
  });
  const router = createLlmProviderRouter({
    adapterMap: {
      deepseek: deepseekAdapter,
    },
  });

  const context = assembleCapabilityExecutionContext({
    projectRoot: input.projectRoot,
    manifest,
    payload: input.payload,
    invocationId: input.invocationId,
    createdAt: input.createdAt,
    actor: "agent",
    hlamtInjectionRequested: input.condition === "candidate",
  });
  const routedAdapter = async (
    adapterInput: Readonly<LlmCapabilityAdapterInput>,
  ) => router({
    providerId: input.providerId,
    model: input.model,
    ...adapterInput,
  });
  const boundaryResult = await invokeCapabilityWithRealLlmBoundary({
    invocationId: input.invocationId,
    capabilityId: input.capabilityId,
    payload: input.payload,
    createdAt: input.createdAt,
    mode: "real",
    enableRealLlm: true,
    llmAdapter: routedAdapter,
    executionContext: context,
  });

  if (boundaryResult.mode !== "real" || !boundaryResult.traceRecord) {
    throw new Error("Router-based LLM dogfood requires a real invocation trace");
  }

  return {
    ok: true,
    command: COMMAND,
    provider_id: input.providerId,
    capability_id: input.capabilityId,
    model: input.model,
    status: "real_completed",
    trace_id: boundaryResult.traceRecord.invocationId,
    condition: input.condition,
    output: {
      kind: "candidate",
      text: boundaryResult.resultText,
      requiresConfirmation: true,
      canonicalMutationAllowed: false,
    },
    traceRecord: boundaryResult.traceRecord,
  };
}
