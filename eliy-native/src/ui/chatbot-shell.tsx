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
        text: "Eliy 已准备好。中央对话区目前使用本地确定性 Mock 消息。",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "你可以在下方输入区继续追加一轮 Mock 回复，右侧独立工作区会继续保持分离。",
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

const workspacePanelStyle: CSSProperties = {
  ...panelStyle,
  borderColor: "rgba(148, 163, 184, 0.12)",
  background: "rgba(8, 15, 28, 0.66)",
  boxShadow: "0 14px 36px rgba(2, 6, 23, 0.24)",
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

const workspaceSectionStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  paddingTop: "12px",
  borderTop: "1px solid rgba(148, 163, 184, 0.12)",
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
  gap: "4px",
  margin: "14px 0 0",
  padding: 0,
  listStyle: "none",
};

const navButtonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "10px",
  border: "1px solid transparent",
  borderRadius: "12px",
  background: "transparent",
  color: "#edf2ff",
  padding: "10px 12px",
  fontSize: "14px",
  textAlign: "left",
  cursor: "pointer",
};

const navButtonAccentStyle: CSSProperties = {
  borderColor: "rgba(124, 145, 255, 0.22)",
  background: "rgba(63, 94, 251, 0.12)",
};

const navIconStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.2em",
  color: "#c9d5f5",
  flex: "0 0 auto",
};

const navLabelStyle: CSSProperties = {
  flex: "1 1 auto",
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
  gap: "10px",
  width: "100%",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "18px",
  background: "rgba(15, 23, 42, 0.8)",
  padding: "14px",
};

const composerFieldStyle: CSSProperties = {
  width: "100%",
  minHeight: "108px",
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
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "12px",
};

const composerMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  minWidth: 0,
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

const composerPlusStyle: CSSProperties = {
  width: "34px",
  height: "34px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#ced8ef",
  fontSize: "18px",
  lineHeight: 1,
  cursor: "not-allowed",
  opacity: 0.72,
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
  const normalized = userText.trim() || "空输入";
  return `Eliy：收到你的本地 Mock 提示「${normalized}」。工作区保持独立，输出保持确定性。`;
}

type ChatRole = "assistant" | "user";

type ShellMessage = {
  role: ChatRole;
  body: string;
};

type WorkspaceNavItem = {
  id: string;
  icon: string;
  label: string;
  active?: boolean;
  onSelect?: () => void;
};

function getMessageRoleLabel(role: ChatRole): string {
  return role === "user" ? "你" : "Eliy";
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
        aria-label="本地 Mock 输入"
        data-testid="composer-input"
        placeholder="输入一段本地 Mock 提示"
        style={composerFieldStyle}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div style={composerActionsStyle}>
        <div style={composerMetaStyle}>
          <button
            type="button"
            data-testid="composer-plus"
            aria-label="附件入口占位，尚未启用"
            title="附件占位，尚未启用"
            style={composerPlusStyle}
            disabled
          >
            +
          </button>
          <span style={chipStyle}>本地 Mock 模式</span>
        </div>
        <button
          type="button"
          data-testid="composer-send"
          style={primaryButtonStyle}
          disabled={text.trim().length === 0}
          onClick={send}
        >
          发送 Mock
        </button>
      </div>
    </div>
  );
}

const initialShellMessages: ShellMessage[] = [
  {
    role: "assistant",
    body: "Eliy 已准备好。中央对话区目前使用本地确定性 Mock 消息。",
  },
  {
    role: "assistant",
    body: "你可以在下方输入区继续追加一轮 Mock 回复，右侧独立工作区会继续保持分离。",
  },
];

function LeftWorkspacePanel({
  onResetThread,
}: {
  onResetThread: () => void;
}) {
  const workspaceItems: WorkspaceNavItem[] = [
    { id: "new-chat", icon: "＋", label: "新聊天", active: true, onSelect: onResetThread },
    { id: "search", icon: "⌕", label: "搜索" },
    { id: "knowledge-base", icon: "◇", label: "知识库" },
    { id: "scheduled", icon: "✓", label: "已安排" },
    { id: "apps", icon: "▦", label: "应用" },
    { id: "more", icon: "…", label: "更多" },
    { id: "pinned", icon: "★", label: "已置顶" },
    { id: "projects", icon: "▣", label: "项目" },
    { id: "recent-history", icon: "◷", label: "最近 / 历史" },
    { id: "user-settings", icon: "⚙", label: "用户 / 设置" },
  ];

  return (
    <aside data-testid="left-workspace" style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={headingStyle}>工作区</p>
          <h1 style={titleStyle}>Eliy Native</h1>
        </div>
        <span style={chipStyle}>Mock</span>
      </div>
      <div style={panelBodyStyle}>
        <p style={mutedTextStyle}>
          轻量导航仅作为本地壳层占位，和对话内容、OTUnit 工作区保持分离。
        </p>
        <ul style={navListStyle} aria-label="工作区导航">
          {workspaceItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`workspace-item-${item.id}`}
                data-active={item.active ? "true" : undefined}
                aria-current={item.active ? "page" : undefined}
                style={item.active ? { ...navButtonStyle, ...navButtonAccentStyle } : navButtonStyle}
                onClick={item.onSelect}
              >
                <span aria-hidden="true" data-testid={`workspace-icon-${item.id}`} style={navIconStyle}>
                  {item.icon}
                </span>
                <span style={navLabelStyle}>{item.label}</span>
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
          <p style={headingStyle}>对话</p>
          <h2 style={titleStyle}>Eliy Native 对话预览</h2>
        </div>
        <span data-testid="message-count" style={chipStyle}>
          {visibleMessages.length} 条消息
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
  const sections = [
    {
      title: "OTUnit 工作区",
      body: "用于结构化 OTUnit 复核、状态和下一步元信息的占位区域。",
    },
    {
      title: "工件工作区",
      body: "用于承载必须保持在普通消息气泡之外的工件占位区域。",
    },
    {
      title: "工作区备注",
      body: "这个壳层通过布局把对话内容和工件表面隔离开，而不是混入聊天内容。",
    },
  ];

  return (
    <aside data-testid="artifact-workspace" style={workspacePanelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={headingStyle}>工件 / OTUnit</p>
          <h2 style={titleStyle}>独立工作区</h2>
        </div>
        <span style={chipStyle}>分离</span>
      </div>
      <div style={{ ...panelBodyStyle, display: "grid", gap: "14px" }}>
        {sections.map((section, index) => (
          <div
            key={section.title}
            data-testid={index === 0 ? "otunit-workspace" : undefined}
            style={index === 0 ? { ...workspaceSectionStyle, borderTop: "none", paddingTop: 0 } : workspaceSectionStyle}
          >
            <p style={headingStyle}>{section.title}</p>
            <p style={mutedTextStyle}>{section.body}</p>
          </div>
        ))}
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
