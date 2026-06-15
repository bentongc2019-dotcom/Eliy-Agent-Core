import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type AppendMessage,
  type RespondToToolApprovalOptions,
  type ThreadMessage,
  type ToolCallMessagePartProps,
  useExternalStoreRuntime
} from "@assistant-ui/react";
import "./styles.css";

type Decision = "pending" | "approved" | "denied" | "modified";
type RunState = "idle" | "running" | "interrupted" | "failed" | "recovered";
type ArtifactStatus = "proposed" | "pending_user_confirmation" | "accepted" | "frozen";

type ToolArgs = {
  task: string;
  riskLevel: "low" | "medium" | "high";
  requiresHumanAgency: boolean;
  version: number;
};

type LedgerEvent = {
  id: number;
  type: string;
  detail: string;
};

const startedAt = new Date("2026-06-15T00:00:00.000Z");

const initialArgs: ToolArgs = {
  task: "review_reference_client_boundary",
  riskLevel: "medium",
  requiresHumanAgency: true,
  version: 1
};

function textPart(text: string) {
  return { type: "text" as const, text };
}

function metadata(custom: Record<string, unknown> = {}) {
  return {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom
  };
}

function makeUserMessage(text: string, id = "user-seeded"): ThreadMessage {
  return {
    id,
    role: "user",
    createdAt: startedAt,
    content: [textPart(text)],
    attachments: [],
    metadata: { custom: {} }
  };
}

function makeAssistantMessage(args: ToolArgs, options: {
  text: string;
  decision: Decision;
  runState: RunState;
  artifactStatus: ArtifactStatus;
  failure?: string;
}): ThreadMessage {
  const approval =
    options.decision === "approved"
      ? { id: `approval-${args.version}`, approved: true, reason: "Approved by explicit user action." }
      : options.decision === "denied"
        ? { id: `approval-${args.version}`, approved: false, reason: "Denied by explicit user action." }
        : { id: `approval-${args.version}` };

  const status =
    options.runState === "failed"
      ? { type: "incomplete" as const, reason: "error" as const, error: options.failure ?? "mock runtime failure" }
      : options.runState === "interrupted"
        ? { type: "requires-action" as const, reason: "interrupt" as const }
        : options.decision === "pending" || options.decision === "modified"
          ? { type: "requires-action" as const, reason: "tool-calls" as const }
          : { type: "complete" as const, reason: "stop" as const };

  return {
    id: "assistant-mock-run",
    role: "assistant",
    createdAt: startedAt,
    status,
    content: [
      textPart(options.text),
      {
        type: "tool-call" as const,
        toolCallId: `tool-${args.version}`,
        toolName: "request_human_decision",
        args,
        argsText: JSON.stringify(args, null, 2),
        approval,
        interrupt: { type: "human" as const, payload: { reason: "human decision required" } }
      },
      {
        type: "data" as const,
        name: "artifact",
        data: {
          type: "structured_result",
          status: options.artifactStatus,
          title: "HAC-Agent Reference Client artifact",
          source: "local_mock_event_stream"
        }
      }
    ],
    metadata: metadata({ runState: options.runState })
  };
}

function eventText(event: LedgerEvent) {
  return `${event.type}: ${event.detail}`;
}

function HumanDecisionTool(part: ToolCallMessagePartProps<ToolArgs, unknown>) {
  const [draft, setDraft] = useState(JSON.stringify(part.args, null, 2));
  const resolved = part.approval?.approved !== undefined || Boolean(part.approval?.resolution);
  const status = resolved ? (part.approval?.approved ? "approved" : "denied") : "pending";

  useEffect(() => {
    setDraft(JSON.stringify(part.args, null, 2));
  }, [part.args]);

  return (
    <section className="tool-card" data-testid="tool-request">
      <header>
        <span>Tool Request</span>
        <strong data-testid="tool-name">{part.toolName}</strong>
      </header>
      <pre data-testid="tool-args">{JSON.stringify(part.args, null, 2)}</pre>
      <p data-testid="tool-status">Tool status: {status}</p>
      <textarea
        aria-label="Modify structured tool arguments"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="button-row">
        <button
          type="button"
          data-testid="approve-button"
          disabled={resolved}
          onClick={() => part.respondToApproval({ approved: true, reason: "User approved once." })}
        >
          Approve
        </button>
        <button
          type="button"
          data-testid="deny-button"
          disabled={resolved}
          onClick={() => part.respondToApproval({ approved: false, reason: "User denied once." })}
        >
          Deny
        </button>
        <button
          type="button"
          data-testid="modify-button"
          disabled={resolved}
          onClick={() => {
            const parsed = JSON.parse(draft) as ToolArgs;
            part.resume({ type: "structured_modify", args: parsed });
          }}
        >
          Modify
        </button>
      </div>
    </section>
  );
}

function ArtifactPart({ data }: { data: { status: ArtifactStatus; title: string; source: string } }) {
  return (
    <section className="artifact-panel" data-testid="artifact-panel">
      <header>
        <span>Artifact</span>
        <strong>{data.title}</strong>
      </header>
      <p data-testid="artifact-status">Status: {data.status}</p>
      <p>Source: {data.source}</p>
    </section>
  );
}

function MessageView() {
  return (
    <MessagePrimitive.Root className="message" data-testid="thread-message">
      <MessagePrimitive.Parts
        components={{
          Text: ({ text }) => <p className="message-text">{text}</p>,
          tools: {
            by_name: {
              request_human_decision: HumanDecisionTool
            }
          },
          data: {
            by_name: {
              artifact: ({ data }) => <ArtifactPart data={data as { status: ArtifactStatus; title: string; source: string }} />
            }
          }
        }}
      />
    </MessagePrimitive.Root>
  );
}

function ProofApp() {
  const [toolArgs, setToolArgs] = useState(initialArgs);
  const [decision, setDecision] = useState<Decision>("pending");
  const [runState, setRunState] = useState<RunState>("running");
  const [artifactStatus, setArtifactStatus] = useState<ArtifactStatus>("proposed");
  const [streamText, setStreamText] = useState("Local mock stream:");
  const [events, setEvents] = useState<LedgerEvent[]>([
    { id: 1, type: "thread_started", detail: "assistant-ui external-store runtime mounted." },
    { id: 2, type: "message", detail: "Seeded user message is visible." },
    { id: 3, type: "run_started", detail: "Local mock run started without Assistant Cloud." },
    { id: 4, type: "tool_requested", detail: "request_human_decision awaits explicit human input." },
    { id: 5, type: "artifact_proposed", detail: "Artifact status is proposed from mock runtime input." }
  ]);
  const nextEventId = useRef(6);
  const sentDecisions = useRef(new Set<string>());
  const rerenderCount = useRef(0);
  rerenderCount.current += 1;

  const appendEvent = useCallback((type: string, detail: string) => {
    setEvents((current) => [...current, { id: nextEventId.current++, type, detail }]);
  }, []);

  useEffect(() => {
    const chunks = [
      " assistant-ui external-store runtime is active;",
      " structured tool approval is pending;",
      " no Assistant Cloud or real model is used."
    ];
    const timers = chunks.map((chunk, index) =>
      window.setTimeout(() => {
        setStreamText((current) => `${current}${chunk}`);
        appendEvent("stream_delta", chunk.trim());
      }, 200 + index * 180)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [appendEvent]);

  const messages = useMemo<ThreadMessage[]>(
    () => [
      makeUserMessage("Please validate the HAC-Agent Reference Client boundary with assistant-ui."),
      makeAssistantMessage(toolArgs, {
        text: streamText,
        decision,
        runState,
        artifactStatus,
        failure: "Mock runtime pushed a recoverable failure."
      })
    ],
    [artifactStatus, decision, runState, streamText, toolArgs]
  );

  const adapter = useMemo(
    () => ({
      messages,
      isRunning: runState === "running",
      state: { runState, artifactStatus },
      onNew: async (message: AppendMessage) => {
        appendEvent("message", `User submitted: ${JSON.stringify(message.content)}`);
      },
      onRespondToToolApproval: async (options: RespondToToolApprovalOptions) => {
        const key = `approval:${options.approvalId}`;
        if (sentDecisions.current.has(key)) {
          appendEvent("duplicate_blocked", `Ignored duplicate approval ${options.approvalId}.`);
          return;
        }
        sentDecisions.current.add(key);
        const approved = options.approved === true;
        setDecision(approved ? "approved" : "denied");
        setRunState("recovered");
        appendEvent(approved ? "human_approved" : "human_denied", JSON.stringify(options));
        appendEvent("run_resumed", "Run resumed after approval decision.");
      },
      onResumeToolCall: (options: { toolCallId: string; payload: unknown }) => {
        const key = `modify:${options.toolCallId}`;
        if (sentDecisions.current.has(key)) {
          appendEvent("duplicate_blocked", `Ignored duplicate modify ${options.toolCallId}.`);
          return;
        }
        sentDecisions.current.add(key);
        const payload = options.payload as { type: string; args: ToolArgs };
        const nextArgs = { ...payload.args, version: toolArgs.version + 1 };
        setToolArgs(nextArgs);
        setDecision("modified");
        setRunState("interrupted");
        appendEvent("human_modified", JSON.stringify({ original: toolArgs, next: nextArgs }));
        appendEvent("human_confirmation_requested", `Tool args v${nextArgs.version} pending.`);
      },
      onCancel: async () => {
        setRunState("interrupted");
        appendEvent("run_interrupted", "Composer cancellation interrupted the mock run.");
      },
      onReload: async () => {
        setRunState("running");
        appendEvent("run_resumed", "Reload resumed mock run state.");
      }
    }),
    [appendEvent, artifactStatus, messages, runState, toolArgs]
  );

  const runtime = useExternalStoreRuntime(adapter);

  useEffect(() => {
    Object.assign(window, {
      __HAC_ASSISTANT_UI_PROOF__: {
        events,
        decision,
        runState,
        artifactStatus,
        rerenderCount: rerenderCount.current
      }
    });
  }, [artifactStatus, decision, events, runState]);

  const triggerInterrupt = () => {
    setRunState("interrupted");
    appendEvent("run_interrupted", "Mock runtime pushed run_interrupted.");
  };

  const resumeRun = () => {
    setRunState("running");
    appendEvent("run_resumed", "Mock runtime pushed run_resumed.");
  };

  const failRun = () => {
    setRunState("failed");
    appendEvent("run_failed", "Mock runtime pushed a recoverable failure.");
  };

  const recoverRun = () => {
    setRunState("recovered");
    appendEvent("run_resumed", "Mock runtime recovered without replaying decisions.");
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="shell">
        <header className="topbar">
          <div>
            <p>assistant-ui Reference Client Proof</p>
            <h1>HAC-Agent Open-source Boundary</h1>
          </div>
          <strong data-testid="run-state">{runState}</strong>
        </header>

        <section className="workspace">
          <ThreadPrimitive.Root className="thread" data-testid="thread-root">
            <ThreadPrimitive.Viewport className="thread-viewport">
              <ThreadPrimitive.Messages>
                {() => <MessageView />}
              </ThreadPrimitive.Messages>
            </ThreadPrimitive.Viewport>
            <ComposerPrimitive.Root className="composer">
              <ComposerPrimitive.Input placeholder="Local mock composer" />
              <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.Root>

          <aside className="controller" data-testid="mock-controller">
            <h2>Local Mock Controller</h2>
            <p data-testid="decision-state">Decision: {decision}</p>
            <p data-testid="rerender-count">Renders: {rerenderCount.current}</p>
            <div className="button-grid">
              <button type="button" data-testid="interrupt-button" onClick={triggerInterrupt}>Interrupt</button>
              <button type="button" data-testid="resume-button" onClick={resumeRun}>Resume</button>
              <button type="button" data-testid="fail-button" onClick={failRun}>Fail</button>
              <button type="button" data-testid="recover-button" onClick={recoverRun}>Recover</button>
            </div>
            <label>
              Artifact runtime status
              <select
                data-testid="artifact-select"
                value={artifactStatus}
                onChange={(event) => {
                  const next = event.target.value as ArtifactStatus;
                  setArtifactStatus(next);
                  appendEvent("artifact_proposed", `Artifact status set by mock runtime to ${next}.`);
                }}
              >
                <option value="proposed">proposed</option>
                <option value="pending_user_confirmation">pending_user_confirmation</option>
                <option value="accepted">accepted</option>
                <option value="frozen">frozen</option>
              </select>
            </label>
            <ol data-testid="event-ledger">
              {events.map((event) => (
                <li key={event.id}>
                  <code>{eventText(event)}</code>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </main>
    </AssistantRuntimeProvider>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <React.StrictMode>
    <ProofApp />
  </React.StrictMode>
);
