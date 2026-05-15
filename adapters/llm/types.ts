/**
 * Eliy Agent Core — LLM 适配器抽象接口
 *
 * 所有 LLM 调用必须经此层隔离，确保：
 * 1. Eliy 不被任何单一 LLM 厂商绑死
 * 2. 所有 LLM 调用受宪法约束（判断纪律、投料控制）
 * 3. 支持 streaming 输出
 */

import type { ReleasePhase, ConfidenceLevel } from '../../eliy-kernel/methodology/types.js';

// ============================================================
// LLM 消息类型
// ============================================================

export type MessageRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: MessageRole;
  content: string;
  /** 可选：附加元数据（如数据源引用） */
  metadata?: Record<string, unknown>;
}

// ============================================================
// LLM 请求/响应
// ============================================================

export interface LLMRequest {
  messages: LLMMessage[];
  /** 系统级指令（由 HLAMT Language 层生成） */
  systemPrompt?: string;
  /** 当前投料阶段（影响 LLM 的输出控制） */
  releasePhase: ReleasePhase;
  /** 温度参数 0-1 */
  temperature?: number;
  /** 最大输出 token */
  maxTokens?: number;
  /** 是否启用 streaming */
  stream?: boolean;
  /** 治理元数据 */
  governance: {
    sessionId: string;
    userId: string;
    /** 本次调用的目的分类 */
    purpose: 'DIAGNOSIS' | 'COMMUNICATION' | 'ARTIFACT_GENERATION' | 'INTERNAL_REASONING';
  };
}

export interface LLMResponse {
  content: string;
  /** 模型标识 */
  model: string;
  /** token 用量 */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因 */
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  /** 响应耗时 (ms) */
  latencyMs: number;
}

/** Streaming chunk */
export interface LLMStreamChunk {
  content: string;
  done: boolean;
  /** 累计 token（仅最后一个 chunk 有） */
  usage?: LLMResponse['usage'];
}

// ============================================================
// LLM 适配器抽象接口
// ============================================================

/**
 * 所有 LLM 适配器必须实现此接口。
 * 具体实现（OpenAI / Anthropic / 本地模型）在各自文件中。
 */
export interface LLMAdapter {
  /** 适配器名称 */
  readonly name: string;
  /** 默认模型 ID */
  readonly defaultModel: string;
  /** 支持的模型列表 */
  readonly supportedModels: string[];

  /**
   * 发送请求并获取完整响应
   */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * 发送请求并获取 streaming 响应
   */
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;

  /**
   * 健康检查 —— API 是否可用
   */
  healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }>;
}

// ============================================================
// 治理 Hook（所有 LLM 调用前的合规检查）
// ============================================================

export interface LLMGovernanceHook {
  /**
   * 调用前检查
   * - 检查投料阶段是否允许该类型的 LLM 调用
   * - 检查 prompt 是否违反宪法（如试图绕过角色坚守）
   */
  preCallCheck(request: LLMRequest): GovernanceCheckResult;

  /**
   * 调用后检查
   * - 检查输出是否包含违反宪法的内容（如空洞鼓励）
   * - 检查输出是否超出当前投料阶段的信息释放量
   */
  postCallCheck(request: LLMRequest, response: LLMResponse): GovernanceCheckResult;
}

export interface GovernanceCheckResult {
  passed: boolean;
  violations: Array<{
    rule: string;           // 违反的规则
    severity: 'BLOCK' | 'WARN';  // 阻断还是警告
    description: string;
  }>;
}

/**
 * 默认治理 Hook 实现
 * 基础合规检查，可被子类覆盖扩展
 */
export class DefaultLLMGovernance implements LLMGovernanceHook {
  preCallCheck(request: LLMRequest): GovernanceCheckResult {
    const violations: GovernanceCheckResult['violations'] = [];

    // 规则 1：必须有 governance 元数据
    if (!request.governance?.sessionId || !request.governance?.userId) {
      violations.push({
        rule: 'constitution.missing_governance_metadata',
        severity: 'BLOCK',
        description: 'LLM 调用缺少治理元数据（sessionId/userId）',
      });
    }

    // 规则 2：INTAKE 阶段不应使用 ARTIFACT_GENERATION 目的
    if (request.releasePhase === 'INTAKE' && request.governance?.purpose === 'ARTIFACT_GENERATION') {
      violations.push({
        rule: 'agency_policy.release_control',
        severity: 'WARN',
        description: 'INTAKE 阶段不应生成工件，当前应聚焦于信息收集',
      });
    }

    return { passed: violations.filter(v => v.severity === 'BLOCK').length === 0, violations };
  }

  postCallCheck(request: LLMRequest, response: LLMResponse): GovernanceCheckResult {
    const violations: GovernanceCheckResult['violations'] = [];

    // 规则：检测空洞表达（LANGUAGE.md 黑名单简化版）
    const hollowPhrases = ['加油，你一定可以', '相信自己', '你说得对'];
    for (const phrase of hollowPhrases) {
      if (response.content.includes(phrase)) {
        violations.push({
          rule: 'language.hollow_expression',
          severity: 'WARN',
          description: `检测到空洞表达: "${phrase}"`,
        });
      }
    }

    return { passed: violations.filter(v => v.severity === 'BLOCK').length === 0, violations };
  }
}
