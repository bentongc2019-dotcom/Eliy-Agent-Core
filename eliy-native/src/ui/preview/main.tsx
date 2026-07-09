import { renderAssistantUiChatbotShellPreview } from "./app.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("AssistantUiChatbotShell preview requires a #root element.");
}

renderAssistantUiChatbotShellPreview(root);
