// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AssistantUiChatbotShell, buildMockAssistantReply } from "../index.js";

const scrollIntoViewMock = vi.fn();

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
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoViewMock,
  });
});

afterEach(() => {
  cleanup();
  scrollIntoViewMock.mockClear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderShell() {
  return render(<AssistantUiChatbotShell />);
}

function getVisibleText() {
  return document.body.textContent ?? "";
}

function expectNoTechnicalTerms() {
  const visibleText = getVisibleText().toLowerCase();
  expect(visibleText).not.toContain("mock");
  expect(visibleText).not.toContain("deterministic");
  expect(visibleText).not.toContain("composer");
  expect(visibleText).not.toContain("thread");
  expect(visibleText).not.toContain("local state");
  expect(visibleText).not.toContain("harness");
  expect(visibleText).not.toContain("eliy native");
}

describe("AssistantUiChatbotShell", () => {
  it("shows the simplified brand and navigation", () => {
    renderShell();

    expect(screen.getByTestId("left-workspace").textContent).toContain("Eliy");
    expect(screen.getByTestId("left-workspace").textContent).toContain("老板的 AI 经营助手");
    expect(getVisibleText()).not.toContain("Eliy Native");
    expect(getVisibleText()).not.toContain("0.1.0");
    expect(screen.queryByTestId("last-action-feedback")).toBeNull();
    expect(screen.queryByText("看清当前状态与可执行动作。")).toBeNull();
    expect(screen.queryByText("看清当前能做什么、点了会发生什么、下一步还能做什么。")).toBeNull();

    expect(screen.getByTestId("workspace-item-new-chat")).toBeTruthy();
    expect(screen.getByTestId("workspace-item-search")).toBeTruthy();
    expect(screen.getByTestId("workspace-item-settings")).toBeTruthy();
    expect(screen.getByTestId("workspace-icon-new-chat")).toBeTruthy();
    expect(screen.getByTestId("workspace-icon-search")).toBeTruthy();
    expect(screen.getByTestId("workspace-icon-settings")).toBeTruthy();

    const leftWorkspaceText = screen.getByTestId("left-workspace").textContent ?? "";
    expect(leftWorkspaceText).toContain("新对话");
    expect(leftWorkspaceText).toContain("搜索");
    expect(leftWorkspaceText).toContain("项目");
    expect(leftWorkspaceText).toContain("已置顶");
    expect(leftWorkspaceText).toContain("最近对话");
    expect(leftWorkspaceText).toContain("设置");

    expect(screen.queryByText("知识库")).toBeNull();
    expect(screen.queryByText("已安排")).toBeNull();
    expect(screen.queryByText("应用")).toBeNull();
    expect(screen.queryByText("更多")).toBeNull();
    expect(screen.queryByText("用户 / 设置")).toBeNull();

    fireEvent.click(screen.getByTestId("workspace-item-search"));
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("搜索功能暂未开放");

    fireEvent.click(screen.getByTestId("workspace-item-settings"));
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("设置功能暂未开放");

    expectNoTechnicalTerms();
  });

  it("renders the shell as chat-first with the workspace collapsed by default", () => {
    renderShell();

    const shellRoot = screen.getByTestId("chatbot-shell-root");
    const shellGrid = screen.getByTestId("chatbot-shell-grid");
    const chatPrimaryStage = screen.getByTestId("chat-primary-stage");

    expect(shellRoot.getAttribute("data-shell-ia")).toBe("chat-first");
    expect(shellRoot.getAttribute("data-desktop-density")).toBe("compact");
    expect(shellGrid.getAttribute("data-workspace-open")).toBe("false");
    expect(shellGrid.style.gap).toBe("0px");
    expect(chatPrimaryStage).toBeTruthy();
    expect(screen.getByTestId("chat-thread-shell")).toBeTruthy();
    expect(screen.queryByTestId("artifact-workspace")).toBeNull();
    expect(screen.getByTestId("workspace-toggle").textContent).toBe("工作区");
  });

  it("opens and closes the workspace from the chat header toggle", () => {
    renderShell();

    const toggle = screen.getByTestId("workspace-toggle");

    fireEvent.click(toggle);

    expect(screen.getByTestId("chatbot-shell-grid").getAttribute("data-workspace-open")).toBe("true");
    expect(screen.getByTestId("workspace-toggle").textContent).toBe("收起工作区");
    expect(screen.getByTestId("artifact-workspace")).toBeTruthy();
    expect(screen.getByTestId("otunit-workspace")).toBeTruthy();
    expect(screen.getByTestId("artifact-workspace").closest('[data-testid="chat-thread-shell"]')).toBeNull();
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("行动整理");
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("资料区");
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("备注");

    fireEvent.click(screen.getByTestId("workspace-toggle"));

    expect(screen.getByTestId("chatbot-shell-grid").getAttribute("data-workspace-open")).toBe("false");
    expect(screen.getByTestId("workspace-toggle").textContent).toBe("工作区");
    expect(screen.queryByTestId("artifact-workspace")).toBeNull();
  });

  it("renders project, pinned and recent sections in the requested order", () => {
    renderShell();

    const newChat = screen.getByTestId("workspace-item-new-chat");
    const search = screen.getByTestId("workspace-item-search");
    const projects = screen.getByTestId("conversation-section-projects");
    const pinned = screen.getByTestId("conversation-section-pinned");
    const recent = screen.getByTestId("conversation-section-recent");
    const settings = screen.getByTestId("workspace-item-settings");

    expect(screen.getByTestId("left-workspace").getAttribute("data-surface")).toBe("flat");
    expect(projects.getAttribute("data-surface")).toBe("list");
    expect(pinned.getAttribute("data-surface")).toBe("list");
    expect(recent.getAttribute("data-surface")).toBe("list");

    expect(newChat.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(projects) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(projects.compareDocumentPosition(pinned) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pinned.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recent.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(projects.textContent).toContain("增长实验 · 1");
    expect(projects.textContent).toContain("产品壳 · 1");
    expect(projects.textContent).toContain("经营复盘 · 1");

    expect(pinned.textContent).toContain("O'PDCA 体验客户访谈");
    expect(recent.textContent).toContain("ChatBot Shell 视觉验收");
    expect(recent.textContent).toContain("每周复盘草稿");
  });

  it("shows actions only on the selected conversation and keeps selection stable", () => {
    renderShell();

    expect(screen.queryByTestId("conversation-action-pin-ui-preview")).toBeNull();
    expect(screen.queryByTestId("conversation-action-menu-ui-preview")).toBeNull();

    fireEvent.click(screen.getByTestId("conversation-item-ui-preview"));

    expect(screen.getByTestId("conversation-item-ui-preview").getAttribute("data-item-surface")).toBe("flat");
    expect(screen.getByTestId("conversation-item-ui-preview").getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId("conversation-item-focus-opdca").getAttribute("data-selected")).toBeNull();
    expect(screen.queryByText("当前选中")).toBeNull();
    expect(screen.queryByTestId("conversation-action-pin-ui-preview")).toBeNull();
    expect(screen.getByTestId("conversation-action-menu-ui-preview")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-menu-ui-preview").textContent).toContain("…");
    expect(screen.queryByTestId("conversation-action-panel-ui-preview")).toBeNull();

    fireEvent.click(screen.getByTestId("conversation-action-menu-ui-preview"));

    expect(screen.getByTestId("conversation-action-panel-ui-preview").getAttribute("data-surface")).toBe("menu");
    expect(screen.getByTestId("conversation-action-panel-ui-preview")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-pin-ui-preview")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-rename-ui-preview")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-move-ui-preview")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-archive-ui-preview")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-delete-ui-preview")).toBeTruthy();

    fireEvent.click(screen.getByTestId("conversation-action-pin-ui-preview"));

    expect(screen.getByTestId("conversation-item-ui-preview").getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("已置顶：ChatBot Shell 视觉验收");
  });

  it("retains pin, rename and move actions with simplified feedback", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-item-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-menu-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-pin-ui-preview"));

    expect(screen.getByTestId("conversation-section-pinned").textContent).toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("conversation-section-recent").textContent).not.toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("已置顶：ChatBot Shell 视觉验收");

    fireEvent.click(screen.getByTestId("conversation-action-menu-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-pin-ui-preview"));

    expect(screen.getByTestId("conversation-section-pinned").textContent).not.toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("conversation-section-recent").textContent).toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("已取消置顶：ChatBot Shell 视觉验收");

    fireEvent.click(screen.getByTestId("conversation-action-menu-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-rename-ui-preview"));

    expect(screen.getByTestId("conversation-item-ui-preview").textContent).toContain("ChatBot Shell 视觉验收（已重命名）");
    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("ChatBot Shell 视觉验收（已重命名）");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("已重命名：ChatBot Shell 视觉验收（已重命名）");

    fireEvent.click(screen.getByTestId("conversation-action-menu-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-move-ui-preview"));

    expect(screen.getByTestId("conversation-item-ui-preview").textContent).toContain("项目：重点项目");
    expect(screen.getByText("重点项目 · 1")).toBeTruthy();
    expect(screen.getByTestId("selected-conversation-project").textContent).toBe("项目：重点项目");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("已移动到项目：重点项目");
  });

  it("archives and deletes conversations while advancing the visible selection", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-item-focus-opdca"));
    fireEvent.click(screen.getByTestId("conversation-action-menu-focus-opdca"));
    fireEvent.click(screen.getByTestId("conversation-action-archive-focus-opdca"));

    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("conversation-section-recent").textContent).not.toContain("O'PDCA 体验客户访谈");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain(
      "已归档：O'PDCA 体验客户访谈，已选择：ChatBot Shell 视觉验收",
    );
    expect(screen.getByTestId("conversation-section-pinned").textContent).not.toContain("O'PDCA 体验客户访谈");

    fireEvent.click(screen.getByTestId("conversation-item-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-menu-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-delete-ui-preview"));

    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("每周复盘草稿");
    expect(screen.queryByTestId("conversation-select-ui-preview")).toBeNull();
    expect(screen.getByTestId("conversation-section-recent").textContent).not.toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain(
      "已删除：ChatBot Shell 视觉验收，已选择：每周复盘草稿",
    );
  });

  it("sends a localized reply, keeps the latest message visible and clears the input", async () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-item-ui-preview"));
    scrollIntoViewMock.mockClear();

    const input = screen.getByPlaceholderText("输入想和 Eliy 讨论的问题") as HTMLTextAreaElement;
    expect(screen.getByTestId("composer-send").textContent).toBe("发送");
    expect(screen.getByTestId("composer-send").getAttribute("disabled")).not.toBeNull();
    expect(screen.getByTestId("composer-shell").getAttribute("data-surface")).toBe("minimal");

    fireEvent.change(input, {
      target: { value: "需要一个更轻的体验版本" },
    });
    fireEvent.click(screen.getByTestId("composer-send"));

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(4);
      expect(screen.getByTestId("chat-thread").textContent).toContain("需要一个更轻的体验版本");
      expect(messages[0]?.getAttribute("data-message-role")).toBe("assistant");
      expect(messages[0]?.getAttribute("data-alignment")).toBe("left");
      expect(messages[2]?.getAttribute("data-message-role")).toBe("user");
      expect(messages[2]?.getAttribute("data-alignment")).toBe("right");
      expect(messages[3]?.getAttribute("data-message-role")).toBe("assistant");
      expect(messages[3]?.getAttribute("data-alignment")).toBe("left");
      expect(messages[messages.length - 1]?.textContent).toContain(
        buildMockAssistantReply("需要一个更轻的体验版本"),
      );
      expect(screen.getByTestId("chat-thread-latest-anchor")).toBeTruthy();
      expect(screen.getByTestId("composer-send-feedback").textContent).toContain("发送成功，Eliy 已回复");
      expect(screen.getByTestId("composer-send-feedback").getAttribute("data-surface")).toBe("inline");
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect((screen.getByTestId("composer-input") as HTMLTextAreaElement).value).toBe("");
      expect(screen.getByTestId("composer-send").getAttribute("disabled")).not.toBeNull();
    });

    expect(screen.getByTestId("message-count").textContent).toContain("4 条消息");
    expect(screen.getByTestId("chat-action-feedback").textContent).toContain("发送成功，Eliy 已回复");
    expectNoTechnicalTerms();
  });

  it("supports repeated sends with consistent counts and feedback", async () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-item-ui-preview"));
    scrollIntoViewMock.mockClear();

    const input = screen.getByPlaceholderText("输入想和 Eliy 讨论的问题") as HTMLTextAreaElement;

    fireEvent.change(input, {
      target: { value: "第一条需求" },
    });
    fireEvent.click(screen.getByTestId("composer-send"));

    await waitFor(() => {
      expect(screen.getByTestId("message-count").textContent).toContain("4 条消息");
      expect(screen.getByTestId("composer-send-feedback").textContent).toContain("发送成功，Eliy 已回复");
      expect(screen.getByTestId("chat-thread").textContent).toContain("第一条需求");
    });

    fireEvent.change(input, {
      target: { value: "第二条需求" },
    });
    fireEvent.click(screen.getByTestId("composer-send"));

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(6);
      expect(screen.getByTestId("chat-thread").textContent).toContain("第二条需求");
      expect(messages[messages.length - 1]?.textContent).toContain(buildMockAssistantReply("第二条需求"));
      expect(screen.getByTestId("composer-send-feedback").textContent).toContain("发送成功，Eliy 已回复");
    });

    expect(screen.getByTestId("message-count").textContent).toContain("6 条消息");
    expect((screen.getByTestId("composer-input") as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps the right workspace independent from chat content", () => {
    renderShell();

    const threadShell = screen.getByTestId("chat-thread-shell");

    fireEvent.click(screen.getByTestId("workspace-toggle"));

    const artifactWorkspace = screen.getByTestId("artifact-workspace");

    expect(artifactWorkspace.getAttribute("data-surface")).toBe("simple");
    expect(artifactWorkspace.closest('[data-testid="chat-thread-shell"]')).toBeNull();
    expect(threadShell.contains(artifactWorkspace)).toBe(false);
    expect(artifactWorkspace.textContent).toContain("工作区");
    expect(artifactWorkspace.textContent).toContain("这里会显示 Eliy 为你整理出的行动、资料和 O 单。");
    expect(artifactWorkspace.textContent).not.toContain("行动整理");
    expect(artifactWorkspace.textContent).not.toContain("资料区");
    expect(artifactWorkspace.textContent).not.toContain("备注");
    expect(screen.getByTestId("otunit-workspace")).toBeTruthy();
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("行动整理");
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("资料区");
    expect(screen.getByTestId("chat-thread").textContent ?? "").not.toContain("备注");
  });

  it("builds simplified assistant replies", () => {
    const sample = "需要一个更轻的体验版本";

    expect(buildMockAssistantReply(sample)).toBe(buildMockAssistantReply(sample));
    expect(buildMockAssistantReply("   ")).toContain("空输入");
    expect(buildMockAssistantReply(sample)).toContain("我已为你整理下一步。");
    expect(buildMockAssistantReply(sample)).not.toContain("Mock");
    expect(buildMockAssistantReply(sample)).not.toContain("确定性");
  });
});
