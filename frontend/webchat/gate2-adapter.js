/*
 * Eliy Gate 2 UI Adapter
 * Plain script + global helper for browser runtime and local tests.
 */
(function initGate2Adapter(global) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isMeaningful(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
  }

  function toStringOrNull(value) {
    return isMeaningful(value) ? String(value) : null;
  }

  function normalizeError(error, index = 0) {
    if (!isObject(error)) {
      return {
        code: `ERROR_${index + 1}`,
        message: String(error ?? "Unknown error"),
        retryable: false,
        trace_id: null
      };
    }

    return {
      code: toStringOrNull(error.code) || `ERROR_${index + 1}`,
      message: toStringOrNull(error.message) || "Unknown error",
      retryable: !!error.retryable,
      trace_id: toStringOrNull(error.trace_id)
    };
  }

  function normalizeGate2Payload(gate2) {
    if (!isObject(gate2)) return null;

    const normalized = {
      requires_confirmation: !!gate2.requires_confirmation,
      confirmation_request: gate2.confirmation_request ?? null,
      proposed_state_patch: gate2.proposed_state_patch ?? null,
      reframe_candidate: gate2.reframe_candidate ?? null,
      trace_id: toStringOrNull(gate2.trace_id),
      eval_summary: gate2.eval_summary ?? null
    };

    const hasMeaningfulContent =
      normalized.requires_confirmation ||
      isMeaningful(normalized.confirmation_request) ||
      isMeaningful(normalized.proposed_state_patch) ||
      isMeaningful(normalized.reframe_candidate) ||
      isMeaningful(normalized.eval_summary);

    if (!hasMeaningfulContent && !normalized.trace_id) return null;
    return clone(normalized);
  }

  function normalizeChatResponseEnvelope(raw = {}, context = {}) {
    const gate2 = normalizeGate2Payload(raw.gate2);
    const legacyArtifact = raw.legacy_artifact ?? raw.artifact ?? null;
    const traceId =
      gate2?.trace_id ||
      toStringOrNull(raw.trace_id) ||
      toStringOrNull(context.trace_id) ||
      null;
    const runId = toStringOrNull(raw.run_id) || toStringOrNull(context.run_id);
    const messageId = toStringOrNull(raw.message_id) || toStringOrNull(context.message_id);
    const conversationId =
      toStringOrNull(raw.conversation_id) ||
      toStringOrNull(context.conversation_id);
    const userId = toStringOrNull(raw.user_id) || toStringOrNull(context.user_id);
    const authSessionId =
      toStringOrNull(raw.auth_session_id) ||
      toStringOrNull(context.auth_session_id);

    return {
      reply: toStringOrNull(raw.reply) || "",
      gate2,
      legacy_artifact: legacyArtifact ? clone(legacyArtifact) : null,
      errors: Array.isArray(raw.errors) ? raw.errors.map((item, index) => normalizeError(item, index)) : [],
      trace_id: traceId,
      run_id: runId,
      message_id: messageId,
      conversation_id: conversationId,
      user_id: userId,
      auth_session_id: authSessionId
    };
  }

  function createChatRuntimeBinding(input = {}) {
    const now = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const conversationId = toStringOrNull(input.conversation_id) || `conv_${now}_${random}`;
    const messageId = toStringOrNull(input.message_id) || `msg_${now}_${random}`;
    const runId = toStringOrNull(input.run_id) || `run_${now}_${random}`;
    const traceId = toStringOrNull(input.trace_id) || `trace_${now}_${random}`;

    return {
      user_id: toStringOrNull(input.user_id) || null,
      auth_session_id: toStringOrNull(input.auth_session_id) || null,
      conversation_id: conversationId,
      message_id: messageId,
      run_id: runId,
      trace_id: traceId
    };
  }

  function buildGate2RenderPlan(envelope = {}) {
    const normalized = normalizeChatResponseEnvelope(envelope);
    const gate2 = normalized.gate2;
    const traceId =
      gate2?.trace_id ||
      normalized.trace_id ||
      normalized.errors.find((item) => isMeaningful(item.trace_id))?.trace_id ||
      null;
    const hasGate2Content = !!(
      gate2 &&
      (
        gate2.requires_confirmation ||
        isMeaningful(gate2.confirmation_request) ||
        isMeaningful(gate2.proposed_state_patch) ||
        isMeaningful(gate2.reframe_candidate) ||
        isMeaningful(gate2.eval_summary)
      )
    );

    const panels = [];

    if (normalized.errors.length > 0) {
      panels.push({
        kind: "error_banner",
        errors: clone(normalized.errors)
      });
    }

    if (hasGate2Content && gate2?.requires_confirmation) {
      panels.push({
        kind: "confirmation_panel",
        requires_confirmation: true,
        confirmation_request: gate2.confirmation_request ?? null,
        trace_id: traceId
      });
    }

    if (hasGate2Content && isMeaningful(gate2?.proposed_state_patch)) {
      panels.push({
        kind: "pending_change_panel",
        proposed_state_patch: clone(gate2.proposed_state_patch),
        confirmation_request: gate2?.confirmation_request ?? null
      });
    }

    if (hasGate2Content && isMeaningful(gate2?.reframe_candidate)) {
      panels.push({
        kind: "reframe_candidate_notice",
        reframe_candidate: clone(gate2.reframe_candidate),
        confirmation_request: gate2?.confirmation_request ?? null
      });
    }

    if (traceId) {
      panels.push({
        kind: "trace_chip",
        trace_id: traceId
      });
    }

    if (!hasGate2Content && normalized.legacy_artifact) {
      panels.push({
        kind: "legacy_artifact_fallback",
        legacy_artifact: clone(normalized.legacy_artifact)
      });
    }

    return {
      ...normalized,
      trace_id: traceId,
      has_gate2_content: hasGate2Content,
      panels
    };
  }

  const api = {
    normalizeChatResponseEnvelope,
    createChatRuntimeBinding,
    buildGate2RenderPlan
  };

  global.EliyGate2Adapter = api;
  if (typeof window !== "undefined") {
    window.EliyGate2Adapter = api;
  }
})(globalThis);
