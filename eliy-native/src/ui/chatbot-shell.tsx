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

const MOVED_PROJECT_LABEL = "重点项目";

const initialConversationTemplate: readonly ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Eliy：这是 O'PDCA 体验客户访谈的起始对话。",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "你可以在这里查看下一步行动，并保持右侧工作区独立。",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
];

export const initialMockThreadMessages: ThreadMessageLike[] = [...initialConversationTemplate];

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "14px",
  boxSizing: "border-box",
  overflowX: "hidden",
  color: "#e8eefc",
  background: "linear-gradient(180deg, #08111f 0%, #0d1627 100%)",
  fontFamily:
    '"IBM Plex Sans", "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 272px) minmax(0, 1fr) minmax(0, 296px)",
  gap: "0",
  alignItems: "stretch",
  minHeight: "calc(100vh - 28px)",
  minWidth: 0,
};

const panelStyle: CSSProperties = {
  borderRight: "1px solid rgba(148, 163, 184, 0.08)",
  background: "rgba(7, 12, 22, 0.56)",
  boxShadow: "none",
  backdropFilter: "blur(12px)",
  overflow: "hidden",
  minWidth: 0,
};

const workspacePanelStyle: CSSProperties = {
  ...panelStyle,
  borderRight: "0",
  borderLeft: "1px solid rgba(148, 163, 184, 0.08)",
  background: "rgba(7, 12, 22, 0.42)",
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 14px 10px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
};

const panelBodyStyle: CSSProperties = {
  padding: "12px 14px 14px",
};

const chatHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 14px 10px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
};

const chatHeaderTextStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
};

const chatHeaderFeedbackStyle: CSSProperties = {
  margin: 0,
  color: "#aeb8cf",
  lineHeight: 1.35,
  fontSize: "12px",
};

const workspaceToggleStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.62)",
  color: "#eef4ff",
  padding: "8px 12px",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const sectionStackStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "10px",
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(148, 163, 184, 0.08)",
  background: "transparent",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const sectionListStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
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

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9fb0d0",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  lineHeight: 1.18,
  color: "#f8fbff",
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: "#b7c3dd",
  lineHeight: 1.45,
  fontSize: "12px",
};

const navButtonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "8px",
  border: "1px solid transparent",
  borderRadius: "11px",
  background: "transparent",
  color: "#edf2ff",
  padding: "8px 10px",
  fontSize: "13px",
  textAlign: "left",
  cursor: "pointer",
};

const navButtonAccentStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(15, 23, 42, 0.34)",
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
  gap: "8px",
  border: "0",
  borderRadius: "12px",
  background: "transparent",
  padding: "2px 0",
};

const conversationCardSelectedStyle: CSSProperties = {
  boxShadow: "inset 2px 0 0 rgba(96, 165, 250, 0.7)",
  background: "rgba(15, 23, 42, 0.34)",
};

const conversationSelectStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  width: "100%",
  border: "0",
  borderRadius: "12px",
  background: "transparent",
  color: "#edf2ff",
  padding: "8px 10px 8px",
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
  fontSize: "13px",
  fontWeight: 600,
  color: "#f8fbff",
  lineHeight: 1.35,
};

const conversationMetaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const conversationOverflowRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "8px",
};

const conversationOverflowButtonStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.12)",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.54)",
  color: "#eef4ff",
  fontSize: "14px",
  padding: "4px 10px 5px",
  cursor: "pointer",
};

const conversationActionPanelStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "8px",
  borderRadius: "12px",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  background: "rgba(15, 23, 42, 0.56)",
};

const threadViewportStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: "10px",
  padding: "14px",
  overflowY: "auto",
  overflowX: "hidden",
  minHeight: 0,
  minWidth: 0,
  flex: "1 1 auto",
};

const actionButtonStyle: CSSProperties = {
  border: "0",
  borderRadius: "10px",
  background: "rgba(15, 23, 42, 0.42)",
  color: "#edf2ff",
  fontSize: "12px",
  padding: "8px 10px",
  cursor: "pointer",
};

const selectedActionButtonStyle: CSSProperties = {
  background: "rgba(96, 165, 250, 0.12)",
};

const messageCardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.08)",
  borderRadius: "16px",
  background: "rgba(15, 23, 42, 0.56)",
  padding: "12px 14px",
  minWidth: 0,
  maxWidth: "min(82%, 680px)",
  overflow: "hidden",
};

const messageTextStyle: CSSProperties = {
  margin: 0,
  color: "#edf2ff",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const composerStyle: CSSProperties = {
  borderTop: "1px solid rgba(148, 163, 184, 0.08)",
  padding: "12px 14px 14px",
  background: "rgba(6, 11, 22, 0.34)",
  flex: "0 0 auto",
};

const composerSurfaceStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
  width: "100%",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  borderRadius: "18px",
  background: "rgba(15, 23, 42, 0.42)",
  padding: "10px 12px",
};

const composerFeedbackStyle: CSSProperties = {
  border: "0",
  borderRadius: "0",
  background: "transparent",
  color: "#aeb8cf",
  fontSize: "12px",
  lineHeight: 1.4,
  padding: "0",
};

const composerFieldStyle: CSSProperties = {
  width: "100%",
  minHeight: "88px",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  borderRadius: "14px",
  background: "rgba(3, 7, 18, 0.56)",
  color: "#f8fbff",
  padding: "10px 12px",
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
  gap: "10px",
};

const composerMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  minWidth: 0,
};

const primaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(96, 165, 250, 0.18)",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "8px 14px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const composerPlusStyle: CSSProperties = {
  width: "30px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#ced8ef",
  fontSize: "16px",
  lineHeight: 1,
  cursor: "not-allowed",
  opacity: 0.72,
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "999px",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  background: "rgba(15, 23, 42, 0.42)",
  color: "#b9c4da",
  fontSize: "11px",
  padding: "6px 9px",
};

const projectChipStyle: CSSProperties = {
  ...chipStyle,
  background: "rgba(17, 24, 39, 0.7)",
};

const emptyStateStyle: CSSProperties = {
  border: "1px dashed rgba(148, 163, 184, 0.12)",
  borderRadius: "12px",
  padding: "12px",
  color: "#b7c3dd",
  background: "rgba(3, 7, 18, 0.2)",
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
        createShellMessage("assistant", "Eliy：这是 O'PDCA 体验客户访谈的起始对话。"),
        createShellMessage("assistant", "你可以在这里查看下一步行动，并保持右侧工作区独立。"),
      ],
    ),
    createConversation(
      "ui-preview",
      "ChatBot Shell 视觉验收",
      "产品壳",
      false,
      [
        createShellMessage("assistant", "Eliy：这是 ChatBot Shell 视觉验收的起始对话。"),
        createShellMessage("assistant", "所有操作都会立即反映在当前页面。"),
      ],
    ),
    createConversation(
      "weekly-review",
      "每周复盘草稿",
      "经营复盘",
      false,
      [
        createShellMessage("assistant", "Eliy：这是每周复盘草稿的起始对话。"),
        createShellMessage("assistant", "你可以把它移动到项目，或继续整理后再归档。"),
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
  return `发送成功，Eliy 已回复：${userText}`;
}

type ShellAction =
  | { type: "reset" }
  | { type: "select"; id: string }
  | { type: "togglePin"; id: string }
  | { type: "rename"; id: string }
  | { type: "moveToProject"; id: string }
  | { type: "archive"; id: string }
  | { type: "delete"; id: string }
  | { type: "search" }
  | { type: "openSettings" }
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
    case "search":
      return {
        ...state,
        lastActionFeedback: "搜索功能暂未开放",
      };
    case "openSettings":
      return {
        ...state,
        lastActionFeedback: "设置功能暂未开放",
      };
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
          project: MOVED_PROJECT_LABEL,
        };

        return {
          ...state,
          conversations: state.conversations.map((conversation) => (conversation.id === action.id ? nextConversation : conversation)),
          lastActionFeedback: `已移动到项目：${nextConversation.project}`,
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

function getMessageCardStyle(role: ChatRole): CSSProperties {
  return {
    ...messageCardStyle,
    background:
      role === "user"
        ? "linear-gradient(180deg, rgba(96, 165, 250, 0.18), rgba(15, 23, 42, 0.72))"
        : "rgba(15, 23, 42, 0.46)",
    borderColor: role === "user" ? "rgba(96, 165, 250, 0.22)" : "rgba(148, 163, 184, 0.08)",
    justifySelf: role === "user" ? "end" : "start",
    alignSelf: role === "user" ? "end" : "start",
    textAlign: role === "user" ? "left" : "left",
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
    <div data-testid="composer-shell" data-surface="minimal" style={composerSurfaceStyle}>
      <textarea
        aria-label="输入想和 Eliy 讨论的问题"
        data-testid="composer-input"
        placeholder={disabled ? "当前没有可见会话" : "输入想和 Eliy 讨论的问题"}
        style={composerFieldStyle}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div style={composerActionsStyle}>
        <div style={composerMetaStyle}>
          <button
            type="button"
            data-testid="composer-plus"
            aria-label="附件功能尚未开放"
            title="附件功能尚未开放"
            style={composerPlusStyle}
            disabled
          >
            +
          </button>
        </div>
        <button
          type="button"
          data-testid="composer-send"
          style={primaryButtonStyle}
          disabled={disabled || text.trim().length === 0}
          onClick={send}
        >
          发送
        </button>
      </div>
      {feedback ? (
        <div
          data-testid="composer-send-feedback"
          data-surface="inline"
          aria-live="polite"
          style={composerFeedbackStyle}
        >
          {feedback}
        </div>
      ) : null}
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  actionMenuOpen,
  archived,
  onArchive,
  onDelete,
  onMoveToProject,
  onRename,
  onSelect,
  onToggleActionMenu,
  onTogglePin,
}: {
  conversation: Conversation;
  isSelected: boolean;
  actionMenuOpen: boolean;
  archived?: boolean;
  onArchive?: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onMoveToProject?: (conversationId: string) => void;
  onRename: (conversationId: string) => void;
  onSelect?: (conversationId: string) => void;
  onToggleActionMenu?: (conversationId: string) => void;
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

  const handleToggleActionMenu = () => {
    onToggleActionMenu?.(conversation.id);
  };

  return (
    <article
      data-testid={`conversation-item-${conversation.id}`}
      data-item-surface="flat"
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

      {isSelected ? (
        <>
          <div style={conversationOverflowRowStyle}>
            <button
              type="button"
              data-testid={`conversation-action-menu-${conversation.id}`}
              aria-label="更多操作"
              title="更多操作"
              style={conversationOverflowButtonStyle}
              onClick={(event) => {
                event.stopPropagation();
                handleToggleActionMenu();
              }}
            >
              …
            </button>
          </div>

          {actionMenuOpen ? (
            <div
              data-testid={`conversation-action-panel-${conversation.id}`}
              data-surface="menu"
              style={conversationActionPanelStyle}
            >
              <div style={{ display: "grid", gap: "4px" }}>
                {onTogglePin ? (
                  <button
                    type="button"
                    data-testid={`conversation-action-pin-${conversation.id}`}
                    style={{ ...actionButtonStyle, ...selectedActionButtonStyle, textAlign: "left" }}
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
                  style={{ ...actionButtonStyle, ...selectedActionButtonStyle, textAlign: "left" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRename(conversation.id);
                  }}
                >
                  改名
                </button>
                {onMoveToProject ? (
                  <button
                    type="button"
                    data-testid={`conversation-action-move-${conversation.id}`}
                    style={{ ...actionButtonStyle, ...selectedActionButtonStyle, textAlign: "left" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMoveToProject(conversation.id);
                    }}
                  >
                    移动
                  </button>
                ) : null}
                {onArchive ? (
                  <button
                    type="button"
                    data-testid={`conversation-action-archive-${conversation.id}`}
                    style={{ ...actionButtonStyle, ...selectedActionButtonStyle, textAlign: "left" }}
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
                  style={{ ...actionButtonStyle, ...selectedActionButtonStyle, textAlign: "left" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(conversation.id);
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
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
  onSearch,
  onOpenSettings,
  onSelectConversation,
  selectedConversationId,
  actionMenuConversationId,
  onTogglePin,
  onRenameConversation,
  onMoveToProject,
  onArchiveConversation,
  onDeleteConversation,
  onToggleConversationActionMenu,
}: {
  conversations: readonly Conversation[];
  onResetThread: () => void;
  onSearch: () => void;
  onOpenSettings: () => void;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
  actionMenuConversationId: string | null;
  onTogglePin: (conversationId: string) => void;
  onRenameConversation: (conversationId: string) => void;
  onMoveToProject: (conversationId: string) => void;
  onArchiveConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onToggleConversationActionMenu: (conversationId: string) => void;
}) {
  const pinnedConversations = conversations.filter((conversation) => conversation.pinned && isVisibleConversation(conversation));
  const recentConversations = conversations.filter((conversation) => !conversation.pinned && isVisibleConversation(conversation));
  const projectSummaries = aggregateProjectSummaries(conversations);

  return (
    <aside data-testid="left-workspace" data-surface="flat" style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={headingStyle}>Eliy</p>
          <h1 style={titleStyle}>老板的 AI 经营助手</h1>
        </div>
      </div>
      <div style={panelBodyStyle}>
        <div style={{ display: "grid", gap: "10px" }}>
          <div style={{ display: "grid", gap: "4px" }} aria-label="主导航">
            <button
              type="button"
              data-testid="workspace-item-new-chat"
              data-active="true"
              aria-current="page"
              style={{ ...navButtonStyle, ...navButtonAccentStyle }}
              onClick={onResetThread}
            >
              <span aria-hidden="true" data-testid="workspace-icon-new-chat" style={navIconStyle}>
                ＋
              </span>
              <span style={navLabelStyle}>新对话</span>
            </button>
            <button
              type="button"
              data-testid="workspace-item-search"
              style={navButtonStyle}
              onClick={onSearch}
            >
              <span aria-hidden="true" data-testid="workspace-icon-search" style={navIconStyle}>
                ⌕
              </span>
              <span style={navLabelStyle}>搜索</span>
            </button>
          </div>

          <div style={sectionStackStyle}>
            <section data-testid="conversation-section-projects" data-surface="list" style={sectionStyle}>
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

            <section data-testid="conversation-section-pinned" data-surface="list" style={sectionStyle}>
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
                      actionMenuOpen={conversation.id === actionMenuConversationId}
                      onArchive={onArchiveConversation}
                      onDelete={onDeleteConversation}
                      onMoveToProject={onMoveToProject}
                      onRename={onRenameConversation}
                      onSelect={onSelectConversation}
                      onToggleActionMenu={onToggleConversationActionMenu}
                      onTogglePin={onTogglePin}
                    />
                  ))}
                </div>
              ) : (
                <p style={emptyStateStyle}>暂无置顶会话</p>
              )}
            </section>

            <section data-testid="conversation-section-recent" data-surface="list" style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <p style={headingStyle}>最近对话</p>
                <span style={chipStyle}>{recentConversations.length} 条</span>
              </div>
              {recentConversations.length > 0 ? (
                <div style={sectionListStyle}>
                  {recentConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={conversation.id === selectedConversationId}
                      actionMenuOpen={conversation.id === actionMenuConversationId}
                      onArchive={onArchiveConversation}
                      onDelete={onDeleteConversation}
                      onMoveToProject={onMoveToProject}
                      onRename={onRenameConversation}
                      onSelect={onSelectConversation}
                      onToggleActionMenu={onToggleConversationActionMenu}
                      onTogglePin={onTogglePin}
                    />
                  ))}
                </div>
              ) : (
                <p style={emptyStateStyle}>暂无最近对话</p>
              )}
            </section>
          </div>

          <div style={{ display: "grid", gap: "4px", marginTop: "10px", borderTop: "1px solid rgba(148, 163, 184, 0.08)", paddingTop: "10px" }}>
            <button
              type="button"
              data-testid="workspace-item-settings"
              style={navButtonStyle}
              onClick={onOpenSettings}
            >
              <span aria-hidden="true" data-testid="workspace-icon-settings" style={navIconStyle}>
                ⚙
              </span>
              <span style={navLabelStyle}>设置</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ChatThreadPanel({
  actionFeedback,
  composerFeedback,
  onSend,
  onToggleWorkspace,
  workspaceOpen,
  selectedConversation,
}: {
  actionFeedback: string;
  composerFeedback: string;
  onSend: (userText: string) => void;
  onToggleWorkspace: () => void;
  workspaceOpen: boolean;
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
    <div data-testid="chat-primary-stage" style={{ display: "flex", minHeight: 0, minWidth: 0 }}>
      <section
        data-testid="chat-thread-shell"
        style={{
          ...panelStyle,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          minWidth: 0,
          flex: "1 1 auto",
        }}
      >
        <div style={chatHeaderStyle}>
          <div style={chatHeaderTextStyle}>
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
                <p style={mutedTextStyle}>请从左侧选择一个会话。</p>
              </>
            )}
            <p data-testid="chat-action-feedback" aria-live="polite" style={chatHeaderFeedbackStyle}>
              {actionFeedback}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span data-testid="message-count" style={chipStyle}>
              {visibleMessages.length} 条消息
            </span>
            <button
              type="button"
              data-testid="workspace-toggle"
              style={workspaceToggleStyle}
              onClick={onToggleWorkspace}
            >
              {workspaceOpen ? "收起工作区" : "工作区"}
            </button>
          </div>
        </div>

        <div data-testid="chat-thread" style={threadViewportStyle}>
          {selectedConversation ? (
            visibleMessages.map((message) => (
              <article
                key={message.key}
                data-testid="chat-message"
                data-message-role={message.role}
                data-alignment={message.role === "user" ? "right" : "left"}
                style={getMessageCardStyle(message.role)}
              >
                <p style={messageTextStyle}>{message.body}</p>
              </article>
            ))
          ) : (
            <div style={emptyStateStyle}>
              当前没有可见会话。请在左侧保留至少一条会话。
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
    </div>
  );
}

function ArtifactWorkspacePanel() {
  return (
    <aside data-testid="artifact-workspace" data-surface="simple" style={workspacePanelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={headingStyle}>工作区</p>
        </div>
      </div>
      <div
        data-testid="otunit-workspace"
        style={{
          ...panelBodyStyle,
          display: "grid",
          gap: "8px",
        }}
      >
        <p style={titleStyle}>这里会显示 Eliy 为你整理出的行动、资料和 O 单。</p>
        <p style={mutedTextStyle}>当前只保留轻量说明，不展开真实内容。</p>
      </div>
    </aside>
  );
}

function ShellViewport() {
  const [state, dispatch] = useReducer(shellReducer, undefined, createInitialShellState);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [actionMenuConversationId, setActionMenuConversationId] = useState<string | null>(null);

  const selectConversation = (conversationId: string) => {
    dispatch({ type: "select", id: conversationId });
    setActionMenuConversationId(null);
  };

  const togglePin = (conversationId: string) => {
    dispatch({ type: "togglePin", id: conversationId });
    setActionMenuConversationId(null);
  };

  const renameConversation = (conversationId: string) => {
    dispatch({ type: "rename", id: conversationId });
    setActionMenuConversationId(null);
  };

  const moveConversationToProject = (conversationId: string) => {
    dispatch({ type: "moveToProject", id: conversationId });
    setActionMenuConversationId(null);
  };

  const archiveConversation = (conversationId: string) => {
    dispatch({ type: "archive", id: conversationId });
    setActionMenuConversationId(null);
  };

  const deleteConversation = (conversationId: string) => {
    dispatch({ type: "delete", id: conversationId });
    setActionMenuConversationId(null);
  };

  const search = () => {
    dispatch({ type: "search" });
  };

  const openSettings = () => {
    dispatch({ type: "openSettings" });
  };

  const toggleWorkspace = () => {
    setWorkspaceOpen((current) => !current);
  };

  const toggleConversationActionMenu = (conversationId: string) => {
    setActionMenuConversationId((current) => (current === conversationId ? null : conversationId));
  };

  const appendMockTurn = (userText: string) => {
    dispatch({ type: "appendMockTurn", userText });
  };

  const selectedConversation = findConversationById(state.conversations, state.selectedConversationId);

  return (
    <main data-testid="chatbot-shell-root" data-desktop-density="compact" data-shell-ia="chat-first" style={shellStyle}>
      <div
        data-testid="chatbot-shell-grid"
        data-workspace-open={workspaceOpen ? "true" : "false"}
        style={{
          ...gridStyle,
          gridTemplateColumns: workspaceOpen
            ? "minmax(0, 272px) minmax(0, 1fr) minmax(0, 296px)"
            : "minmax(0, 272px) minmax(0, 1fr)",
        }}
      >
        <LeftWorkspacePanel
          conversations={state.conversations}
          onArchiveConversation={archiveConversation}
          onDeleteConversation={deleteConversation}
          onMoveToProject={moveConversationToProject}
          onRenameConversation={renameConversation}
          onResetThread={() => dispatch({ type: "reset" })}
          onSearch={search}
          onOpenSettings={openSettings}
          onSelectConversation={selectConversation}
          onTogglePin={togglePin}
          selectedConversationId={state.selectedConversationId}
          actionMenuConversationId={actionMenuConversationId}
          onToggleConversationActionMenu={toggleConversationActionMenu}
        />
        <ChatThreadPanel
          actionFeedback={state.lastActionFeedback}
          composerFeedback={state.composerFeedback}
          onSend={appendMockTurn}
          onToggleWorkspace={toggleWorkspace}
          workspaceOpen={workspaceOpen}
          selectedConversation={selectedConversation}
        />
        {workspaceOpen ? <ArtifactWorkspacePanel /> : null}
      </div>
    </main>
  );
}

export function buildMockAssistantReply(userText: string): string {
  const normalized = userText.trim() || "空输入";
  return `Eliy：收到你的问题「${normalized}」。我已为你整理下一步。`;
}

export function AssistantUiChatbotShell() {
  return <ShellViewport />;
}
