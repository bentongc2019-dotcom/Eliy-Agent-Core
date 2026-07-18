import { createEliyRuntimeSystemMessage } from "../../provider/identity-boundary";
import { evidenceExtractSkillIndexEntry } from "../../../skills/evidence-extract/evidence-extract-capability-manifest";
import type { RealCapabilityInvocationTraceRecord } from "../capabilities/capability-invocation-trace-record";
import type { DeepSeekCapabilityLlmTransport } from "../provider/deepseek-capability-llm-adapter";
import {
  runRouterBasedLlmDogfoodInvocation,
  type RouterBasedLlmDogfoodInvocationResult,
} from "../provider/router-based-llm-dogfood-invocation";
import { parseAgentTurnResult } from "./agent-turn-result";
import { loadHlamtRuntimeProjection } from "./hlamt-runtime-projection";

export interface AgentModelRequest {
  purpose: "agent_turn";
  model: string;
  systemMessage: string;
  userMessage: string;
  stableContextVersion: string;
  stableContextFingerprint: string;
}

export type AgentModelTransport = (
  request: Readonly<AgentModelRequest>,
) => Promise<{ text: string }>;

export interface SingleTurnAgentInteractionInput {
  projectRoot: string;
  providerId: string;
  model: string;
  endpoint: string;
  apiKey: string;
  userInput: string;
  capabilityInvocationId: string;
  createdAt: string;
  modelTransport: AgentModelTransport;
  capabilityTransport?: DeepSeekCapabilityLlmTransport;
}

export interface AgentTurnRouteMetadata {
  kind: "ordinary_response" | "capability_call";
  capabilityId?: "evidence-extract";
  stableContextVersion: string;
  stableContextFingerprint: string;
  routeSchemaVerified: true;
}

interface SingleTurnAgentInteractionResultBase {
  routeMetadata: AgentTurnRouteMetadata;
  executionTrace?: RealCapabilityInvocationTraceRecord;
}

export interface OrdinarySingleTurnAgentInteractionResult
  extends SingleTurnAgentInteractionResultBase {
  kind: "ordinary_response";
  responseText: string;
  capabilityResult?: undefined;
}

export interface CapabilitySingleTurnAgentInteractionResult
  extends SingleTurnAgentInteractionResultBase {
  kind: "capability_candidate";
  responseText: string;
  capabilityResult: RouterBasedLlmDogfoodInvocationResult;
  executionTrace: RealCapabilityInvocationTraceRecord;
}

export type SingleTurnAgentInteractionResult =
  | OrdinarySingleTurnAgentInteractionResult
  | CapabilitySingleTurnAgentInteractionResult;

const AGENT_AND_TOOL_GUIDANCE = `[AGENT AND TOOL GUIDANCE]
Return the final ordinary response directly when no Skill is needed.
Call evidence-extract only when reports, inferences, conclusions, or proposed actions need bounded evidence separation.
Do not include hidden reasoning. Do not claim a canonical mutation or silently expand the user's goal or authority.
[/AGENT AND TOOL GUIDANCE]`;

const CURRENT_CONTEXT = `[CURRENT CONTEXT]
scope: single_turn
session_memory: unavailable
canonical_mutation: not_allowed_by_agent
[/CURRENT CONTEXT]`;

const AGENT_TURN_RESULT_CONTRACT = `[AGENT TURN RESULT CONTRACT]
Return strict JSON matching exactly one shape, with no additional fields:
{"kind":"ordinary_response","content":"non-empty final response, at most 4000 characters"}
{"kind":"capability_call","capabilityId":"evidence-extract","input":"non-empty bounded Skill input, at most 4000 characters"}
Do not add a reason field or hidden reasoning.
[/AGENT TURN RESULT CONTRACT]`;

function createMainAgentSystemMessage(stableSystemMessage: string): string {
  const skillsIndex = JSON.stringify([evidenceExtractSkillIndexEntry], null, 2);

  return [
    stableSystemMessage,
    AGENT_AND_TOOL_GUIDANCE,
    `[AVAILABLE SKILLS INDEX]\n${skillsIndex}\n[/AVAILABLE SKILLS INDEX]`,
    CURRENT_CONTEXT,
    AGENT_TURN_RESULT_CONTRACT,
  ].join("\n\n");
}

export async function runSingleTurnAgentInteraction(
  input: Readonly<SingleTurnAgentInteractionInput>,
): Promise<SingleTurnAgentInteractionResult> {
  const stableContext = loadHlamtRuntimeProjection(input.projectRoot);
  const stableSystemMessage = createEliyRuntimeSystemMessage(stableContext);
  const agentResponse = await input.modelTransport({
    purpose: "agent_turn",
    model: input.model,
    systemMessage: createMainAgentSystemMessage(stableSystemMessage),
    userMessage: input.userInput,
    stableContextVersion: stableContext.version,
    stableContextFingerprint: stableContext.fingerprint,
  });
  const turnResult = parseAgentTurnResult(agentResponse.text);
  const routeMetadata: AgentTurnRouteMetadata = {
    kind: turnResult.kind,
    ...(turnResult.kind === "capability_call"
      ? { capabilityId: turnResult.capabilityId }
      : {}),
    stableContextVersion: stableContext.version,
    stableContextFingerprint: stableContext.fingerprint,
    routeSchemaVerified: true,
  };

  if (turnResult.kind === "ordinary_response") {
    return {
      kind: "ordinary_response",
      responseText: turnResult.content,
      routeMetadata,
    };
  }

  const capabilityResult = await runRouterBasedLlmDogfoodInvocation({
    projectRoot: input.projectRoot,
    providerId: input.providerId,
    model: input.model,
    endpoint: input.endpoint,
    apiKey: input.apiKey,
    capabilityId: turnResult.capabilityId,
    invocationId: input.capabilityInvocationId,
    createdAt: input.createdAt,
    condition: "baseline",
    payload: { input: turnResult.input },
    transport: input.capabilityTransport,
  });

  if (
    capabilityResult.output.kind !== "candidate" ||
    capabilityResult.output.requiresConfirmation !== true ||
    capabilityResult.output.canonicalMutationAllowed !== false
  ) {
    throw new Error("Capability dispatch requires a confirmation-bound candidate");
  }

  if (
    capabilityResult.traceRecord.stableContextFingerprint !==
    stableContext.fingerprint
  ) {
    throw new Error("Capability dispatch stable context fingerprint mismatch");
  }

  return {
    kind: "capability_candidate",
    responseText: capabilityResult.output.text,
    routeMetadata,
    capabilityResult,
    executionTrace: capabilityResult.traceRecord,
  };
}
