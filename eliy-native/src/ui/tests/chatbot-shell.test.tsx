// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("renders the conversation list and defaults to the first visible conversation", () => {
    renderShell();

    expect(screen.getByTestId("left-workspace")).toBeTruthy();
    expect(screen.getByTestId("conversation-section-pinned")).toBeTruthy();
    expect(screen.getByTestId("conversation-section-projects")).toBeTruthy();
    expect(screen.getByTestId("conversation-section-recent")).toBeTruthy();
    expect(screen.getByTestId("chat-thread-shell")).toBeTruthy();
    expect(screen.getByTestId("chat-thread")).toBeTruthy();
    expect(screen.getByTestId("composer-shell")).toBeTruthy();
    expect(screen.getByTestId("artifact-workspace")).toBeTruthy();

    expect(screen.getByTestId("conversation-item-focus-opdca").textContent).toContain("O'PDCA 体验客户访谈");
    expect(screen.getByTestId("conversation-item-ui-preview").textContent).toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("conversation-item-weekly-review").textContent).toContain("每周复盘草稿");

    const selectedConversation = screen.getByTestId("conversation-item-focus-opdca");
    expect(selectedConversation.getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已选择：O'PDCA 体验客户访谈");
    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("O'PDCA 体验客户访谈");
    expect(screen.getByTestId("chat-thread").textContent).toContain(
      "Eliy：这是 O'PDCA 体验客户访谈的本地 Mock 对话。",
    );
    expect(screen.getByTestId("chat-thread").textContent).not.toContain('"id":');
  });

  it("updates the selected conversation and thread when another item is selected", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-item-ui-preview"));

    expect(screen.getByTestId("conversation-item-ui-preview").getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId("conversation-item-focus-opdca").getAttribute("data-selected")).toBeNull();
    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("chat-thread").textContent).toContain(
      "Eliy：这是 ChatBot Shell 视觉验收的本地 Mock 对话。",
    );
    expect(screen.getByTestId("chat-thread").textContent).toContain("目前所有操作都只影响前端 local state。");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已选择：ChatBot Shell 视觉验收");
  });

  it("keeps action clicks on the item from being swallowed by the parent selection surface", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-action-pin-ui-preview"));

    expect(screen.getByTestId("conversation-item-focus-opdca").getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId("conversation-section-pinned").textContent).toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已置顶：ChatBot Shell 视觉验收");
  });

  it("pins and unpins conversations without leaving local state", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-action-pin-ui-preview"));

    expect(screen.getByTestId("conversation-section-pinned").textContent).toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("conversation-section-recent").textContent).not.toContain("ChatBot Shell 视觉验收");
    expect(screen.getByText("产品壳 · 1")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-pin-ui-preview").textContent).toBe("取消置顶");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已置顶：ChatBot Shell 视觉验收");

    fireEvent.click(screen.getByTestId("conversation-action-pin-ui-preview"));

    expect(screen.getByTestId("conversation-section-pinned").textContent).not.toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("conversation-section-recent").textContent).toContain("ChatBot Shell 视觉验收");
    expect(screen.getByText("产品壳 · 1")).toBeTruthy();
    expect(screen.getByTestId("conversation-action-pin-ui-preview").textContent).toBe("置顶");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已取消置顶：ChatBot Shell 视觉验收");
  });

  it("renames the selected conversation and keeps the thread title in sync", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-select-weekly-review"));
    fireEvent.click(screen.getByTestId("conversation-action-rename-weekly-review"));

    expect(screen.getByTestId("conversation-item-weekly-review").textContent).toContain("每周复盘草稿（已重命名）");
    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("每周复盘草稿（已重命名）");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已重命名：每周复盘草稿（已重命名）");

    fireEvent.click(screen.getByTestId("conversation-action-rename-weekly-review"));

    const renamedItem = screen.getByTestId("conversation-item-weekly-review").textContent ?? "";
    expect(renamedItem.match(/（已重命名）/g)).toHaveLength(1);
    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("每周复盘草稿（已重命名）");
  });

  it("moves a conversation into the mock project summary", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-item-weekly-review"));
    fireEvent.click(screen.getByTestId("conversation-action-move-weekly-review"));

    expect(screen.getByTestId("conversation-item-weekly-review").textContent).toContain("项目：Mock 项目");
    expect(screen.getByText("Mock 项目 · 1")).toBeTruthy();
    expect(screen.getByTestId("selected-conversation-project").textContent).toBe("项目：Mock 项目");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已移动到 Mock 项目：每周复盘草稿");
  });

  it("archives the selected conversation and advances to the next visible one", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-action-archive-focus-opdca"));

    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("conversation-section-archived").textContent).toContain("O'PDCA 体验客户访谈");
    expect(screen.queryByTestId("conversation-select-focus-opdca")).toBeNull();
    expect(screen.getByTestId("conversation-section-recent").textContent).not.toContain("O'PDCA 体验客户访谈");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain(
      "已归档：O'PDCA 体验客户访谈，已选择：ChatBot Shell 视觉验收",
    );
  });

  it("deletes the selected conversation and advances to the next visible one", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-select-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-delete-ui-preview"));

    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("每周复盘草稿");
    expect(screen.queryByTestId("conversation-select-ui-preview")).toBeNull();
    expect(screen.getByTestId("conversation-section-recent").textContent).not.toContain("ChatBot Shell 视觉验收");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain(
      "已删除：ChatBot Shell 视觉验收，已选择：每周复盘草稿",
    );
  });

  it("appends deterministic mock turns to the selected conversation", async () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-select-ui-preview"));

    const input = screen.getByPlaceholderText("输入一段本地 Mock 提示") as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: "需要一个更轻的 IA 视觉对齐版本" },
    });
    fireEvent.click(screen.getByTestId("composer-send"));

    const expectedReply = buildMockAssistantReply("需要一个更轻的 IA 视觉对齐版本");

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(4);
      expect(screen.getByTestId("chat-thread").textContent).toContain("需要一个更轻的 IA 视觉对齐版本");
      expect(screen.getByTestId("chat-thread").textContent).not.toContain('"id":');
      expect(screen.getByTestId("chat-thread").textContent).not.toContain("unstable_data");
      expect(screen.getByTestId("chat-thread").textContent).not.toContain("runConfig");
      expect(screen.getByTestId("chat-thread").textContent).not.toContain("metadata");
      expect(messages[messages.length - 1]?.textContent).toContain(expectedReply);
    });

    await waitFor(() => {
      expect((screen.getByTestId("composer-input") as HTMLTextAreaElement).value).toBe("");
    });

    expect(screen.getByTestId("message-count").textContent).toContain("4 条消息");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain(
      "已发送 Mock：需要一个更轻的 IA 视觉对齐版本",
    );
  });

  it("keeps the right workspace independent from the chat thread", () => {
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

  it("falls back to an empty state when no visible conversation remains", () => {
    renderShell();

    fireEvent.click(screen.getByTestId("conversation-action-delete-focus-opdca"));
    fireEvent.click(screen.getByTestId("conversation-action-delete-ui-preview"));
    fireEvent.click(screen.getByTestId("conversation-action-delete-weekly-review"));

    expect(screen.getByTestId("selected-conversation-title").textContent).toBe("暂无可见会话");
    expect(screen.getByTestId("message-count").textContent).toContain("0 条消息");
    expect(screen.getByPlaceholderText("当前没有可见会话")).toBeTruthy();
    expect(screen.getByTestId("chat-thread").textContent).toContain("当前没有可见会话");
    expect(screen.getByTestId("last-action-feedback").textContent).toContain("已删除：每周复盘草稿，暂无可见会话");
  });

  it("builds deterministic mock replies", () => {
    const sample = "The same input should always produce the same output.";

    expect(buildMockAssistantReply(sample)).toBe(buildMockAssistantReply(sample));
    expect(buildMockAssistantReply("   ")).toContain("空输入");
    expect(buildMockAssistantReply(sample)).toContain("The same input should always produce the same output.");
  });
});
