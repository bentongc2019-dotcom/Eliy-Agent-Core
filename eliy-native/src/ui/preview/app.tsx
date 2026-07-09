import { createRoot, type Root } from "react-dom/client";

import { AssistantUiChatbotShell } from "../index.js";

export function renderAssistantUiChatbotShellPreview(container: Element): Root {
  const root = createRoot(container);
  root.render(<AssistantUiChatbotShell />);
  return root;
}
