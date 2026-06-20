import { strict as assert } from "node:assert";
import { join, normalize } from "node:path";

type TestResult = {
  id: string;
  result: "Passed";
  evidence: string;
};

function record(results: TestResult[], id: string, evidence: string): void {
  results.push({ id, result: "Passed", evidence });
}

async function run(): Promise<void> {
  const results: TestResult[] = [];
  // @ts-expect-error - runtime side-effect import of a browser/server-side JS module.
  const runtimeConfig = await import("../../../eliy-kernel/runtime/deploy-config.js");

  const defaultConfig = runtimeConfig.resolveRuntimeConfig({
    env: {},
    rootDir: "/repo"
  });
  assert.equal(defaultConfig.host, "127.0.0.1");
  assert.equal(defaultConfig.port, 3001);
  assert.equal(defaultConfig.cookie.secure, false);
  assert.equal(defaultConfig.cookie.sameSite, "Lax");
  assert.equal(defaultConfig.paths.accountStorageDir, join("/repo", "eliy-kernel", "runtime", ".eliy-data"));
  assert.equal(defaultConfig.paths.transcriptsDir, join("/repo", "eliy-kernel", "transcripts"));
  assert.equal(defaultConfig.paths.memoryDir, join("/repo", "eliy-kernel", "memory"));
  assert.equal(defaultConfig.paths.hlamtEvidenceDir, join("/repo", "eliy-kernel", "hlamt"));
  assert.equal(defaultConfig.paths.reportsDir, join("/repo", "experiments", "openai-agents-ts-runtime", "reports"));
  assert.equal(defaultConfig.paths.stateDir, join("/repo", "experiments", "openai-agents-ts-runtime", "state"));
  record(results, "TD-P0-01", "Default host/port/cookie/runtime paths resolve to local-smoke compatible values.");

  const trustedConfig = runtimeConfig.resolveRuntimeConfig({
    env: {
      HOST: "0.0.0.0",
      PORT: "4176",
      ELIY_PUBLIC_BASE_URL: "https://trusted-beta.example.com",
      ELIY_COOKIE_SECURE: "true",
      ELIY_COOKIE_SAMESITE: "None",
      ELIY_RUNTIME_DATA_DIR: "/var/lib/eliy-beta2/runtime",
      ELIY_ACCOUNT_STORAGE_DIR: "/var/lib/eliy-beta2/account-store",
      ELIY_TRANSCRIPTS_DIR: "/var/lib/eliy-beta2/runtime/transcripts",
      ELIY_MEMORY_DIR: "/var/lib/eliy-beta2/runtime/memory",
      ELIY_EVIDENCE_DIR: "/var/lib/eliy-beta2/runtime/hlamt",
      ELIY_REPORTS_DIR: "/var/lib/eliy-beta2/runtime/reports",
      ELIY_STATE_DIR: "/var/lib/eliy-beta2/runtime/state",
      ELIY_ALLOWLIST: "alpha@example.com,beta@example.com",
      ELIY_INVITE_CODES: "CODE-1,CODE-2",
      ELIY_SESSION_TTL_MS: "3600000"
    },
    rootDir: "/repo"
  });
  assert.equal(trustedConfig.host, "0.0.0.0");
  assert.equal(trustedConfig.port, 4176);
  assert.equal(trustedConfig.publicBaseUrl, "https://trusted-beta.example.com");
  assert.equal(trustedConfig.cookie.secure, true);
  assert.equal(trustedConfig.cookie.sameSite, "None");
  assert.equal(trustedConfig.sessionTtlMs, 3600000);
  assert.deepEqual(trustedConfig.allowlist, ["alpha@example.com", "beta@example.com"]);
  assert.deepEqual(trustedConfig.inviteCodes, ["CODE-1", "CODE-2"]);
  assert.equal(trustedConfig.paths.transcriptsDir, "/var/lib/eliy-beta2/runtime/transcripts");
  assert.equal(trustedConfig.paths.memoryDir, "/var/lib/eliy-beta2/runtime/memory");
  assert.equal(trustedConfig.paths.hlamtEvidenceDir, "/var/lib/eliy-beta2/runtime/hlamt");
  assert.equal(trustedConfig.paths.reportsDir, "/var/lib/eliy-beta2/runtime/reports");
  assert.equal(trustedConfig.paths.stateDir, "/var/lib/eliy-beta2/runtime/state");
  record(results, "TD-P0-02", "Trusted beta env resolves host, HTTPS base URL, secure cookie, allowlist, invite codes, and external runtime paths.");

  assert.throws(
    () =>
      runtimeConfig.resolveRuntimeConfig({
        env: {
          ELIY_COOKIE_SECURE: "false",
          ELIY_COOKIE_SAMESITE: "None"
        },
        rootDir: "/repo"
      }),
    /ELIY_COOKIE_SAMESITE=None requires ELIY_COOKIE_SECURE=true and HTTPS/
  );
  record(results, "TD-P0-03", "SameSite=None without Secure is rejected with a clear configuration error.");

  assert.throws(
    () =>
      runtimeConfig.resolveRuntimeConfig({
        env: {
          ELIY_PUBLIC_BASE_URL: "http://trusted-beta.example.com",
          ELIY_COOKIE_SECURE: "true",
          ELIY_COOKIE_SAMESITE: "Lax"
        },
        rootDir: "/repo"
      }),
    /ELIY_COOKIE_SECURE=true requires ELIY_PUBLIC_BASE_URL to use https:\/\//
  );
  record(results, "TD-P0-04", "Secure cookies require an HTTPS public base URL.");

  const kernelPath = runtimeConfig.resolveKernelRuntimePath(
    "/repo",
    "memory/STATE.md",
    {
      transcriptsDir: "/var/lib/eliy-beta2/runtime/transcripts",
      memoryDir: "/var/lib/eliy-beta2/runtime/memory",
      hlamtEvidenceDir: "/var/lib/eliy-beta2/runtime/hlamt"
    }
  );
  assert.equal(normalize(kernelPath), normalize("/var/lib/eliy-beta2/runtime/memory/STATE.md"));
  record(results, "TD-P0-05", "Kernel runtime memory path resolves outside the repository tree when runtime dirs are externalized.");

  const evidencePath = runtimeConfig.resolveKernelRuntimePath(
    "/repo",
    "hlamt/EVIDENCE.md",
    {
      transcriptsDir: "/var/lib/eliy-beta2/runtime/transcripts",
      memoryDir: "/var/lib/eliy-beta2/runtime/memory",
      hlamtEvidenceDir: "/var/lib/eliy-beta2/runtime/hlamt"
    }
  );
  assert.equal(normalize(evidencePath), normalize("/var/lib/eliy-beta2/runtime/hlamt/EVIDENCE.md"));
  record(results, "TD-P0-06", "Kernel evidence path resolves outside the repository tree when runtime dirs are externalized.");

  const originalEnv = {
    ELIY_RUNTIME_DATA_DIR: process.env.ELIY_RUNTIME_DATA_DIR,
    ELIY_REPORTS_DIR: process.env.ELIY_REPORTS_DIR,
    ELIY_STATE_DIR: process.env.ELIY_STATE_DIR,
    ELIY_LOGS_DIR: process.env.ELIY_LOGS_DIR
  };
  try {
    process.env.ELIY_RUNTIME_DATA_DIR = "/var/lib/eliy-beta2/runtime";
    delete process.env.ELIY_REPORTS_DIR;
    delete process.env.ELIY_STATE_DIR;
    delete process.env.ELIY_LOGS_DIR;
    const storage = await import("./storage.js");
    assert.equal(storage.runtimeDataDir, "/var/lib/eliy-beta2/runtime");
    assert.equal(storage.reportsDir, "/var/lib/eliy-beta2/runtime/reports");
    assert.equal(storage.logsDir, "/var/lib/eliy-beta2/runtime/logs");
    assert.equal(storage.stateDir, "/var/lib/eliy-beta2/runtime/state");
    record(results, "TD-P0-07", "Experiment storage helper derives reports/logs/state outside the repository tree when ELIY_RUNTIME_DATA_DIR is set.");
  } finally {
    if (originalEnv.ELIY_RUNTIME_DATA_DIR === undefined) delete process.env.ELIY_RUNTIME_DATA_DIR;
    else process.env.ELIY_RUNTIME_DATA_DIR = originalEnv.ELIY_RUNTIME_DATA_DIR;
    if (originalEnv.ELIY_REPORTS_DIR === undefined) delete process.env.ELIY_REPORTS_DIR;
    else process.env.ELIY_REPORTS_DIR = originalEnv.ELIY_REPORTS_DIR;
    if (originalEnv.ELIY_STATE_DIR === undefined) delete process.env.ELIY_STATE_DIR;
    else process.env.ELIY_STATE_DIR = originalEnv.ELIY_STATE_DIR;
    if (originalEnv.ELIY_LOGS_DIR === undefined) delete process.env.ELIY_LOGS_DIR;
    else process.env.ELIY_LOGS_DIR = originalEnv.ELIY_LOGS_DIR;
  }

  const report = [
    "# CP-ELIY-BETA2-TRUSTED-DEPLOY-P0-FIX-IMPLEMENTATION-01 Config Validation",
    "",
    ...results.map((item) => `- ${item.id}: ${item.result} — ${item.evidence}`)
  ].join("\n");
  console.log(report);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
