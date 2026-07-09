// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AssistantUiChatbotShell, buildMockAssistantReply } from "../index.js";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value() {},
  });
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderShell() {
  return render(<AssistantUiChatbotShell />);
}

describe("AssistantUiChatbotShell", () => {
  it("renders the shell layout", () => {
    renderShell();

    expect(screen.getByTestId("left-workspace")).toBeTruthy();
    expect(screen.getByTestId("chat-thread-shell")).toBeTruthy();
    expect(screen.getByTestId("chat-thread")).toBeTruthy();
    expect(screen.getByTestId("composer-shell")).toBeTruthy();
    expect(screen.getByTestId("artifact-workspace")).toBeTruthy();
  });

  it("lists the left navigation as icon plus label items", () => {
    renderShell();

    const navigation = screen.getByLabelText("工作区导航");
    const items = [
      { id: "new-chat", label: "新聊天", icon: "＋", active: true },
      { id: "search", label: "搜索", icon: "⌕" },
      { id: "knowledge-base", label: "知识库", icon: "◇" },
      { id: "scheduled", label: "已安排", icon: "✓" },
      { id: "apps", label: "应用", icon: "▦" },
      { id: "more", label: "更多", icon: "…" },
      { id: "pinned", label: "已置顶", icon: "★" },
      { id: "projects", label: "项目", icon: "▣" },
      { id: "recent-history", label: "最近 / 历史", icon: "◷" },
      { id: "user-settings", label: "用户 / 设置", icon: "⚙" },
    ];

    for (const item of items) {
      const button = within(navigation).getByTestId(`workspace-item-${item.id}`);
      expect(button.textContent).toContain(item.label);
      expect(button.textContent).toContain(item.icon);
      expect(within(button).getByTestId(`workspace-icon-${item.id}`).textContent).toBe(item.icon);
    }

    const activeItem = within(navigation).getByTestId("workspace-item-new-chat");
    expect(activeItem.getAttribute("data-active")).toBe("true");
    expect(activeItem.getAttribute("aria-current")).toBe("page");
  });

  it("renders Chinese deterministic mock thread messages without raw JSON", async () => {
    renderShell();

    const messages = await screen.findAllByTestId("chat-message");
    expect(messages).toHaveLength(2);
    expect(messages[0]?.textContent).toContain("Eliy");
    expect(messages[0]?.textContent).toContain("Eliy 已准备好。中央对话区目前使用本地确定性 Mock 消息。");
    expect(messages[1]?.textContent).toContain(
      "你可以在下方输入区继续追加一轮 Mock 回复，右侧独立工作区会继续保持分离。",
    );
    expect(screen.getByTestId("message-count").textContent).toContain("2 条消息");

    const threadText = screen.getByTestId("chat-thread").textContent ?? "";
    expect(threadText).toContain("Eliy 已准备好。中央对话区目前使用本地确定性 Mock 消息。");
    expect(threadText).toContain(
      "你可以在下方输入区继续追加一轮 Mock 回复，右侧独立工作区会继续保持分离。",
    );
    expect(threadText).not.toContain('"id":');
    expect(threadText).not.toContain("unstable_data");
    expect(threadText).not.toContain("runConfig");
    expect(threadText).not.toContain("metadata");
    expect(threadText).not.toContain("Assistant");
    expect(threadText).not.toContain("You");
  });

  it("keeps the composer stable and preserves the mock submit path", async () => {
    const view = renderShell();

    const input = screen.getByPlaceholderText("输入一段本地 Mock 提示") as HTMLTextAreaElement;
    const plus = screen.getByTestId("composer-plus") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
    expect(plus.getAttribute("aria-label")).toBe("附件入口占位，尚未启用");
    expect(view.container.querySelector('input[type="file"]')).toBeNull();

    fireEvent.change(input, {
      target: { value: "需要一个更轻的 IA 视觉对齐版本" },
    });
    fireEvent.click(screen.getByTestId("composer-send"));

    const expectedReply = buildMockAssistantReply("需要一个更轻的 IA 视觉对齐版本");

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(4);
      expect(messages.some((message) => message.textContent?.includes("你"))).toBe(true);
      expect(messages[messages.length - 1]?.textContent).toContain(expectedReply);
    });

    await waitFor(() => {
      expect((screen.getByTestId("composer-input") as HTMLTextAreaElement).value).toBe("");
    });
  });

  it("keeps the center thread layout stable", () => {
    renderShell();

    const threadShell = screen.getByTestId("chat-thread-shell");
    const thread = screen.getByTestId("chat-thread");

    expect(threadShell.style.display).toBe("flex");
    expect(threadShell.style.flexDirection).toBe("column");
    expect(thread.style.overflowY).toBe("auto");
    expect(thread.style.overflowX).toBe("hidden");
    expect(thread.style.minWidth).toBe("0px");
  });

  it("keeps the artifact / OTUnit workspace separate from the thread", () => {
    renderShell();

    const artifactWorkspace = screen.getByTestId("artifact-workspace");
    const threadShell = screen.getByTestId("chat-thread-shell");

    expect(artifactWorkspace.closest('[data-testid="chat-thread-shell"]')).toBeNull();
    expect(threadShell.contains(artifactWorkspace)).toBe(false);
    expect(screen.getByTestId("otunit-workspace")).toBeTruthy();
    expect(screen.getByText("工件 / OTUnit")).toBeTruthy();
    expect(screen.getByText("独立工作区")).toBeTruthy();
    expect(screen.getByText("OTUnit 工作区")).toBeTruthy();
    expect(screen.getByText("工件工作区")).toBeTruthy();
    expect(screen.getByText("工作区备注")).toBeTruthy();
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("OTUnit 工作区");
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("工件工作区");
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("工作区备注");
  });

  it("builds deterministic mock replies", () => {
    const sample = "The same input should always produce the same output.";

    expect(buildMockAssistantReply(sample)).toBe(buildMockAssistantReply(sample));
    expect(buildMockAssistantReply("   ")).toContain("空输入");
    expect(buildMockAssistantReply(sample)).toContain("The same input should always produce the same output.");
  });
});
