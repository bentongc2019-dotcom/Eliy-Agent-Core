import { join } from "node:path";
import { appendJsonl, logsDir, writeJson } from "./storage.js";

export type RuntimeNetworkRecord = {
  phase: "runtime";
  method: string;
  url: string;
  domain: string;
  allowed: boolean;
  reason: string;
  timestamp: string;
};

const records: RuntimeNetworkRecord[] = [];
let installed = false;

function classify(url: string): { domain: string; allowed: boolean; reason: string } {
  const parsed = new URL(url);
  const domain = parsed.host;
  const configuredAllowedHost = process.env.RUNTIME_ALLOWED_MODEL_DOMAIN;
  const allowedHosts = new Set(["api.openai.com", configuredAllowedHost].filter(Boolean));
  if (allowedHosts.has(domain)) {
    return { domain, allowed: true, reason: "Configured OpenAI-compatible Model API" };
  }
  return { domain, allowed: false, reason: "Not in runtime allowlist" };
}

export function installRuntimeNetworkLogger(): void {
  if (installed || typeof globalThis.fetch !== "function") return;
  installed = true;
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
    const classification = classify(url);
    const record: RuntimeNetworkRecord = {
      phase: "runtime",
      method,
      url,
      ...classification,
      timestamp: new Date().toISOString()
    };
    records.push(record);
    await appendJsonl(join(logsDir, "network-runtime.jsonl"), record);
    return originalFetch(input, init);
  };
}

export function getRuntimeNetworkRecords(): RuntimeNetworkRecord[] {
  return [...records];
}

export async function persistRuntimeNetworkRecords(): Promise<void> {
  await writeJson(join(logsDir, "network-runtime.json"), records);
}
