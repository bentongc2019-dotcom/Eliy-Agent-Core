import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PROVIDER_TIMEOUT_MS,
  completeChat,
  parseProviderTimeoutMs,
  readProviderState
} from "../../../provider/openai-compatible.js";

const projectRoot = resolve(__dirname, "../../../..");
const cliPath = join(projectRoot, "src/cli/eliy.ts");
const tsxLoaderPath = join(projectRoot, "node_modules/tsx/dist/loader.mjs");
const secretLikePatterns = [
  /sk-/i,
  /api_key/i,
  /apikey/i,
  /secret/i,
  /token/i,
  /\.env/i,
  /Authorization/i,
  /Bearer\s+/i
];

type CliResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

type CapturedRequest = {
  method?: string;
  url?: string;
  headers: IncomingMessage["headers"];
  body: unknown;
};

const providerEnvNames = [
  "ELIY_PROVIDER_BASE_URL",
  "ELIY_PROVIDER_API_KEY",
  "ELIY_PROVIDER_MODEL",
  "ELIY_PROVIDER_TIMEOUT_MS"
];

let stopServer: (() => Promise<void>) | undefined;

afterEach(async () => {
  if (stopServer) {
    await stopServer();
    stopServer = undefined;
  }
});

function runCli(args: string[], stdin = "", envOverrides: Record<string, string | undefined> = {}): Promise<CliResult> {
  const env = { ...process.env };
  for (const name of providerEnvNames) {
    delete env[name];
  }
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
      cwd: projectRoot,
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("CLI timed out"));
    }, 5_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (status) => {
      clearTimeout(timeout);
      resolvePromise({ status, stdout, stderr });
    });
    child.stdin.end(stdin);
  });
}

function expectNoSecretLikeText(output: string): void {
  for (const pattern of secretLikePatterns) {
    expect(output).not.toMatch(pattern);
  }
}

function listDataTree(rootPath: string): string[] {
  if (!existsSync(rootPath)) {
    return [];
  }

  const results: string[] = [];
  const stack: Array<{ path: string; prefix: string }> = [{ path: rootPath, prefix: "" }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current.path, { withFileTypes: true })) {
      const relativePath = current.prefix ? `${current.prefix}/${entry.name}` : entry.name;
      results.push(relativePath);
      if (entry.isDirectory()) {
        stack.push({ path: join(current.path, entry.name), prefix: relativePath });
      }
    }
  }

  return results.sort();
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function startMockProvider(handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void) {
  const requests: CapturedRequest[] = [];
  const server = createServer(async (request, response) => {
    const rawBody = await readRequestBody(request);
    requests.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: rawBody.length > 0 ? JSON.parse(rawBody) : undefined
    });
    await handler(request, response);
  });

  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Mock provider did not bind to a TCP port");
  }

  stopServer = () => new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) {
        rejectClose(error);
        return;
      }
      resolveClose();
    });
  });

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests
  };
}

describe("Provider / model adapter binding", () => {
  it("uses the default timeout when provider config is complete without a timeout override", () => {
    const state = readProviderState({
      ELIY_PROVIDER_BASE_URL: "http://127.0.0.1:1234",
      ELIY_PROVIDER_API_KEY: "dummy-provider-key",
      ELIY_PROVIDER_MODEL: "test-model"
    });

    expect(state.enabled).toBe(true);
    if (state.enabled) {
      expect(state.config.timeoutMs).toBe(DEFAULT_PROVIDER_TIMEOUT_MS);
    }
  });

  it("parses a valid runtime timeout override", () => {
    const state = readProviderState({
      ELIY_PROVIDER_BASE_URL: "http://127.0.0.1:1234",
      ELIY_PROVIDER_API_KEY: "dummy-provider-key",
      ELIY_PROVIDER_MODEL: "test-model",
      ELIY_PROVIDER_TIMEOUT_MS: "50"
    });

    expect(state.enabled).toBe(true);
    if (state.enabled) {
      expect(state.config.timeoutMs).toBe(50);
    }
    expect(parseProviderTimeoutMs("50")).toBe(50);
  });

  it.each(["", "   ", "abc", "0", "-1", "1.5", "NaN", "Infinity"])(
    "falls back to the default timeout for invalid timeout value %j",
    (timeoutValue) => {
      const state = readProviderState({
        ELIY_PROVIDER_BASE_URL: "http://127.0.0.1:1234",
        ELIY_PROVIDER_API_KEY: "dummy-provider-key",
        ELIY_PROVIDER_MODEL: "test-model",
        ELIY_PROVIDER_TIMEOUT_MS: timeoutValue
      });

      expect(state.enabled).toBe(true);
      if (state.enabled) {
        expect(state.config.timeoutMs).toBe(DEFAULT_PROVIDER_TIMEOUT_MS);
      }
      expect(parseProviderTimeoutMs(timeoutValue)).toBe(DEFAULT_PROVIDER_TIMEOUT_MS);
    }
  );

  it("falls back to the deterministic skeleton response when provider config is absent", async () => {
    const result = await runCli(["chat"], "hello\n/exit\n");
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/assistant: skeleton response received: hello/i);
    expect(result.stdout).toMatch(/deterministic skeleton response/i);
    expect(result.stdout).toMatch(/chat loop exited/i);
    expect(result.stdout).not.toMatch(/Eliy session transcript debug summary/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("falls back without calling provider when provider config is incomplete", async () => {
    const provider = await startMockProvider((_request, response) => {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "should not be called" }));
    });

    const result = await runCli(["chat"], "hello\n/exit\n", {
      ELIY_PROVIDER_BASE_URL: provider.baseUrl,
      ELIY_PROVIDER_MODEL: "test-model"
    });
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(provider.requests).toHaveLength(0);
    expect(result.stdout).toMatch(/assistant: skeleton response received: hello/i);
    expect(result.stdout).toMatch(/deterministic skeleton response/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("returns an ordinary response from one main Agent provider call", async () => {
    const provider = await startMockProvider((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                kind: "ordinary_response",
                content: "mock provider reply"
              })
            }
          }
        ]
      }));
    });

    const result = await runCli(["chat"], "hello\n/exit\n", {
      ELIY_PROVIDER_BASE_URL: provider.baseUrl,
      ELIY_PROVIDER_API_KEY: "dummy-provider-key",
      ELIY_PROVIDER_MODEL: "test-model"
    });
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0].method).toBe("POST");
    expect(provider.requests[0].url).toBe("/chat/completions");
    expect(provider.requests[0].headers.authorization).toBe("Bearer dummy-provider-key");
    const requestBodies = provider.requests.map((request) =>
      JSON.stringify(request.body),
    );
    expect(requestBodies[0]).toContain("[ELIY STABLE CONTEXT version=1.0.0]");
    expect(requestBodies[0]).toContain("Human Intelligence Augmentation");
    expect(requestBodies[0]).toContain("[AGENT TURN RESULT CONTRACT]");
    expect(requestBodies[0]).toContain("[AVAILABLE SKILLS INDEX]");
    expect(requestBodies[0]).not.toContain("[CAPABILITY INSTRUCTIONS]");
    expect(requestBodies[0]).toContain("hello");
    expect(result.stdout).toMatch(/assistant: mock provider reply/i);
    expect(result.stdout).toMatch(/agent route:.*"kind":"ordinary_response"/i);
    expect(result.stdout).not.toMatch(/interaction receipt:/i);
    expect(result.stdout).toMatch(/chat loop exited/i);
    expect(result.stdout).not.toMatch(/Eliy session transcript debug summary/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("dispatches a main Agent capability call through the formal evidence-extract chain", async () => {
    let responseCount = 0;
    const provider = await startMockProvider((_request, response) => {
      responseCount += 1;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: responseCount === 1
                ? JSON.stringify({
                    kind: "capability_call",
                    capabilityId: "evidence-extract",
                    input: "report and inference are mixed"
                  })
                : "bounded evidence candidate",
              reasoning_content: null
            }
          }
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 10,
          total_tokens: 35
        }
      }));
    });

    const result = await runCli(
      ["chat"],
      "report and inference are mixed\n/exit\n",
      {
        ELIY_PROVIDER_BASE_URL: provider.baseUrl,
        ELIY_PROVIDER_API_KEY: "dummy-provider-key",
        ELIY_PROVIDER_MODEL: "test-model"
      }
    );
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(provider.requests).toHaveLength(2);
    const decisionRequest = JSON.stringify(provider.requests[0].body);
    const capabilityRequest = JSON.stringify(provider.requests[1].body);
    expect(decisionRequest).toContain("[AGENT TURN RESULT CONTRACT]");
    expect(decisionRequest).toContain("[AVAILABLE SKILLS INDEX]");
    expect(capabilityRequest).toContain("[ELIY STABLE CONTEXT version=1.0.0]");
    expect(capabilityRequest).toContain("[CAPABILITY INSTRUCTIONS]");
    expect(capabilityRequest).toContain("[OUTPUT BOUNDARY]");
    expect(capabilityRequest).not.toContain("[HLAMT CONTEXT]");
    expect(provider.requests[0].body).not.toHaveProperty("thinking");
    expect(provider.requests[1].body).toMatchObject({
      thinking: { type: "disabled" }
    });
    expect(result.stdout).toContain("assistant: bounded evidence candidate");
    expect(result.stdout).toMatch(/agent route:.*"kind":"capability_call"/);
    expect(result.stdout).toMatch(/agent route:.*"routeSchemaVerified":true/);
    expect(result.stdout).toMatch(/capability execution trace:.*"stableContextInjectionVerified":true/);
    expect(result.stdout).toMatch(/capability execution trace:.*"canonicalMutationAllowed":false/);
    expect(result.stdout).toMatch(/capability execution trace:.*"thinkingMode":"disabled"/);
    expect(result.stdout).toMatch(/capability execution trace:.*"finishReason":"stop"/);
    expect(result.stdout).not.toMatch(/interaction receipt:/);
    expectNoSecretLikeText(combinedOutput);
  });

  it("prints a transcript debug summary only through the explicit debug path without capturing secrets", async () => {
    const dataRoot = join(projectRoot, "data");
    const beforeEntries = listDataTree(dataRoot);
    const provider = await startMockProvider((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                kind: "ordinary_response",
                content: "mock provider reply"
              })
            }
          }
        ]
      }));
    });

    const result = await runCli(["chat"], "hello\n/exit\n", {
      ELIY_PROVIDER_BASE_URL: provider.baseUrl,
      ELIY_PROVIDER_API_KEY: "dummy-provider-key",
      ELIY_PROVIDER_MODEL: "test-model",
      ELIY_CHAT_DEBUG_TRANSCRIPT: "1"
    });
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    const afterEntries = listDataTree(dataRoot);

    expect(result.status).toBe(0);
    expect(provider.requests).toHaveLength(1);
    expect(result.stdout).toMatch(/Eliy session transcript debug summary/);
    expect(result.stdout).toMatch(/turn_count: 2/);
    expect(result.stdout).toMatch(/1\. user: hello/);
    expect(result.stdout).toMatch(/2\. assistant: mock provider reply/);
    expect(result.stdout).not.toMatch(/dummy-provider-key/);
    expect(result.stdout).not.toMatch(/Authorization/);
    expect(result.stdout).not.toMatch(/Bearer/);
    expect(result.stdout).not.toMatch(/ELIY_PROVIDER_BASE_URL/);
    expect(result.stdout).not.toMatch(/ELIY_PROVIDER_API_KEY/);
    expect(result.stdout).not.toMatch(/ELIY_PROVIDER_MODEL/);
    expect(result.stdout).not.toMatch(/ELIY_PROVIDER_TIMEOUT_MS/);
    expect(afterEntries).toEqual(beforeEntries);
    expect(afterEntries.some((entry) => /transcript/i.test(entry))).toBe(false);
    expectNoSecretLikeText(combinedOutput);
  });

  it("uses the configured runtime timeout when provider requests are slow", async () => {
    const provider = await startMockProvider(async (_request, response) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        choices: [
          {
            message: {
              content: "late mock provider reply"
            }
          }
        ]
      }));
    });

    const result = await runCli(["chat"], "hello\n/exit\n", {
      ELIY_PROVIDER_BASE_URL: provider.baseUrl,
      ELIY_PROVIDER_API_KEY: "dummy-provider-key",
      ELIY_PROVIDER_MODEL: "test-model",
      ELIY_PROVIDER_TIMEOUT_MS: "500"
    });
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(provider.requests).toHaveLength(1);
    expect(result.stdout).toMatch(/assistant: provider call failed/i);
    expect(result.stdout).toMatch(/timed out/i);
    expect(result.stdout).toMatch(/redacted/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("prints a safe redacted provider error and exits cleanly when provider response fails", async () => {
    const provider = await startMockProvider((_request, response) => {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: "upstream failed" }));
    });

    const result = await runCli(["chat"], "hello\n/exit\n", {
      ELIY_PROVIDER_BASE_URL: provider.baseUrl,
      ELIY_PROVIDER_API_KEY: "dummy-provider-key",
      ELIY_PROVIDER_MODEL: "test-model"
    });
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(provider.requests).toHaveLength(1);
    expect(result.stdout).toMatch(/assistant: provider call failed/i);
    expect(result.stdout).toMatch(/redacted/i);
    expect(result.stdout).toMatch(/chat loop exited/i);
    expectNoSecretLikeText(combinedOutput);
  });

  it("redacts provider transport failures without printing config values", async () => {
    const unsafeBaseUrl = "not-a-valid-provider-url";
    const result = await runCli(["chat"], "hello\n/exit\n", {
      ELIY_PROVIDER_BASE_URL: unsafeBaseUrl,
      ELIY_PROVIDER_API_KEY: "dummy-provider-key",
      ELIY_PROVIDER_MODEL: "test-model"
    });
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/assistant: provider call failed/i);
    expect(result.stdout).toMatch(/redacted/i);
    expect(combinedOutput).not.toContain(unsafeBaseUrl);
    expectNoSecretLikeText(combinedOutput);
  });

  it("times out provider requests with redacted error details", async () => {
    const provider = await startMockProvider(async (_request, response) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        choices: [
          {
            message: {
              content: "late mock provider reply"
            }
          }
        ]
      }));
    });

    try {
      await completeChat({
        config: {
          baseUrl: provider.baseUrl,
          apiKey: "dummy-provider-key",
          model: "test-model",
          timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS
        },
        userInput: "hello",
        systemMessage: "bounded test system message",
        timeoutMs: 50
      });
      throw new Error("Expected provider request to time out");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toBe("Provider request timed out with redacted details.");
      expect(message).not.toContain(provider.baseUrl);
      expectNoSecretLikeText(message);
    }
  });

  it("preserves existing loop and script contracts", async () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const exitResult = await runCli(["chat"], "/exit\n");
    const emptyResult = await runCli(["chat"], "\n/exit\n");
    const eofResult = await runCli(["chat"], "");
    const helpResult = await runCli(["chat", "--help"]);
    const combinedOutput = [
      exitResult.stdout,
      exitResult.stderr,
      emptyResult.stdout,
      emptyResult.stderr,
      eofResult.stdout,
      eofResult.stderr,
      helpResult.stdout,
      helpResult.stderr
    ].join("\n");

    expect(packageJson.scripts?.proof).toBe("tsx src/cli/eliy.ts proof terminal");
    expect(packageJson.scripts?.smoke).toBe("tsx src/cli/eliy.ts proof terminal");
    expect(exitResult.status).toBe(0);
    expect(exitResult.stdout).toMatch(/chat loop exited/i);
    expect(emptyResult.status).toBe(0);
    expect(emptyResult.stdout).toMatch(/empty input received/i);
    expect(eofResult.status).toBe(0);
    expect(eofResult.stdout).toMatch(/chat loop exited/i);
    expect(helpResult.status).toBe(0);
    expect(helpResult.stdout).toMatch(/usage/i);
    expect(helpResult.stdout).toMatch(/provider config is optional/i);
    expect(helpResult.stdout).toMatch(/enabled only when config is complete/i);
    expect(helpResult.stdout).toMatch(/no session, transcript, or runtime state persistence/i);
    expectNoSecretLikeText(combinedOutput);
  });
});
