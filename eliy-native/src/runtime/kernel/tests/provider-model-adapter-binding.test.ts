import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { completeChat } from "../../../provider/openai-compatible.js";

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
  "ELIY_PROVIDER_MODEL"
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
  it("falls back to the deterministic skeleton response when provider config is absent", async () => {
    const result = await runCli(["chat"], "hello\n/exit\n");
    const combinedOutput = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/assistant: skeleton response received: hello/i);
    expect(result.stdout).toMatch(/deterministic skeleton response/i);
    expect(result.stdout).toMatch(/chat loop exited/i);
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

  it("calls an OpenAI-compatible local provider and prints its response when config is complete", async () => {
    const provider = await startMockProvider((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        choices: [
          {
            message: {
              content: "mock provider reply"
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
    expect(provider.requests[0].body).toEqual({
      model: "test-model",
      messages: [
        {
          role: "user",
          content: "hello"
        }
      ]
    });
    expect(result.stdout).toMatch(/assistant: mock provider reply/i);
    expect(result.stdout).toMatch(/chat loop exited/i);
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
          model: "test-model"
        },
        userInput: "hello",
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
