/**
 * Eliy Agent Core — Workflow Engine 适配器抽象接口
 *
 * 定义统一的工作流引擎接口，支持未来切换底层实现：
 * - LangGraph（图结构 agent）
 * - Mastra（TypeScript-native agent）
 * - Vercel AI SDK（edge-friendly）
 *
 * 核心原则：Eliy 的判断逻辑在 kernel 内，workflow 引擎只是"执行管道"。
 */

import type { MethodologyInput, MethodologyOutput, ReleasePhase } from '../../eliy-kernel/methodology/types.js';

// ============================================================
// Workflow 类型定义
// ============================================================

/** 工作流步骤 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'LLM_CALL' | 'METHODOLOGY' | 'TOOL_CALL' | 'HUMAN_INPUT' | 'DECISION';
  /** 步骤配置 */
  config: Record<string, unknown>;
  /** 前置步骤 ID（DAG 依赖） */
  dependsOn: string[];
}

/** 工作流定义 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  /** 适用的投料阶段 */
  applicablePhases: ReleasePhase[];
  /** 步骤列表 */
  steps: WorkflowStep[];
}

/** 工作流执行状态 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'PENDING' | 'RUNNING' | 'WAITING_HUMAN' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentStepId: string;
  /** 步骤执行结果 */
  stepResults: Map<string, unknown>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

/** 工作流事件（用于 streaming 状态更新） */
export interface WorkflowEvent {
  type: 'STEP_START' | 'STEP_COMPLETE' | 'STEP_ERROR' | 'HUMAN_INPUT_REQUIRED' | 'WORKFLOW_COMPLETE';
  stepId?: string;
  data: unknown;
  timestamp: string;
}

// ============================================================
// Workflow Engine 抽象接口
// ============================================================

export interface WorkflowEngine {
  readonly name: string;
  readonly version: string;

  /** 注册工作流定义 */
  registerWorkflow(definition: WorkflowDefinition): void;

  /** 启动工作流执行 */
  startExecution(workflowId: string, input: Record<string, unknown>): Promise<WorkflowExecution>;

  /** 提供人类输入（resume from WAITING_HUMAN） */
  provideHumanInput(executionId: string, stepId: string, input: unknown): Promise<void>;

  /** 取消执行 */
  cancelExecution(executionId: string): Promise<void>;

  /** 获取执行状态 */
  getExecution(executionId: string): Promise<WorkflowExecution>;

  /** 订阅工作流事件（streaming） */
  subscribe(executionId: string): AsyncIterable<WorkflowEvent>;
}

// ============================================================
// 骨架实现（占位）
// ============================================================

/** LangGraph 适配器骨架 */
export class LangGraphAdapter implements WorkflowEngine {
  readonly name = 'LangGraph';
  readonly version = '0.0.1-spike';
  registerWorkflow(_def: WorkflowDefinition): void { /* spike */ }
  async startExecution(_id: string, _input: Record<string, unknown>): Promise<WorkflowExecution> {
    throw new Error('LangGraph adapter: 待 spike 实现');
  }
  async provideHumanInput(): Promise<void> { throw new Error('待实现'); }
  async cancelExecution(): Promise<void> { throw new Error('待实现'); }
  async getExecution(): Promise<WorkflowExecution> { throw new Error('待实现'); }
  async *subscribe(): AsyncIterable<WorkflowEvent> { throw new Error('待实现'); }
}

/** Mastra 适配器骨架 */
export class MastraAdapter implements WorkflowEngine {
  readonly name = 'Mastra';
  readonly version = '0.0.1-spike';
  registerWorkflow(_def: WorkflowDefinition): void { /* spike */ }
  async startExecution(): Promise<WorkflowExecution> { throw new Error('Mastra adapter: 待 spike 实现'); }
  async provideHumanInput(): Promise<void> { throw new Error('待实现'); }
  async cancelExecution(): Promise<void> { throw new Error('待实现'); }
  async getExecution(): Promise<WorkflowExecution> { throw new Error('待实现'); }
  async *subscribe(): AsyncIterable<WorkflowEvent> { throw new Error('待实现'); }
}

/** Vercel AI SDK 适配器骨架 */
export class VercelAIAdapter implements WorkflowEngine {
  readonly name = 'Vercel AI SDK';
  readonly version = '0.0.1-spike';
  registerWorkflow(_def: WorkflowDefinition): void { /* spike */ }
  async startExecution(): Promise<WorkflowExecution> { throw new Error('Vercel AI adapter: 待 spike 实现'); }
  async provideHumanInput(): Promise<void> { throw new Error('待实现'); }
  async cancelExecution(): Promise<void> { throw new Error('待实现'); }
  async getExecution(): Promise<WorkflowExecution> { throw new Error('待实现'); }
  async *subscribe(): AsyncIterable<WorkflowEvent> { throw new Error('待实现'); }
}
