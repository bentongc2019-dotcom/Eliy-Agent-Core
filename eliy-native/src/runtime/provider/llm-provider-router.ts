import type {
  LlmCapabilityAdapter,
  LlmCapabilityAdapterInput,
  LlmCapabilityAdapterResult,
} from "../capabilities/llm-capability-adapter-contract";

export type LlmProviderId = string;

export type LlmProviderAdapterMap = Record<LlmProviderId, LlmCapabilityAdapter>;

export interface LlmProviderRouterConfig {
  adapterMap: LlmProviderAdapterMap;
}

export interface LlmProviderRouterInput
  extends Omit<LlmCapabilityAdapterInput, "payload"> {
  providerId: LlmProviderId;
  model: string;
  payload: LlmCapabilityAdapterInput["payload"];
}

export interface LlmProviderRouterResult extends LlmCapabilityAdapterResult {
  router: {
    providerId: LlmProviderId;
    model: string;
  };
}

export type LlmProviderRouter = (
  input: Readonly<LlmProviderRouterInput>,
) => Promise<LlmProviderRouterResult>;

const HANDLER = "llm-provider-router";

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function ensureAdapterMap(
  adapterMap: LlmProviderRouterConfig["adapterMap"] | undefined,
): LlmProviderAdapterMap {
  if (!adapterMap) {
    throw new Error("LLM provider router requires adapterMap");
  }

  return adapterMap;
}

function ensureProviderId(providerId: unknown): LlmProviderId {
  if (trimText(providerId) === "") {
    throw new Error("LLM provider router requires providerId");
  }

  return providerId as LlmProviderId;
}

function ensureModel(model: unknown): string {
  if (trimText(model) === "") {
    throw new Error("LLM provider router requires model");
  }

  return model as string;
}

function createRouterResult(
  providerId: LlmProviderId,
  model: string,
  result: LlmCapabilityAdapterResult,
): LlmProviderRouterResult {
  return {
    ...result,
    handler: result.handler || HANDLER,
    router: {
      providerId,
      model,
    },
  };
}

export function createLlmProviderRouter(
  config: LlmProviderRouterConfig,
): LlmProviderRouter {
  const adapterMap = ensureAdapterMap(config.adapterMap);

  return async (input) => {
    const providerId = ensureProviderId(input.providerId);
    const model = ensureModel(input.model);
    const adapter = adapterMap[providerId];

    if (typeof adapter !== "function") {
      throw new Error(
        `LLM provider router requires adapter for providerId: ${providerId}`,
      );
    }

    const result = await adapter({
      capabilityId: input.capabilityId,
      capabilityName: input.capabilityName,
      capabilityVersion: input.capabilityVersion,
      capabilityKind: input.capabilityKind,
      payload: input.payload,
      executionContext: input.executionContext,
    });

    return createRouterResult(providerId, model, result);
  };
}
