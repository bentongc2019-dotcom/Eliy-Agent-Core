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
  render(<AssistantUiChatbotShell />);
}

describe("AssistantUiChatbotShell", () => {
  it("renders the shell layout", () => {
    renderShell();

    expect(screen.getByTestId("left-workspace")).toBeTruthy();
    expect(screen.getByTestId("chat-thread-shell")).toBeTruthy();
    expect(screen.getByTestId("composer-shell")).toBeTruthy();
    expect(screen.getByTestId("artifact-workspace")).toBeTruthy();
  });

  it("lists the left workspace placeholders", () => {
    renderShell();

    const navigation = screen.getByLabelText("workspace navigation");
    const items = within(navigation).getAllByRole("button");
    expect(items.map((item) => item.textContent)).toEqual([
      "New Chat›",
      "Search›",
      "Knowledge›",
      "Tasks›",
      "Skills / Apps›",
      "Pinned›",
      "Projects›",
      "Recent / History›",
      "User / Settings›",
    ]);
  });

  it("renders deterministic mock thread messages", async () => {
    renderShell();

    const messages = await screen.findAllByTestId("chat-message");
    expect(messages).toHaveLength(2);
    expect(messages[0]?.textContent).toContain(
      "Eliy shell ready. The center thread is driven by assistant-ui with deterministic mock messages.",
    );
    expect(messages[1]?.textContent).toContain(
      "Use the composer below to append another mock turn. The right-side OTUnit workspace stays separate from the thread.",
    );
    expect(screen.getByTestId("message-count").textContent).toContain("2 messages");
  });

  it("keeps the composer mock submit deterministic", async () => {
    renderShell();

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: "Need a shell that keeps artifacts separate" },
    });
    fireEvent.click(screen.getByTestId("composer-send"));

    const expectedReply = buildMockAssistantReply(
      "Need a shell that keeps artifacts separate",
    );

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages[messages.length - 1]?.textContent).toContain(expectedReply);
    });

    await waitFor(() => {
      expect((screen.getByTestId("composer-input") as HTMLTextAreaElement).value).toBe("");
    });
  });

  it("keeps the artifact / OTUnit workspace separate from the thread", () => {
    renderShell();

    const artifactWorkspace = screen.getByTestId("artifact-workspace");
    const threadShell = screen.getByTestId("chat-thread-shell");

    expect(artifactWorkspace.closest('[data-testid="chat-thread-shell"]')).toBeNull();
    expect(threadShell.contains(artifactWorkspace)).toBe(false);
    expect(screen.getByTestId("otunit-workspace")).toBeTruthy();
  });

  it("builds deterministic mock replies", () => {
    const sample = "The same input should always produce the same output.";

    expect(buildMockAssistantReply(sample)).toBe(buildMockAssistantReply(sample));
    expect(buildMockAssistantReply("   ")).toContain("empty input");
    expect(buildMockAssistantReply(sample)).toContain("The same input should always produce the same output.");
  });
});
