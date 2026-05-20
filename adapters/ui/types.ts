/**
 * Eliy Agent Core — UI 适配器抽象接口 + WebChat 实现
 *
 * WebChat 是 Eliy 的"临时壳"（宪法精神：UI 不是核心），但必须提供：
 * 1. 实时 streaming 输出
 * 2. 语音 STT/TTS 集成
 * 3. 诊断报告实时渲染
 * 4. HITL 确认按钮
 * 5. 投料阶段可视化
 * 6. Silent 能力判断采集（不打扰用户的能力评估）
 */

import type { ReleasePhase, MethodologyOutput } from '../../eliy-kernel/methodology/types.js';
import type { LLMStreamChunk } from '../llm/types.js';
import type { ToolExecutionPreview, UserConfirmation } from '../tools/types.js';
import type { STTAdapter, TTSAdapter } from '../voice/types.js';

// ============================================================
// UI 事件系统
// ============================================================

/** UI → Eliy Kernel 的事件 */
export type UIInputEvent =
  | { type: 'USER_MESSAGE'; content: string; timestamp: string }
  | { type: 'VOICE_INPUT'; audio: ArrayBuffer; timestamp: string }
  | { type: 'HITL_CONFIRM'; judgmentId: string; decision: UserConfirmation['decision']; modification?: string }
  | { type: 'RADAR_ADJUST'; dimension: string; newScore: number }
  | { type: 'PHASE_INQUIRY'; question: string }
  | { type: 'SESSION_START'; userId: string }
  | { type: 'SESSION_END' }
  | { type: 'SWITCH_LLM'; adapterName: string };

/** Eliy Kernel → UI 的事件 */
export type UIOutputEvent =
  | { type: 'TEXT_CHUNK'; content: string; done: boolean }
  | { type: 'VOICE_OUTPUT'; audio: ArrayBuffer }
  | { type: 'PHASE_UPDATE'; phase: ReleasePhase; progress: number }
  | { type: 'RADAR_UPDATE'; scores: Record<string, number> }
  | { type: 'JUDGMENT_PENDING'; judgmentId: string; statement: string; confidence: string }
  | { type: 'TOOL_CONFIRM_REQUEST'; preview: ToolExecutionPreview }
  | { type: 'ARTIFACT_READY'; artifactType: string; htmlUrl: string }
  | { type: 'INFO_GAP_REQUEST'; question: string; importance: string }
  | { type: 'ERROR'; message: string; recoverable: boolean };

// ============================================================
// UI 适配器抽象接口
// ============================================================

export interface UIAdapter {
  readonly name: string;

  /** 初始化 UI 连接 */
  connect(config: UIConfig): Promise<void>;

  /** 发送事件到 UI */
  emit(event: UIOutputEvent): void;

  /** 监听 UI 输入事件 */
  onInput(handler: (event: UIInputEvent) => void): void;

  /** 断开连接 */
  disconnect(): void;
}

export interface UIConfig {
  sessionId: string;
  userId: string;
  /** 初始投料阶段 */
  initialPhase: ReleasePhase;
  /** 语音适配器（可选） */
  stt?: STTAdapter;
  tts?: TTSAdapter;
  /** 主题配置 */
  theme?: UITheme;
}

export interface UITheme {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  accentColor: string;
  fontFamily: string;
}

// ============================================================
// WebChat 适配器实现
// ============================================================

/**
 * WebChat 适配器
 *
 * 提供专业商业 UI 的事件接口层。
 * 实际 HTML/CSS 渲染在前端完成，此适配器负责：
 * - 事件路由（UI ↔ Kernel）
 * - streaming 管理
 * - 语音集成
 * - silent 能力采集
 */
export class WebChatAdapter implements UIAdapter {
  readonly name = 'WebChat';

  private inputHandlers: Array<(event: UIInputEvent) => void> = [];
  private config: UIConfig | null = null;

  // === Silent 能力判断采集 ===
  // 大白话：在不打扰用户的情况下，通过用户的交互模式评估能力维度
  private silentCollector: SilentCapabilityCollector;

  constructor() {
    this.silentCollector = new SilentCapabilityCollector();
  }

  async connect(config: UIConfig): Promise<void> {
    this.config = config;
    // 初始化 WebSocket / SSE 连接
    // TODO: 实际的 WebSocket 实现
    console.log(`[WebChat] 已连接: session=${config.sessionId}, phase=${config.initialPhase}`);
  }

  emit(event: UIOutputEvent): void {
    // 将 Kernel 事件转发到前端
    // TODO: 通过 WebSocket 发送到前端
    switch (event.type) {
      case 'TEXT_CHUNK':
        // streaming 文字输出
        break;
      case 'PHASE_UPDATE':
        // 更新投料阶段进度条
        break;
      case 'RADAR_UPDATE':
        // 实时更新能力雷达图
        break;
      case 'JUDGMENT_PENDING':
        // 弹出 HITL 确认 UI
        break;
      case 'TOOL_CONFIRM_REQUEST':
        // 弹出工具确认对话框（L3）
        break;
      case 'ARTIFACT_READY':
        // 提示用户可查看诊断报告
        break;
      case 'INFO_GAP_REQUEST':
        // 温和地向用户提问补充信息
        break;
    }
  }

  onInput(handler: (event: UIInputEvent) => void): void {
    this.inputHandlers.push(handler);
  }

  disconnect(): void {
    this.inputHandlers = [];
    this.config = null;
  }

  // === 内部方法 ===

  /**
   * 处理前端传入的原始事件
   * 由 WebSocket 的 onMessage 调用
   */
  handleRawInput(rawEvent: UIInputEvent): void {
    // Silent 采集：分析用户交互模式
    this.silentCollector.observe(rawEvent);

    // 分发给所有注册的 handler
    for (const handler of this.inputHandlers) {
      handler(rawEvent);
    }
  }

  /** 获取 silent 采集的能力评估 */
  getSilentAssessment(): Record<string, number> {
    return this.silentCollector.getAssessment();
  }
}

// ============================================================
// Silent 能力判断采集器
// ============================================================

/**
 * 不打扰用户的能力评估收集器
 *
 * 通过分析用户的交互模式（响应速度、问题深度、修改频率等）
 * 静默收集能力维度数据，用于雷达图的初始化。
 *
 * 注意：这些数据仅作为辅助参考，不会替代用户主动提供的信息。
 * 符合 HUMAN.md 的"不猜测，要确认"原则。
 */
class SilentCapabilityCollector {
  private interactions: Array<{
    type: string;
    timestamp: number;
    contentLength?: number;
  }> = [];

  /** 观察一个交互事件 */
  observe(event: UIInputEvent): void {
    const entry: (typeof this.interactions)[number] = {
      type: event.type,
      timestamp: Date.now(),
    };

    if (event.type === 'USER_MESSAGE') {
      entry.contentLength = event.content.length;
    }

    this.interactions.push(entry);
  }

  /**
   * 获取能力评估（0-1 分数）
   * 这些分数标记为 LOW 置信度，因为它们基于行为推断而非直接数据
   */
  getAssessment(): Record<string, number> {
    const msgCount = this.interactions.filter(i => i.type === 'USER_MESSAGE').length;
    const avgLength = this.interactions
      .filter(i => i.contentLength)
      .reduce((sum, i) => sum + (i.contentLength ?? 0), 0) / Math.max(msgCount, 1);

    // 响应深度推断（消息越长，可能对问题思考越深入）
    const depthScore = Math.min(1, avgLength / 200);

    // 交互频率推断（频繁修改可能意味着不确定性高）
    const hitlEvents = this.interactions.filter(i => i.type === 'HITL_CONFIRM');
    const modifyRate = hitlEvents.length > 0
      ? hitlEvents.filter(i => i.type === 'HITL_CONFIRM').length / hitlEvents.length
      : 0.5;

    return {
      '分析深度': depthScore,
      '决策确定性': 1 - modifyRate,
      '_confidence': 0.2,           // 标记：这些评估的置信度很低
      '_source': 0,                 // 0 = silent（非用户主动提供）
    };
  }
}

// ============================================================
// Telegram / WhatsApp 骨架
// ============================================================

export class TelegramAdapter implements UIAdapter {
  readonly name = 'Telegram';
  async connect(_config: UIConfig) { throw new Error('Telegram adapter: 待实现'); }
  emit(_event: UIOutputEvent) { throw new Error('待实现'); }
  onInput(_handler: (event: UIInputEvent) => void) { throw new Error('待实现'); }
  disconnect() { /* noop */ }
}

export class WhatsAppAdapter implements UIAdapter {
  readonly name = 'WhatsApp';
  async connect(_config: UIConfig) { throw new Error('WhatsApp adapter: 待实现'); }
  emit(_event: UIOutputEvent) { throw new Error('待实现'); }
  onInput(_handler: (event: UIInputEvent) => void) { throw new Error('待实现'); }
  disconnect() { /* noop */ }
}
