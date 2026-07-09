import {
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useState, type CSSProperties } from "react";

export const initialMockThreadMessages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Eliy shell ready. The center thread is driven by deterministic mock messages.",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Use the composer below to append another mock response while the Artifact / OTUnit workspace stays separate from the thread.",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
];

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "24px",
  boxSizing: "border-box",
  overflowX: "hidden",
  color: "#e8eefc",
  background:
    "radial-gradient(circle at top left, rgba(98, 126, 255, 0.22), transparent 34%), linear-gradient(180deg, #09111f 0%, #0f1726 100%)",
  fontFamily:
    '"IBM Plex Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr) minmax(0, 336px)",
  gap: "16px",
  alignItems: "stretch",
  minHeight: "calc(100vh - 48px)",
  minWidth: 0,
};

const panelStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "24px",
  background: "rgba(8, 15, 28, 0.82)",
  boxShadow: "0 20px 60px rgba(2, 6, 23, 0.38)",
  backdropFilter: "blur(18px)",
  overflow: "hidden",
  minWidth: 0,
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 18px 14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
};

const panelBodyStyle: CSSProperties = {
  padding: "16px 18px 18px",
};

const sectionCardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "18px",
  background: "rgba(15, 23, 42, 0.72)",
  padding: "14px",
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9fb0d0",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  lineHeight: 1.2,
  color: "#f8fbff",
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: "#b7c3dd",
  lineHeight: 1.6,
  fontSize: "13px",
};

const navListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  margin: "14px 0 0",
  padding: 0,
  listStyle: "none",
};

const navButtonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "14px",
  background: "rgba(15, 23, 42, 0.62)",
  color: "#edf2ff",
  padding: "12px 14px",
  fontSize: "14px",
  textAlign: "left",
  cursor: "pointer",
};

const navButtonAccentStyle: CSSProperties = {
  borderColor: "rgba(124, 145, 255, 0.42)",
  background: "rgba(63, 94, 251, 0.14)",
};

const threadViewportStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: "12px",
  padding: "18px",
  overflowY: "auto",
  overflowX: "hidden",
  minHeight: 0,
  minWidth: 0,
  flex: "1 1 auto",
};

const messageCardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.12)",
  borderRadius: "16px",
  background: "rgba(10, 16, 30, 0.84)",
  padding: "14px 16px",
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
};

const messageTextStyle: CSSProperties = {
  margin: 0,
  color: "#edf2ff",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const composerStyle: CSSProperties = {
  borderTop: "1px solid rgba(148, 163, 184, 0.12)",
  padding: "14px 18px 18px",
  background: "rgba(6, 11, 22, 0.62)",
  flex: "0 0 auto",
};

const composerSurfaceStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  width: "100%",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "18px",
  background: "rgba(15, 23, 42, 0.8)",
  padding: "14px",
};

const composerFieldStyle: CSSProperties = {
  width: "100%",
  minHeight: "112px",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "14px",
  background: "rgba(3, 7, 18, 0.88)",
  color: "#f8fbff",
  padding: "12px 14px",
  boxSizing: "border-box",
  resize: "vertical",
  font: "inherit",
  outline: "none",
  overflowWrap: "anywhere",
};

const composerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const primaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(99, 102, 241, 0.4)",
  background: "linear-gradient(180deg, rgba(99, 102, 241, 0.92), rgba(79, 70, 229, 0.92))",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "999px",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#cdd8ef",
  fontSize: "12px",
  padding: "8px 10px",
};

export function buildMockAssistantReply(userText: string): string {
  const normalized = userText.trim() || "empty input";
  return `Mock assistant reply: ${normalized} | workspace shell stable | deterministic`;
}

type ChatRole = "assistant" | "user";

type ShellMessage = {
  role: ChatRole;
  body: string;
};

function getMessageRoleLabel(role: ChatRole): string {
  return role === "user" ? "You" : "Assistant";
}

function getMessageCardStyle(role: ChatRole): CSSProperties {
  return {
    ...messageCardStyle,
    background:
      role === "user"
        ? "linear-gradient(180deg, rgba(37, 99, 235, 0.18), rgba(15, 23, 42, 0.9))"
        : "rgba(10, 16, 30, 0.84)",
    borderColor:
      role === "user" ? "rgba(96, 165, 250, 0.28)" : "rgba(148, 163, 184, 0.12)",
    justifySelf: role === "user" ? "end" : "start",
    maxWidth: "min(92%, 760px)",
  };
}

function ShellComposer({
  onSend,
}: {
  onSend: (userText: string) => void;
}) {
  const [text, setText] = useState("");

  const send = () => {
    const userText = text.trim();
    if (!userText) {
      return;
    }

    onSend(userText);
    setText("");
  };

  return (
    <div data-testid="composer-shell" style={composerSurfaceStyle}>
      <textarea
        aria-label="Chat composer"
        data-testid="composer-input"
        placeholder="Type a mock prompt"
        style={composerFieldStyle}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div style={composerActionsStyle}>
        <span style={chipStyle}>Deterministic mock submit</span>
        <button
          type="button"
          data-testid="composer-send"
          style={primaryButtonStyle}
          disabled={text.trim().length === 0}
          onClick={send}
        >
          Send mock
        </button>
      </div>
    </div>
  );
}

const initialShellMessages: ShellMessage[] = [
  {
    role: "assistant",
    body: "Eliy shell ready. The center thread is driven by deterministic mock messages.",
  },
  {
    role: "assistant",
    body: "Use the composer below to append another mock response while the Artifact / OTUnit workspace stays separate from the thread.",
  },
];

function LeftWorkspacePanel({
  onResetThread,
}: {
  onResetThread: () => void;
}) {
  const workspaceItems = [
    "New Chat",
    "Search",
    "Knowledge",
    "Tasks",
    "Skills / Apps",
    "Pinned",
    "Projects",
    "Recent / History",
    "User / Settings",
  ];

  return (
    <aside data-testid="left-workspace" style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={headingStyle}>Workspace</p>
          <h1 style={titleStyle}>Eliy Native</h1>
        </div>
        <span style={chipStyle}>Mock</span>
      </div>
      <div style={panelBodyStyle}>
        <p style={mutedTextStyle}>
          Navigation is a placeholder shell only. It stays separate from chat
          messages and the OTUnit workspace.
        </p>
        <ul style={navListStyle} aria-label="workspace navigation">
          {workspaceItems.map((item) => (
            <li key={item}>
              <button
                type="button"
                data-testid={`workspace-item-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                style={item === "New Chat" ? { ...navButtonStyle, ...navButtonAccentStyle } : navButtonStyle}
                onClick={() => {
                  if (item === "New Chat") {
                    onResetThread();
                  }
                }}
              >
                <span>{item}</span>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function ChatThreadPanel({
  messages,
  onSend,
}: {
  messages: readonly ShellMessage[];
  onSend: (userText: string) => void;
}) {
  const visibleMessages = messages.map((message, index) => ({
    ...message,
    key: `${message.role}-${message.body.slice(0, 24)}-${index}`,
  }));

  return (
    <section
      data-testid="chat-thread-shell"
      style={{
        ...panelStyle,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={panelHeaderStyle}>
        <div>
          <p style={headingStyle}>Chat Thread</p>
          <h2 style={titleStyle}>Deterministic shell preview</h2>
        </div>
        <span data-testid="message-count" style={chipStyle}>
          {visibleMessages.length} messages
        </span>
      </div>
      <div data-testid="chat-thread" style={threadViewportStyle}>
        {visibleMessages.map((message) => (
          <article
            key={message.key}
            data-testid="chat-message"
            style={getMessageCardStyle(message.role)}
          >
            <p style={headingStyle}>{getMessageRoleLabel(message.role)}</p>
            <p style={messageTextStyle}>{message.body}</p>
          </article>
        ))}
      </div>
      <div style={composerStyle}>
        <ShellComposer onSend={onSend} />
      </div>
    </section>
  );
}

function ArtifactWorkspacePanel() {
  return (
    <aside data-testid="artifact-workspace" style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={headingStyle}>Artifact / OTUnit</p>
          <h2 style={titleStyle}>Independent workspace</h2>
        </div>
        <span style={chipStyle}>Separate</span>
      </div>
      <div style={{ ...panelBodyStyle, display: "grid", gap: "14px" }}>
        <div data-testid="otunit-workspace" style={sectionCardStyle}>
          <p style={headingStyle}>OTUnit workspace</p>
          <p style={mutedTextStyle}>
            Placeholder area for structured OTUnit review, status, and next-step
            metadata.
          </p>
        </div>
        <div style={sectionCardStyle}>
          <p style={headingStyle}>Artifact workspace</p>
          <p style={mutedTextStyle}>
            Placeholder area for artifacts that must stay outside normal
            message bubbles.
          </p>
        </div>
        <div style={sectionCardStyle}>
          <p style={headingStyle}>Workspace notes</p>
          <p style={mutedTextStyle}>
            This shell keeps thread content and artifact surfaces isolated by
            layout, not by chat content.
          </p>
        </div>
      </div>
    </aside>
  );
}

function ShellViewport() {
  const [messages, setMessages] = useState<ShellMessage[]>(initialShellMessages);

  const resetThread = () => {
    setMessages(initialShellMessages);
  };

  const appendMockTurn = (userText: string) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        body: userText,
      },
      {
        role: "assistant",
        body: buildMockAssistantReply(userText),
      },
    ]);
  };

  return (
    <main style={shellStyle}>
      <div style={gridStyle}>
        <LeftWorkspacePanel onResetThread={resetThread} />
        <ChatThreadPanel messages={messages} onSend={appendMockTurn} />
        <ArtifactWorkspacePanel />
      </div>
    </main>
  );
}

export function AssistantUiChatbotShell() {
  return <ShellViewport />;
}
