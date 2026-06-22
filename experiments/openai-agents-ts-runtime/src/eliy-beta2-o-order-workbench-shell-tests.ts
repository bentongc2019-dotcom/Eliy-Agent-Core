import { strict as assert } from "node:assert";
import { fetchJson, spawnShellServer } from "./beta2-shell-test-utils.js";

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
  const server = await spawnShellServer();

  try {
    const response = await fetchJson(`${server.baseUrl}/api/workbench/o-order/schema`, {
      method: "GET"
    });

    assert.equal(response.res.status, 200);
    assert.equal(response.payload.workbench, "o_order");
    assert.equal(response.payload.status, "shell");
    assert.equal(response.payload.runtimeEnabled, false);
    assert(Array.isArray(response.payload.fields), "schema must expose fields array");
    assert.deepEqual(response.payload.fields.map((item: any) => item.key), [
      "goal",
      "plan",
      "actions",
      "owner",
      "time",
      "followUps",
      "review",
      "evidence",
      "status"
    ]);
    record(results, "O-WB-01", "O 单 workbench schema exposes shell-ready field set.");

    console.log([
      "# CP-ELIY-BETA2-O-ORDER-WORKBENCH-SHELL-TESTS",
      "",
      `- ${results.map((item) => `${item.id}: ${item.result} — ${item.evidence}`).join("\n- ")}`
    ].join("\n"));
  } finally {
    await server.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
