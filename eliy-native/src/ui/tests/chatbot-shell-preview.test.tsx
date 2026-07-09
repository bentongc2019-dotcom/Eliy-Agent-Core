// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { renderAssistantUiChatbotShellPreview } from "../preview/app.js";

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
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("assistant-ui preview harness", () => {
  it("renders the assistant-ui shell into a provided mount node", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = renderAssistantUiChatbotShellPreview(container);

    await waitFor(() => {
      expect(screen.getByTestId("left-workspace")).toBeTruthy();
      expect(screen.getByTestId("chat-thread-shell")).toBeTruthy();
      expect(screen.getByTestId("composer-shell")).toBeTruthy();
      expect(screen.getByTestId("artifact-workspace")).toBeTruthy();
    });

    root.unmount();
  });

  it("mounts when the preview entry is imported", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("../preview/main.js");

    await waitFor(() => {
      expect(screen.getByTestId("chat-thread-shell")).toBeTruthy();
      expect(screen.getByTestId("message-count").textContent).toContain("2 messages");
    });
  });
});
