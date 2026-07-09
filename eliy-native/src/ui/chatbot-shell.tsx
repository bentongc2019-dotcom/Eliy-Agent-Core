import { type ThreadMessageLike } from "@assistant-ui/react";
import { useEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

type ChatRole = "assistant" | "user";

type ShellMessage = {
  role: ChatRole;
  body: string;
};

type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
  project: string;
  archived: boolean;
  deleted: boolean;
  messages: ShellMessage[];
};

type ShellState = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  lastActionFeedback: string;
  composerFeedback: string;
};

type WorkspaceNavItem = {
  id: string;
  icon: string;
  label: string;
  active?: boolean;
  onSelect?: () => void;
};

const MOCK_PROJECT_LABEL = "Mock 项目";

const initialConversationTemplate: readonly ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Eliy：这是 O'PDCA 体验客户访谈的本地 Mock 对话。",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "你可以在这里查看下一步行动，并保持右侧工件区独立。",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
];

export const initialMockThreadMessages: ThreadMessageLike[] = [...initialConversationTemplate];

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
  gridTemplateColumns: "minmax(0, 300px) minmax(0, 1fr) minmax(0, 336px)",
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
  gap: "12px",
  padding: "18px 18px 14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
};

const panelBodyStyle: CSSProperties = {
  padding: "16px 18px 18px",
};

const sectionStackStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  marginTop: "16px",
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  background: "rgba(6, 11, 22, 0.5)",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const sectionListStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const projectGroupStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const projectChipWrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const feedbackBannerStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(96, 165, 250, 0.24)",
  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(10, 16, 30, 0.92))",
  color: "#eef4ff",
  boxShadow: "inset 0 0 0 1px rgba(96, 165, 250, 0.08)",
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
  border: "1px solid rgba(124, 145, 255, 0.22)",
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

const conversationCardStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  borderRadius: "16px",
  background: "rgba(10, 16, 30, 0.84)",
  padding: "12px",
};

const conversationCardSelectedStyle: CSSProperties = {
  border: "1px solid rgba(124, 145, 255, 0.36)",
  background: "rgba(18, 27, 52, 0.92)",
  boxShadow: "0 14px 30px rgba(37, 99, 235, 0.16)",
};

const conversationSelectStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  width: "100%",
  border: "1px solid rgba(148, 163, 184, 0.08)",
  borderRadius: "14px",
  background: "rgba(3, 7, 18, 0.38)",
  color: "#edf2ff",
  padding: "12px 12px 10px",
  textAlign: "left",
  cursor: "pointer",
};

const conversationTitleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const conversationTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: "#f8fbff",
  lineHeight: 1.45,
};

const conversationMetaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const conversationActionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  position: "relative",
  zIndex: 1,
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

const actionButtonStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#cdd8ef",
  fontSize: "12px",
  padding: "8px 10px",
  cursor: "pointer",
};

const selectedActionButtonStyle: CSSProperties = {
  border: "1px solid rgba(99, 102, 241, 0.34)",
  color: "#eef2ff",
  background: "rgba(63, 94, 251, 0.18)",
};

const selectedConversationBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid rgba(96, 165, 250, 0.32)",
  background: "rgba(37, 99, 235, 0.18)",
  color: "#dbeafe",
  fontSize: "12px",
  padding: "4px 8px",
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

const composerFeedbackStyle: CSSProperties = {
  border: "1px solid rgba(96, 165, 250, 0.2)",
  borderRadius: "14px",
  background: "rgba(15, 23, 42, 0.74)",
  color: "#dbeafe",
  fontSize: "13px",
  lineHeight: 1.5,
  padding: "10px 12px",
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

const projectChipStyle: CSSProperties = {
  ...chipStyle,
  background: "rgba(17, 24, 39, 0.92)",
};

const emptyStateStyle: CSSProperties = {
  border: "1px dashed rgba(148, 163, 184, 0.2)",
  borderRadius: "16px",
  padding: "16px",
  color: "#b7c3dd",
  background: "rgba(3, 7, 18, 0.42)",
};

function createShellMessage(role: ChatRole, body: string): ShellMessage {
  return { role, body };
}

function createConversation(
  id: string,
  title: string,
  project: string,
  pinned: boolean,
  messages: ShellMessage[],
): Conversation {
  return {
    id,
    title,
    pinned,
    project,
    archived: false,
    deleted: false,
    messages,
  };
}

function createInitialConversations(): Conversation[] {
  return [
    createConversation(
      "focus-opdca",
      "O'PDCA 体验客户访谈",
      "增长实验",
      true,
      [
        createShellMessage("assistant", "Eliy：这是 O'PDCA 体验客户访谈的本地 Mock 对话。"),
        createShellMessage("assistant", "你可以在这里查看下一步行动，并保持右侧工件区独立。"),
      ],
    ),
    createConversation(
      "ui-preview",
      "ChatBot Shell 视觉验收",
      "产品壳",
      false,
      [
        createShellMessage("assistant", "Eliy：这是 ChatBot Shell 视觉验收的本地 Mock 对话。"),
        createShellMessage("assistant", "目前所有操作都只影响前端 local state。"),
      ],
    ),
    createConversation(
      "weekly-review",
      "每周复盘草稿",
      "经营复盘",
      false,
      [
        createShellMessage("assistant", "Eliy：这是每周复盘草稿的本地 Mock 对话。"),
        createShellMessage("assistant", "已归入最近 / 历史，后续可通过 mock action 移动项目或归档。"),
      ],
    ),
  ];
}

function createInitialShellState(): ShellState {
  const conversations = createInitialConversations();
  const selectedConversation = conversations.find((conversation) => !conversation.deleted && !conversation.archived) ?? null;

  return {
    conversations,
    selectedConversationId: selectedConversation?.id ?? null,
    lastActionFeedback: selectedConversation ? `已选择：${selectedConversation.title}` : "暂无可见会话",
    composerFeedback: "",
  };
}

function isVisibleConversation(conversation: Conversation): boolean {
  return !conversation.deleted && !conversation.archived;
}

function isActiveConversation(conversation: Conversation): boolean {
  return !conversation.deleted;
}

function findConversationById(conversations: readonly Conversation[], id: string | null): Conversation | null {
  if (!id) {
    return null;
  }

  return conversations.find((conversation) => conversation.id === id) ?? null;
}

function findFallbackSelectedConversationId(conversations: readonly Conversation[], removedId: string): string | null {
  const removedIndex = conversations.findIndex((conversation) => conversation.id === removedId);
  if (removedIndex < 0) {
    return conversations.find((conversation) => isVisibleConversation(conversation))?.id ?? null;
  }

  const nextVisible = conversations.slice(removedIndex + 1).find((conversation) => isVisibleConversation(conversation));
  if (nextVisible) {
    return nextVisible.id;
  }

  const previousVisible = [...conversations.slice(0, removedIndex)].reverse().find((conversation) => isVisibleConversation(conversation));
  if (previousVisible) {
    return previousVisible.id;
  }

  return conversations.find((conversation) => isVisibleConversation(conversation))?.id ?? null;
}

function appendMockReply(messages: ShellMessage[], userText: string): ShellMessage[] {
  const trimmed = userText.trim();
  if (!trimmed) {
    return messages;
  }

  return [
    ...messages,
    createShellMessage("user", trimmed),
    createShellMessage("assistant", buildMockAssistantReply(trimmed)),
  ];
}

function renameConversationTitle(title: string): string {
  return title.endsWith("（已重命名）") ? title : `${title}（已重命名）`;
}

function createSelectionFeedback(conversationTitle: string | null): string {
  return conversationTitle ? `已选择：${conversationTitle}` : "暂无可见会话";
}

function createActionFeedback(actionLabel: string, conversationTitle: string, selectedConversationTitle?: string | null): string {
  if (selectedConversationTitle === undefined) {
    return `${actionLabel}：${conversationTitle}`;
  }

  if (selectedConversationTitle) {
    return `${actionLabel}：${conversationTitle}，已选择：${selectedConversationTitle}`;
  }

  return `${actionLabel}：${conversationTitle}，暂无可见会话`;
}

function createMockSendFeedback(userText: string): string {
  return `已发送 Mock：${userText}`;
}

type ShellAction =
  | { type: "reset" }
  | { type: "select"; id: string }
  | { type: "togglePin"; id: string }
  | { type: "rename"; id: string }
  | { type: "moveToProject"; id: string }
  | { type: "archive"; id: string }
  | { type: "delete"; id: string }
  | { type: "appendMockTurn"; userText: string };

function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case "reset":
      return createInitialShellState();
    case "select": {
      const nextSelected = findConversationById(state.conversations, action.id);
      if (!nextSelected || !isVisibleConversation(nextSelected)) {
        return state;
      }

      return {
        ...state,
        selectedConversationId: action.id,
        lastActionFeedback: createSelectionFeedback(nextSelected.title),
      };
    }
    case "togglePin":
      return (() => {
        const targetConversation = findConversationById(state.conversations, action.id);
        if (!targetConversation) {
          return state;
        }

        const nextConversation = {
          ...targetConversation,
          pinned: !targetConversation.pinned,
        };

        return {
          ...state,
          conversations: state.conversations.map((conversation) => (conversation.id === action.id ? nextConversation : conversation)),
          lastActionFeedback: nextConversation.pinned
            ? `已置顶：${nextConversation.title}`
            : `已取消置顶：${nextConversation.title}`,
        };
      })();
    case "rename":
      return (() => {
        const targetConversation = findConversationById(state.conversations, action.id);
        if (!targetConversation) {
          return state;
        }

        const nextTitle = renameConversationTitle(targetConversation.title);
        const nextConversation = {
          ...targetConversation,
          title: nextTitle,
        };

        return {
          ...state,
          conversations: state.conversations.map((conversation) => (conversation.id === action.id ? nextConversation : conversation)),
          lastActionFeedback: `已重命名：${nextTitle}`,
        };
      })();
    case "moveToProject":
      return (() => {
        const targetConversation = findConversationById(state.conversations, action.id);
        if (!targetConversation) {
          return state;
        }

        const nextConversation = {
          ...targetConversation,
          project: MOCK_PROJECT_LABEL,
        };

        return {
          ...state,
          conversations: state.conversations.map((conversation) => (conversation.id === action.id ? nextConversation : conversation)),
          lastActionFeedback: `已移动到 Mock 项目：${nextConversation.title}`,
        };
      })();
    case "archive": {
      const targetConversation = findConversationById(state.conversations, action.id);
      if (!targetConversation) {
        return state;
      }

      const nextConversations = state.conversations.map((conversation) =>
        conversation.id === action.id
          ? {
              ...conversation,
              archived: true,
            }
          : conversation,
      );

      const nextSelectedConversationId =
        state.selectedConversationId === action.id
          ? findFallbackSelectedConversationId(nextConversations, action.id)
          : state.selectedConversationId;
      const nextSelectedConversation = findConversationById(nextConversations, nextSelectedConversationId);

      return {
        ...state,
        conversations: nextConversations,
        selectedConversationId: nextSelectedConversationId,
        lastActionFeedback: createActionFeedback("已归档", targetConversation.title, nextSelectedConversation?.title ?? null),
      };
    }
    case "delete": {
      const targetConversation = findConversationById(state.conversations, action.id);
      if (!targetConversation) {
        return state;
      }

      const nextConversations = state.conversations.map((conversation) =>
        conversation.id === action.id
          ? {
              ...conversation,
              deleted: true,
            }
          : conversation,
      );

      const nextSelectedConversationId =
        state.selectedConversationId === action.id
          ? findFallbackSelectedConversationId(nextConversations, action.id)
          : state.selectedConversationId;
      const nextSelectedConversation = findConversationById(nextConversations, nextSelectedConversationId);

      return {
        ...state,
        conversations: nextConversations,
        selectedConversationId: nextSelectedConversationId,
        lastActionFeedback: createActionFeedback("已删除", targetConversation.title, nextSelectedConversation?.title ?? null),
      };
    }
    case "appendMockTurn": {
      const currentConversation = findConversationById(state.conversations, state.selectedConversationId);
      if (!currentConversation || !isVisibleConversation(currentConversation)) {
        return state;
      }

      const trimmed = action.userText.trim();
      if (!trimmed) {
        return state;
      }

      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === currentConversation.id
            ? {
                ...conversation,
                messages: appendMockReply(conversation.messages, trimmed),
              }
            : conversation,
        ),
        lastActionFeedback: createMockSendFeedback(trimmed),
        composerFeedback: createMockSendFeedback(trimmed),
      };
    }
    default:
      return state;
  }
}

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
  disabled,
  feedback,
  onSend,
}: {
  disabled?: boolean;
  feedback: string;
  onSend: (userText: string) => void;
}) {
  const [text, setText] = useState("");

  const send = () => {
    const userText = text.trim();
    if (!userText || disabled) {
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
        placeholder={disabled ? "当前没有可见会话" : "输入一段本地 Mock 提示"}
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
          disabled={disabled || text.trim().length === 0}
          onClick={send}
        >
          发送 Mock
        </button>
      </div>
      {feedback ? (
        <div data-testid="composer-send-feedback" aria-live="polite" style={composerFeedbackStyle}>
          {feedback}
        </div>
      ) : null}
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  archived,
  onArchive,
  onDelete,
  onMoveToProject,
  onRename,
  onSelect,
  onTogglePin,
}: {
  conversation: Conversation;
  isSelected: boolean;
  archived?: boolean;
  onArchive?: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onMoveToProject?: (conversationId: string) => void;
  onRename: (conversationId: string) => void;
  onSelect?: (conversationId: string) => void;
  onTogglePin?: (conversationId: string) => void;
}) {
  const handleSelect = () => {
    if (onSelect) {
      onSelect(conversation.id);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(conversation.id);
    }
  };

  const cardStyle = {
    ...(isSelected ? { ...conversationCardStyle, ...conversationCardSelectedStyle } : conversationCardStyle),
    cursor: onSelect ? "pointer" : "default",
  };

  return (
    <article
      data-testid={`conversation-item-${conversation.id}`}
      data-selected={isSelected ? "true" : undefined}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      tabIndex={onSelect ? 0 : undefined}
      style={cardStyle}
    >
      {onSelect ? (
        <div
          data-testid={`conversation-select-${conversation.id}`}
          aria-current={isSelected ? "page" : undefined}
          style={conversationSelectStyle}
        >
          <div style={conversationTitleRowStyle}>
            <h3 style={conversationTitleStyle}>{conversation.title}</h3>
            {conversation.pinned ? <span style={chipStyle}>已置顶</span> : null}
            {conversation.archived ? <span style={chipStyle}>已归档</span> : null}
            {isSelected ? <span style={selectedConversationBadgeStyle}>当前选中</span> : null}
          </div>
          <div style={conversationMetaRowStyle}>
            <span style={mutedTextStyle}>项目：{conversation.project}</span>
          </div>
        </div>
      ) : (
        <div style={conversationSelectStyle}>
          <div style={conversationTitleRowStyle}>
            <h3 style={conversationTitleStyle}>{conversation.title}</h3>
            {conversation.pinned ? <span style={chipStyle}>已置顶</span> : null}
            {conversation.archived ? <span style={chipStyle}>已归档</span> : null}
          </div>
          <div style={conversationMetaRowStyle}>
            <span style={mutedTextStyle}>项目：{conversation.project}</span>
          </div>
        </div>
      )}

      <div style={conversationActionRowStyle}>
        {onTogglePin ? (
          <button
            type="button"
            data-testid={`conversation-action-pin-${conversation.id}`}
            style={isSelected ? { ...actionButtonStyle, ...selectedActionButtonStyle } : actionButtonStyle}
            onClick={(event) => {
              event.stopPropagation();
              onTogglePin(conversation.id);
            }}
          >
            {conversation.pinned ? "取消置顶" : "置顶"}
          </button>
        ) : null}
        <button
          type="button"
          data-testid={`conversation-action-rename-${conversation.id}`}
          style={isSelected ? { ...actionButtonStyle, ...selectedActionButtonStyle } : actionButtonStyle}
          onClick={(event) => {
            event.stopPropagation();
            onRename(conversation.id);
          }}
        >
          重命名
        </button>
        {onMoveToProject ? (
          <button
            type="button"
            data-testid={`conversation-action-move-${conversation.id}`}
            style={isSelected ? { ...actionButtonStyle, ...selectedActionButtonStyle } : actionButtonStyle}
            onClick={(event) => {
              event.stopPropagation();
              onMoveToProject(conversation.id);
            }}
          >
            移动项目
          </button>
        ) : null}
        {onArchive ? (
          <button
            type="button"
            data-testid={`conversation-action-archive-${conversation.id}`}
            style={isSelected ? { ...actionButtonStyle, ...selectedActionButtonStyle } : actionButtonStyle}
            onClick={(event) => {
              event.stopPropagation();
              onArchive(conversation.id);
            }}
          >
            归档
          </button>
        ) : null}
        <button
          type="button"
          data-testid={`conversation-action-delete-${conversation.id}`}
          style={isSelected ? { ...actionButtonStyle, ...selectedActionButtonStyle } : actionButtonStyle}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(conversation.id);
          }}
        >
          删除
        </button>
      </div>
    </article>
  );
}

function aggregateProjectSummaries(conversations: readonly Conversation[]): Array<{ label: string; count: number }> {
  const summaries = new Map<string, number>();

  for (const conversation of conversations) {
    if (!isVisibleConversation(conversation)) {
      continue;
    }

    summaries.set(conversation.project, (summaries.get(conversation.project) ?? 0) + 1);
  }

  return [...summaries.entries()].map(([label, count]) => ({ label, count }));
}

function projectSummaryKey(label: string): string {
  return label.replace(/\s+/g, "-").replace(/[^\p{Letter}\p{Number}-]/gu, "").toLowerCase() || "project";
}

function LeftWorkspacePanel({
  conversations,
  onResetThread,
  onSelectConversation,
  selectedConversationId,
  lastActionFeedback,
  onTogglePin,
  onRenameConversation,
  onMoveToProject,
  onArchiveConversation,
  onDeleteConversation,
}: {
  conversations: readonly Conversation[];
  onResetThread: () => void;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
  lastActionFeedback: string;
  onTogglePin: (conversationId: string) => void;
  onRenameConversation: (conversationId: string) => void;
  onMoveToProject: (conversationId: string) => void;
  onArchiveConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
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

  const pinnedConversations = conversations.filter((conversation) => conversation.pinned && isVisibleConversation(conversation));
  const recentConversations = conversations.filter((conversation) => !conversation.pinned && isVisibleConversation(conversation));
  const archivedConversations = conversations.filter((conversation) => conversation.archived && !conversation.deleted);
  const projectSummaries = aggregateProjectSummaries(conversations);

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

        <div data-testid="last-action-feedback" aria-live="polite" style={feedbackBannerStyle}>
          <p style={{ ...headingStyle, margin: 0 }}>最近反馈</p>
          <p style={{ ...mutedTextStyle, margin: 0, color: "#e5eefc" }}>{lastActionFeedback}</p>
        </div>

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

        <div style={sectionStackStyle}>
          <section data-testid="conversation-section-pinned" style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <p style={headingStyle}>已置顶</p>
              <span style={chipStyle}>{pinnedConversations.length} 条</span>
            </div>
            {pinnedConversations.length > 0 ? (
              <div style={sectionListStyle}>
                {pinnedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={conversation.id === selectedConversationId}
                    onArchive={onArchiveConversation}
                    onDelete={onDeleteConversation}
                    onMoveToProject={onMoveToProject}
                    onRename={onRenameConversation}
                    onSelect={onSelectConversation}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            ) : (
              <p style={emptyStateStyle}>暂无置顶会话</p>
            )}
          </section>

          <section data-testid="conversation-section-projects" style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <p style={headingStyle}>项目</p>
              <span style={chipStyle}>{projectSummaries.length} 个</span>
            </div>
            {projectSummaries.length > 0 ? (
              <div style={projectGroupStyle}>
                <div style={projectChipWrapStyle}>
                  {projectSummaries.map((summary) => (
                    <span
                      key={summary.label}
                      data-testid={`project-summary-${projectSummaryKey(summary.label)}`}
                      style={projectChipStyle}
                    >
                      {summary.label} · {summary.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p style={emptyStateStyle}>暂无项目分组</p>
            )}
          </section>

          <section data-testid="conversation-section-recent" style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <p style={headingStyle}>最近 / 历史</p>
              <span style={chipStyle}>{recentConversations.length} 条</span>
            </div>
            {recentConversations.length > 0 ? (
              <div style={sectionListStyle}>
                {recentConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={conversation.id === selectedConversationId}
                    onArchive={onArchiveConversation}
                    onDelete={onDeleteConversation}
                    onMoveToProject={onMoveToProject}
                    onRename={onRenameConversation}
                    onSelect={onSelectConversation}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            ) : (
              <p style={emptyStateStyle}>暂无最近会话</p>
            )}
          </section>

          {archivedConversations.length > 0 ? (
            <section data-testid="conversation-section-archived" style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <p style={headingStyle}>已归档</p>
                <span style={chipStyle}>{archivedConversations.length} 条</span>
              </div>
              <div style={sectionListStyle}>
                {archivedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    archived
                    conversation={conversation}
                    isSelected={false}
                    onDelete={onDeleteConversation}
                    onRename={onRenameConversation}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function ChatThreadPanel({
  composerFeedback,
  onSend,
  selectedConversation,
}: {
  composerFeedback: string;
  onSend: (userText: string) => void;
  selectedConversation: Conversation | null;
}) {
  const latestMessageAnchorRef = useRef<HTMLDivElement | null>(null);
  const visibleMessages = selectedConversation?.messages.map((message, index) => ({
    ...message,
    key: `${message.role}-${message.body.slice(0, 24)}-${index}`,
  })) ?? [];

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    latestMessageAnchorRef.current?.scrollIntoView?.({
      behavior: "auto",
      block: "end",
      inline: "nearest",
    });
  }, [selectedConversation?.id, visibleMessages.length]);

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
          {selectedConversation ? (
            <>
              <h2 data-testid="selected-conversation-title" style={titleStyle}>
                {selectedConversation.title}
              </h2>
              <p data-testid="selected-conversation-project" style={mutedTextStyle}>
                项目：{selectedConversation.project}
              </p>
            </>
          ) : (
            <>
              <h2 data-testid="selected-conversation-title" style={titleStyle}>
                暂无可见会话
              </h2>
              <p style={mutedTextStyle}>请从左侧选择一个本地 Mock 会话。</p>
            </>
          )}
        </div>
        <span data-testid="message-count" style={chipStyle}>
          {visibleMessages.length} 条消息
        </span>
      </div>

      <div data-testid="chat-thread" style={threadViewportStyle}>
        {selectedConversation ? (
          visibleMessages.map((message) => (
            <article
              key={message.key}
              data-testid="chat-message"
              style={getMessageCardStyle(message.role)}
            >
              <p style={headingStyle}>{getMessageRoleLabel(message.role)}</p>
              <p style={messageTextStyle}>{message.body}</p>
            </article>
          ))
        ) : (
          <div style={emptyStateStyle}>
            当前没有可见会话。请在左侧保留至少一条本地 Mock 会话。
          </div>
        )}
        {selectedConversation ? (
          <div
            ref={latestMessageAnchorRef}
            data-testid="chat-thread-latest-anchor"
            aria-hidden="true"
            style={{ height: "1px", width: "100%" }}
          />
        ) : null}
      </div>

      <div style={composerStyle}>
        <ShellComposer disabled={!selectedConversation} feedback={composerFeedback} onSend={onSend} />
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
            style={index === 0 ? { ...sectionStyle, borderTop: "none", paddingTop: "14px" } : sectionStyle}
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
  const [state, dispatch] = useReducer(shellReducer, undefined, createInitialShellState);

  const selectConversation = (conversationId: string) => {
    dispatch({ type: "select", id: conversationId });
  };

  const togglePin = (conversationId: string) => {
    dispatch({ type: "togglePin", id: conversationId });
  };

  const renameConversation = (conversationId: string) => {
    dispatch({ type: "rename", id: conversationId });
  };

  const moveConversationToProject = (conversationId: string) => {
    dispatch({ type: "moveToProject", id: conversationId });
  };

  const archiveConversation = (conversationId: string) => {
    dispatch({ type: "archive", id: conversationId });
  };

  const deleteConversation = (conversationId: string) => {
    dispatch({ type: "delete", id: conversationId });
  };

  const appendMockTurn = (userText: string) => {
    dispatch({ type: "appendMockTurn", userText });
  };

  const selectedConversation = findConversationById(state.conversations, state.selectedConversationId);

  return (
    <main style={shellStyle}>
      <div style={gridStyle}>
        <LeftWorkspacePanel
          conversations={state.conversations}
          onArchiveConversation={archiveConversation}
          onDeleteConversation={deleteConversation}
          onMoveToProject={moveConversationToProject}
          onRenameConversation={renameConversation}
          onResetThread={() => dispatch({ type: "reset" })}
          onSelectConversation={selectConversation}
          onTogglePin={togglePin}
          selectedConversationId={state.selectedConversationId}
          lastActionFeedback={state.lastActionFeedback}
        />
        <ChatThreadPanel
          composerFeedback={state.composerFeedback}
          onSend={appendMockTurn}
          selectedConversation={selectedConversation}
        />
        <ArtifactWorkspacePanel />
      </div>
    </main>
  );
}

export function buildMockAssistantReply(userText: string): string {
  const normalized = userText.trim() || "空输入";
  return `Eliy：收到你的本地 Mock 提示「${normalized}」。工作区保持独立，输出保持确定性。`;
}

export function AssistantUiChatbotShell() {
  return <ShellViewport />;
}
