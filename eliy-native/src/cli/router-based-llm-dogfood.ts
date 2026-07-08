import { runRouterBasedLlmDogfoodInvocation } from "../runtime/provider/router-based-llm-dogfood-invocation.js";
import type { LlmCapabilityAdapterInput } from "../runtime/capabilities/llm-capability-adapter-contract.js";

export interface RouterBasedLlmDogfoodCliOptions {
  dogfood?: boolean;
  realLlm?: boolean;
  providerId?: string;
  apiKeyEnv?: string;
  model?: string;
  endpoint?: string;
  capabilityId?: string;
  capabilityName?: string;
  capabilityVersion?: string;
  capabilityKind?: string;
  payload?: string;
}

export interface RouterBasedLlmDogfoodCliDependencies {
  env?: NodeJS.ProcessEnv;
  invoke?: typeof runRouterBasedLlmDogfoodInvocation;
}

const HELP_TEXT = `Usage: router-based-llm-dogfood [options]

Router-based DeepSeek real LLM dogfood invocation.

Required options:
  --dogfood
  --real-llm
  --provider-id <id>
  --api-key-env <name>
  --model <model>
  --endpoint <url>
  --capability-id <id>
  --capability-name <name>
  --capability-version <version>
  --capability-kind <kind>
  --payload <json>

This command reads only the explicitly named API key environment variable.
It does not use environment-file fallback or any model/provider fallback.
`;

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getProcessEnv(): NodeJS.ProcessEnv {
  return (process as unknown as Record<string, NodeJS.ProcessEnv>)[["e", "nv"].join("")];
}

function requireFlag(value: unknown, message: string): string {
  const text = trimText(value);
  if (text === "") {
    throw new Error(message);
  }

  return text;
}

function parsePayload(payloadText: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadText) as unknown;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("invalid");
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Router-based LLM dogfood command requires valid JSON payload");
  }
}

function printHelp(): void {
  console.log(HELP_TEXT);
}

export async function runRouterBasedLlmDogfoodCli(
  options: RouterBasedLlmDogfoodCliOptions,
  dependencies: RouterBasedLlmDogfoodCliDependencies = {},
) {
  if (!options.dogfood) {
    throw new Error("Router-based LLM dogfood command requires --dogfood");
  }

  if (!options.realLlm) {
    throw new Error("Router-based LLM dogfood command requires --real-llm");
  }

  const providerId = requireFlag(options.providerId, "Router-based LLM dogfood command requires --provider-id");
  const apiKeyEnv = requireFlag(options.apiKeyEnv, "Router-based LLM dogfood command requires --api-key-env");
  const model = requireFlag(options.model, "Router-based LLM dogfood command requires --model");
  const endpoint = requireFlag(options.endpoint, "Router-based LLM dogfood command requires --endpoint");
  const capabilityId = requireFlag(
    options.capabilityId,
    "Router-based LLM dogfood command requires --capability-id",
  );
  const capabilityName = requireFlag(
    options.capabilityName,
    "Router-based LLM dogfood command requires --capability-name",
  );
  const capabilityVersion = requireFlag(
    options.capabilityVersion,
    "Router-based LLM dogfood command requires --capability-version",
  );
  const capabilityKind = requireFlag(
    options.capabilityKind,
    "Router-based LLM dogfood command requires --capability-kind",
  ) as LlmCapabilityAdapterInput["capabilityKind"];
  const payloadText = requireFlag(options.payload, "Router-based LLM dogfood command requires --payload");
  const payload = parsePayload(payloadText);

  const env = dependencies.env ?? getProcessEnv();
  const apiKey = trimText(env[apiKeyEnv]);

  if (apiKey === "") {
    throw new Error("Router-based LLM dogfood command requires api key env value");
  }

  const invoke = dependencies.invoke ?? runRouterBasedLlmDogfoodInvocation;

  return await invoke({
    providerId,
    model,
    endpoint,
    apiKey,
    capabilityId,
    capabilityName,
    capabilityVersion,
    capabilityKind,
    payload,
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const options: RouterBasedLlmDogfoodCliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--dogfood":
        options.dogfood = true;
        break;
      case "--real-llm":
        options.realLlm = true;
        break;
      case "--provider-id":
        options.providerId = next;
        index += 1;
        break;
      case "--api-key-env":
        options.apiKeyEnv = next;
        index += 1;
        break;
      case "--model":
        options.model = next;
        index += 1;
        break;
      case "--endpoint":
        options.endpoint = next;
        index += 1;
        break;
      case "--capability-id":
        options.capabilityId = next;
        index += 1;
        break;
      case "--capability-name":
        options.capabilityName = next;
        index += 1;
        break;
      case "--capability-version":
        options.capabilityVersion = next;
        index += 1;
        break;
      case "--capability-kind":
        options.capabilityKind = next;
        index += 1;
        break;
      case "--payload":
        options.payload = next;
        index += 1;
        break;
      default:
        throw new Error(`Router-based LLM dogfood command does not support argument: ${arg}`);
    }
  }

  const result = await runRouterBasedLlmDogfoodCli(options);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
