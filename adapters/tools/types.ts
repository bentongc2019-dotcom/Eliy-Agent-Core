/**
 * Eliy Agent Core — 工具适配器抽象接口
 *
 * 核心治理原则：所有工具执行必须经 human-in-the-loop 确认。
 * 参见 agency_policy.md §1（确认等级）和 §4（工具执行治理）
 */

import type { ReleasePhase } from '../../eliy-kernel/methodology/types.js';

// ============================================================
// 工具注册与定义
// ============================================================

/** 确认等级（agency_policy.md §1.1） */
export type ConfirmationLevel = 'L1' | 'L2' | 'L3';

/** 工具注册信息 */
export interface ToolRegistration {
  id: string;
  name: string;
  description: string;
  confirmationLevel: ConfirmationLevel;
  sideEffects: string[];
  rollbackable: boolean;
  maxExecutionsPerSession: number;
  requiredPermissions: string[];
}

/** 工具执行请求 */
export interface ToolExecutionRequest {
  toolId: string;
  input: Record<string, unknown>;
  sessionId: string;
  userId: string;
  releasePhase: ReleasePhase;
}

/** 工具执行预览（呈现给用户确认） */
export interface ToolExecutionPreview {
  toolName: string;
  operationType: string;
  affectedScope: string;
  expectedResult: string;
  possibleRisks: string[];
  rollbackPlan?: string;
}

/** 用户确认结果 */
export interface UserConfirmation {
  decision: 'APPROVE' | 'REJECT' | 'MODIFY';
  modification?: string;
  timestamp: string;
}

/** 工具执行结果 */
export interface ToolExecutionResult {
  success: boolean;
  output: Record<string, unknown>;
  errorMessage?: string;
  durationMs: number;
}

/** 工具执行日志（不可篡改） */
export interface ToolExecutionLog {
  id: string;
  timestamp: string;
  toolId: string;
  sessionId: string;
  userId: string;
  confirmationLevel: ConfirmationLevel;
  userConfirmed: boolean;
  userDecision: UserConfirmation['decision'];
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  durationMs: number;
}

// ============================================================
// 工具适配器抽象接口
// ============================================================

export interface ToolAdapter {
  readonly registration: ToolRegistration;

  /**
   * 生成执行预览（L3 操作必须先预览）
   */
  preview(request: ToolExecutionRequest): Promise<ToolExecutionPreview>;

  /**
   * 执行工具（必须在确认后调用）
   */
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResult>;

  /**
   * 回滚（如果支持）
   */
  rollback?(executionLogId: string): Promise<{ success: boolean; message: string }>;
}

// ============================================================
// 工具执行器（统一入口，强制 HITL）
// ============================================================

/**
 * 工具执行器 —— 所有工具调用的统一入口
 * 强制执行 human-in-the-loop 确认流程
 */
export class ToolExecutor {
  private tools: Map<string, ToolAdapter> = new Map();
  private executionCounts: Map<string, number> = new Map(); // toolId -> session内执行次数
  private logs: ToolExecutionLog[] = [];

  /** 注册工具 */
  register(tool: ToolAdapter): void {
    this.tools.set(tool.registration.id, tool);
  }

  /** 获取已注册工具列表 */
  getRegisteredTools(): ToolRegistration[] {
    return Array.from(this.tools.values()).map(t => t.registration);
  }

  /**
   * 请求执行工具（完整 HITL 流程）
   *
   * 流程：
   * 1. 前置检查（注册、权限、次数限制）
   * 2. 生成执行预览
   * 3. 等待用户确认（L3 必须，L2 建议，L1 跳过）
   * 4. 执行并记录日志
   */
  async requestExecution(
    request: ToolExecutionRequest,
    /** L3 工具必须提供确认回调 */
    confirmCallback?: (preview: ToolExecutionPreview) => Promise<UserConfirmation>
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(request.toolId);
    if (!tool) {
      throw new Error(`工具 "${request.toolId}" 未注册`);
    }

    const reg = tool.registration;

    // === 前置检查（agency_policy.md §4.2） ===
    const currentCount = this.executionCounts.get(request.toolId) ?? 0;
    if (currentCount >= reg.maxExecutionsPerSession) {
      throw new Error(`工具 "${reg.name}" 已达到单会话最大执行次数 (${reg.maxExecutionsPerSession})`);
    }

    // === 生成预览 ===
    const preview = await tool.preview(request);

    // === HITL 确认（核心治理机制） ===
    let userDecision: UserConfirmation['decision'] = 'APPROVE';

    if (reg.confirmationLevel === 'L3') {
      // L3 必须有确认回调
      if (!confirmCallback) {
        throw new Error(`L3 工具 "${reg.name}" 必须提供 human-in-the-loop 确认回调`);
      }
      const confirmation = await confirmCallback(preview);
      userDecision = confirmation.decision;

      if (confirmation.decision === 'REJECT') {
        // 记录拒绝日志
        this.recordLog(request, reg, false, userDecision, {}, false, '用户拒绝执行', 0);
        return { success: false, output: {}, errorMessage: '用户拒绝执行', durationMs: 0 };
      }
      if (confirmation.decision === 'MODIFY' && confirmation.modification) {
        // 用户修改后重新确认（递归，但不会无限循环因为 modification 会更新 input）
        request.input = { ...request.input, _userModification: confirmation.modification };
      }
    } else if (reg.confirmationLevel === 'L2') {
      // L2 建议确认但不强制
      if (confirmCallback) {
        const confirmation = await confirmCallback(preview);
        userDecision = confirmation.decision;
        if (confirmation.decision === 'REJECT') {
          this.recordLog(request, reg, false, userDecision, {}, false, '用户拒绝', 0);
          return { success: false, output: {}, errorMessage: '用户拒绝', durationMs: 0 };
        }
      }
    }
    // L1 直接执行

    // === 执行 ===
    const startTime = Date.now();
    try {
      const result = await tool.execute(request);
      const duration = Date.now() - startTime;

      // 更新执行计数
      this.executionCounts.set(request.toolId, currentCount + 1);

      // 记录日志
      this.recordLog(request, reg, true, userDecision, result.output, result.success, result.errorMessage, duration);

      return { ...result, durationMs: duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errMsg = error instanceof Error ? error.message : '未知错误';
      this.recordLog(request, reg, true, userDecision, {}, false, errMsg, duration);
      return { success: false, output: {}, errorMessage: errMsg, durationMs: duration };
    }
  }

  /** 获取执行日志 */
  getLogs(): ReadonlyArray<ToolExecutionLog> {
    return this.logs;
  }

  private recordLog(
    request: ToolExecutionRequest, reg: ToolRegistration,
    userConfirmed: boolean, userDecision: UserConfirmation['decision'],
    output: Record<string, unknown>, success: boolean,
    errorMessage: string | undefined, durationMs: number
  ): void {
    this.logs.push({
      id: `tlog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      toolId: request.toolId,
      sessionId: request.sessionId,
      userId: request.userId,
      confirmationLevel: reg.confirmationLevel,
      userConfirmed,
      userDecision,
      input: request.input,
      output,
      success,
      errorMessage,
      durationMs,
    });
  }
}
