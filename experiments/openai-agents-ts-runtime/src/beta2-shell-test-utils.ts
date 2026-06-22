import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type ShellServer = {
  baseUrl: string;
  child: ReturnType<typeof spawn>;
  stop: () => Promise<void>;
};

export async function getFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate port."));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

export async function spawnShellServer(overrides: Record<string, string> = {}): Promise<ShellServer> {
  const port = await getFreePort();
  const tempDir = await mkdtemp(join(tmpdir(), "eliy-beta2-shell-test-"));
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const serverPath = join(repoRoot, "eliy-kernel", "runtime", "server.js");
  const child = spawn(process.execPath, [serverPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      CANDIDATE_GENERATION_MODE: "generic_fallback",
      ELIY_RUNTIME_DATA_DIR: join(tempDir, "runtime"),
      ELIY_ACCOUNT_STORAGE_DIR: tempDir,
      ELIY_TRANSCRIPTS_DIR: join(tempDir, "runtime", "transcripts"),
      ELIY_MEMORY_DIR: join(tempDir, "runtime", "memory"),
      ELIY_REPORTS_DIR: join(tempDir, "runtime", "reports"),
      ELIY_STATE_DIR: join(tempDir, "runtime", "state"),
      ELIY_EVIDENCE_DIR: join(tempDir, "runtime", "hlamt"),
      ELIY_ALLOWLIST: "beta-user@example.com,second-beta@example.com,owner-test@eliyai.com",
      ELIY_INVITE_CODES: "BETA-INVITE",
      ...overrides
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl);

  return {
    baseUrl,
    child,
    async stop() {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      await new Promise((resolve) => child.once("exit", resolve));
    }
  };
}

export async function waitForServer(baseUrl: string): Promise<void> {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/runtime/status`, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not become ready in time.");
}

export async function loginWithCookie(baseUrl: string, cookieJar: string[]): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email_or_login_id: "owner-test@eliyai.com",
      invite_code: "BETA-INVITE"
    })
  });
  if (!response.ok) {
    throw new Error(`login failed: ${response.status}`);
  }
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("login response missing cookie");
  cookieJar.push(setCookie.split(";")[0]);
  return cookieJar.join("; ");
}

export async function fetchJson(url: string, options: RequestInit = {}): Promise<{ res: Response; payload: any }> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await res.json().catch(() => ({} as any));
  return { res, payload };
}
