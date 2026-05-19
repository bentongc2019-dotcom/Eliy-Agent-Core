/**
 * Eliy Agent Core — Adapters 统一出口
 *
 * 所有外部依赖通过此层隔离，确保 eliy-kernel 的纯净性。
 * Kernel 只依赖接口定义，不依赖任何具体实现。
 */

// === LLM 适配器 ===
export type {
  LLMAdapter, LLMRequest, LLMResponse, LLMMessage,
  LLMStreamChunk, LLMGovernanceHook, GovernanceCheckResult,
} from './llm/types.js';
export { DefaultLLMGovernance } from './llm/types.js';
export { OpenAIAdapter } from './llm/openai.js';
export { AnthropicAdapter } from './llm/anthropic.js';
export { LocalLLMAdapter } from './llm/local.js';
export { DeepSeekAdapter } from './llm/deepseek.js';

// === 工具适配器 ===
export type {
  ToolAdapter, ToolRegistration, ToolExecutionRequest,
  ToolExecutionPreview, ToolExecutionResult, UserConfirmation,
  ConfirmationLevel,
} from './tools/types.js';
export { ToolExecutor } from './tools/types.js';
export { CalendarTool, EmailTool, FileTool, BrowserTool } from './tools/implementations.js';

// === Workflow 引擎 ===
export type {
  WorkflowEngine, WorkflowDefinition, WorkflowStep,
  WorkflowExecution, WorkflowEvent,
} from './workflow/types.js';
export { LangGraphAdapter, MastraAdapter, VercelAIAdapter } from './workflow/types.js';

// === 存储适配器 ===
export type {
  RelationalStorage, VectorStorage,
  SessionRecord, ProfileRecord, ExecutionLogRecord,
  VectorEntry, VectorSearchResult,
} from './storage/types.js';
export { PostgresStorage, VectorStore } from './storage/types.js';

// === 语音适配器 ===
export type { STTAdapter, TTSAdapter, STTResult, TTSResult } from './voice/types.js';
export { DefaultSTT, DefaultTTS } from './voice/types.js';

// === UI 适配器 ===
export type {
  UIAdapter, UIConfig, UITheme,
  UIInputEvent, UIOutputEvent,
} from './ui/types.js';
export { WebChatAdapter, TelegramAdapter, WhatsAppAdapter } from './ui/types.js';
