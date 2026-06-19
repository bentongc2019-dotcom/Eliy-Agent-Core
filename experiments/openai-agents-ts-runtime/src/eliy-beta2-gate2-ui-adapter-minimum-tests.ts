import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDirs, reportsDir } from "./storage.js";

type TestResult = {
  id: string;
  result: "Passed" | "Failed";
  evidence: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadAdapter(): Promise<any> {
  // @ts-expect-error - runtime side-effect import of a browser script with no TS declarations.
  await import("../../../frontend/webchat/gate2-adapter.js");
  const adapter = (globalThis as any).EliyGate2Adapter;
  assert(adapter, "Gate2 adapter must attach to globalThis.");
  return adapter;
}

async function runTests(): Promise<TestResult[]> {
  const adapter = await loadAdapter();
  const normalize = adapter.normalizeChatResponseEnvelope as (raw?: Record<string, unknown>, context?: Record<string, unknown>) => any;
  const buildPlan = adapter.buildGate2RenderPlan as (raw?: Record<string, unknown>) => any;
  const createBinding = adapter.createChatRuntimeBinding as (input?: Record<string, unknown>) => any;

  const results: TestResult[] = [];

  const ordinary = buildPlan(normalize({
    reply: "普通聊天回复",
    gate2: null,
    legacy_artifact: null,
    errors: []
  }));
  assert(ordinary.reply === "普通聊天回复", "Ordinary reply must remain visible.");
  assert(Array.isArray(ordinary.panels) && ordinary.panels.length === 0, "Ordinary chat must not render adapter panels.");
  results.push({
    id: "UI-GT-A",
    result: "Passed",
    evidence: "Ordinary chat kept reply only without gate2 panels."
  });

  const confirmation = buildPlan(normalize({
    reply: "需要确认",
    gate2: {
      requires_confirmation: true,
      confirmation_request: {
        confirmation_type: "approval",
        summary: "确认候选变更",
        options: ["confirm", "reject", "defer"],
        default_action: "confirm",
        proposal_id: "proposal-1",
        evidence_refs: ["trace:1"]
      },
      trace_id: "trace-confirm-1"
    }
  }));
  assert(confirmation.panels.some((panel: any) => panel.kind === "confirmation_panel"), "Confirmation response must render confirmation panel.");
  assert(confirmation.panels.some((panel: any) => panel.kind === "trace_chip"), "Confirmation response must render trace chip.");
  results.push({
    id: "UI-GT-B",
    result: "Passed",
    evidence: "Confirmation response rendered confirmation panel and trace chip."
  });

  const pending = buildPlan(normalize({
    reply: "候选变更尚未生效",
    gate2: {
      requires_confirmation: true,
      confirmation_request: {
        confirmation_type: "approval",
        summary: "候选变更待确认",
        options: ["confirm", "reject", "defer"],
        default_action: "confirm",
        proposal_id: "proposal-2",
        evidence_refs: ["trace:2"]
      },
      proposed_state_patch: {
        patch_type: "state_patch",
        target_path: "intent.goal",
        proposed_value: "新目标",
        reason: "candidate",
        evidence_refs: ["trace:2"],
        risk_level: "high",
        requires_user_confirmation: true
      }
    }
  }));
  assert(pending.panels.some((panel: any) => panel.kind === "pending_change_panel"), "Pending change response must render pending panel.");
  assert(!pending.panels.some((panel: any) => panel.kind === "legacy_artifact_fallback"), "Pending gate2 content must not fall back to legacy artifact.");
  results.push({
    id: "UI-GT-C",
    result: "Passed",
    evidence: "Pending change rendered as a candidate patch without legacy fallback."
  });

  const reframe = buildPlan(normalize({
    reply: "候选重构",
    gate2: {
      requires_confirmation: true,
      confirmation_request: {
        confirmation_type: "approval",
        summary: "假设重构待确认",
        options: ["confirm", "reject", "defer"],
        default_action: "confirm",
        proposal_id: "proposal-3",
        evidence_refs: ["trace:3"]
      },
      reframe_candidate: {
        proposal_id: "proposal-3",
        current_assumption: "当前假设 A",
        new_evidence: ["evidence:1"],
        conflict: "现实结果与假设冲突",
        potential_impact: "需要调整假设",
        candidate_reframe: "候选假设 B",
        recommended_next_check: "复核关键证据",
        requires_human_confirmation: true
      },
      trace_id: "trace-reframe-1"
    }
  }));
  assert(reframe.panels.some((panel: any) => panel.kind === "reframe_candidate_notice"), "Reframe response must render candidate notice.");
  results.push({
    id: "UI-GT-D",
    result: "Passed",
    evidence: "Reframe candidate rendered as an explicit assumption-level notice."
  });

  const errorPlan = buildPlan(normalize({
    reply: "",
    errors: [
      { code: "CHAT_BACKEND_FALLBACK", message: "Backend unavailable", retryable: true, trace_id: "trace-error-1" }
    ]
  }));
  assert(errorPlan.panels.some((panel: any) => panel.kind === "error_banner"), "Error response must render error banner.");
  assert(errorPlan.panels.some((panel: any) => panel.kind === "trace_chip"), "Error response must keep trace chip.");
  results.push({
    id: "UI-GT-E",
    result: "Passed",
    evidence: "Error response rendered banner and trace chip with retryable state."
  });

  const gate2WithLegacy = buildPlan(normalize({
    reply: "候选确认",
    gate2: {
      requires_confirmation: true,
      confirmation_request: {
        confirmation_type: "approval",
        summary: "Gate 2 active",
        options: ["confirm", "reject", "defer"],
        default_action: "confirm",
        proposal_id: "proposal-4",
        evidence_refs: ["trace:4"]
      },
      trace_id: "trace-gate2-legacy-1"
    },
    legacy_artifact: {
      type: "next_action_card",
      title: "legacy artifact",
      status: "suggested"
    }
  }));
  assert(!gate2WithLegacy.panels.some((panel: any) => panel.kind === "legacy_artifact_fallback"), "Gate2 content must not be overridden by legacy artifact fallback.");
  results.push({
    id: "UI-GT-F",
    result: "Passed",
    evidence: "Gate 2 content stayed primary even when legacy artifact was present."
  });

  const legacyOnly = buildPlan(normalize({
    reply: "legacy only",
    legacy_artifact: {
      type: "next_action_card",
      title: "legacy artifact",
      status: "suggested"
    }
  }));
  assert(legacyOnly.panels.some((panel: any) => panel.kind === "legacy_artifact_fallback"), "Legacy-only response must render fallback card.");
  results.push({
    id: "UI-GT-G",
    result: "Passed",
    evidence: "Legacy artifact rendered only when gate2 was absent."
  });

  const binding = createBinding({
    user_id: "user_1",
    auth_session_id: "auth_1",
    conversation_id: "conv_1",
    message_id: "msg_1",
    run_id: "run_1",
    trace_id: "trace_1"
  });
  assert(binding.user_id === "user_1", "Binding must preserve user_id.");
  assert(binding.auth_session_id === "auth_1", "Binding must preserve auth_session_id.");
  assert(binding.conversation_id === "conv_1", "Binding must preserve conversation_id.");
  assert(binding.message_id === "msg_1", "Binding must preserve message_id.");
  assert(binding.run_id === "run_1", "Binding must preserve run_id.");
  assert(binding.trace_id === "trace_1", "Binding must preserve trace_id.");
  results.push({
    id: "UI-GT-H",
    result: "Passed",
    evidence: "Runtime binding preserved user, auth session, conversation, message, run, and trace identifiers."
  });

  return results;
}

function renderReport(results: TestResult[]): string {
  const rows = results.map((result) => `| ${result.id} | ${result.result} | ${result.evidence} |`).join("\n");
  return `# CP-ELIY-BETA2-GATE2-UI-ADAPTER-MINIMUM-IMPLEMENTATION-01 Final Report

## 1. Baseline

- Branch: spike/eliy-beta2-gate2-ui-adapter-minimum
- Baseline HEAD: f56fa9f
- Final HEAD: Pending commit
- Working tree: pending verification

## 2. Modification Summary

Implemented a minimal Gate 2 UI adapter layer in the webchat frontend, added stable /api/chat response envelope fields in the local backend app layer, and introduced contract-level tests for reply, confirmation, pending change, reframe candidate, error, trace, and legacy fallback behavior.

## 3. Files Modified

- frontend/webchat/gate2-adapter.js
- frontend/webchat/index.html
- frontend/webchat/login.html
- frontend/webchat/app.js
- frontend/webchat/styles.css
- eliy-kernel/runtime/server.js
- experiments/openai-agents-ts-runtime/src/eliy-beta2-gate2-ui-adapter-minimum-tests.ts
- experiments/openai-agents-ts-runtime/package.json

## 4. API Response Envelope

The adapter normalizes /api/chat into a stable envelope with reply, gate2, legacy_artifact, errors, trace_id, run_id, message_id, conversation_id, user_id, and auth_session_id. Legacy artifact payloads remain available only as fallback.

## 5. Gate 2 UI Adapter Coverage

- Gate2MessageAdapter: implemented as envelope normalization + render plan routing.
- Gate2ConfirmationPanel: implemented in app.js.
- Gate2PendingChangePanel: implemented in app.js.
- Gate2TraceChip: implemented in app.js.
- Gate2ErrorBanner: implemented in app.js.
- LegacyArtifactFallback: implemented as fallback only.

## 6. ID Binding

The implementation binds user_id, auth_session_id, conversation_id, message_id, run_id, and trace_id across client request, server response, and persisted local conversation history.

## 7. Legacy Artifact Fallback

Gate 2 responses win. Legacy artifact rendering only occurs when gate2 is absent or empty. Legacy status words do not overwrite Gate 2 confirmation semantics.

## 8. Fixtures and Tests

| Test | Result | Evidence |
|---|---|---|
${rows}

## 9. Validation Commands

- Pending execution: npm run typecheck
- Pending execution: npm run build
- Pending execution: npm run test:eliy-beta2-gate2-ui-adapter-minimum

## 10. Known Limits

This is a minimal adapter. It does not implement a full account system, a full cloud persistence layer, or a complete artifact platform.

## 11. Next Step

Run typecheck, build, and the new adapter test script, then inspect the webchat runtime behavior locally if needed.

## 12. Stop Point

- Files modified: Yes
- Branch created: Yes
- Commit: Pending
- Push: No
- Merge: No
- Deploy: No
- Model API: No
- UI shell introduced: No
- HAC Gate 2 core mechanism modified: No
- S'FOCUS Skill modified: No
- O'PDCA modified: No
- Current branch: spike/eliy-beta2-gate2-ui-adapter-minimum
- Current HEAD: Pending commit
- Working tree: pending verification
`;
}

async function main(): Promise<void> {
  await ensureDirs();
  const results = await runTests();
  await writeFile(
    join(reportsDir, "hac-eliy-beta2-gate2-ui-adapter-minimum-final-report.md"),
    renderReport(results),
    "utf8"
  );

  for (const result of results) {
    console.log(`${result.id}: ${result.result}`);
  }
  console.log("Eliy Beta 2.0 Gate 2 UI Adapter Minimum Implementation Passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
