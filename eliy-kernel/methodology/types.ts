/**
 * Eliy Agent Core — 方法论层共享类型定义
 * 
 * 所有方法论引擎（TP-Lite / S'FOCUS / Haystack Filter）的输入输出
 * 必须遵循本文件定义的统一接口。
 * 
 * 上位约束：
 *   - constitution.md 第四条（判断三原则：有据可依、置信度标注、可推翻性）
 *   - METHODOLOGY.md（方法论层调用协议）
 *   - ARTIFACTS.md（认知工件可追溯性）
 */

// ============================================================
// 投料阶段（来自 agency_policy.md §3.2）
// ============================================================

/** 投料阶段 —— Eliy 按纪律化节奏控制信息释放 */
export type ReleasePhase =
  | 'INTAKE'        // Phase 0：信息收集，几乎不给建议
  | 'FRAMING'       // Phase 1：框架构建，给出初步问题定义
  | 'DIAGNOSIS'     // Phase 2：深度诊断，核心结论 + 证据链
  | 'PRESCRIPTION'  // Phase 3：处方阶段，行动方案 + 优先级
  | 'FOLLOW_UP';    // Phase 4：跟踪复盘

// ============================================================
// 置信度体系（来自 constitution.md 第四条）
// ============================================================

/** 置信度等级 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** 置信度评估 */
export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  score: number;                    // 0-1 精确分数
  rationale: string;                // 为什么是这个置信度
  dataCompleteness: number;         // 输入数据完整度 0-1
  crossValidated: boolean;          // 是否经过多源交叉验证
}

// ============================================================
// 数据源引用（来自 ARTIFACTS.md 可追溯性要求）
// ============================================================

/** 数据源引用 —— 每个判断都必须追溯到具体数据 */
export interface DataSourceRef {
  id: string;
  type: 'USER_INPUT' | 'METHODOLOGY_OUTPUT' | 'EXTERNAL_DATA' | 'HISTORICAL_PATTERN';
  description: string;
  timestamp: string;
  rawDataSnapshot?: string;         // 原始数据快照（脱敏后）
}

// ============================================================
// 方法论输入（统一入口）
// ============================================================

/** 方法论统一输入接口 */
export interface MethodologyInput {
  /** 会话 ID */
  sessionId: string;
  /** 用户 ID */
  userId: string;
  /** 当前投料阶段 */
  currentPhase: ReleasePhase;
  /** 输入数据点列表 */
  dataPoints: DataPoint[];
  /** 用户的处境描述 */
  situationDescription: string;
  /** 已识别的约束条件 */
  constraints: ConstraintInput[];
  /** 上下文（历史分析结果等） */
  context?: MethodologyContext;
}

/** 输入数据点 */
export interface DataPoint {
  id: string;
  category: string;                 // 数据类别（财务、市场、团队等）
  key: string;                      // 数据名称
  value: string | number | boolean; // 数据值
  source: 'USER_EXPLICIT' | 'CALCULATED' | 'ESTIMATED';
  confidence: number;               // 数据本身的可信度 0-1
  timestamp: string;
}

/** 约束条件输入 */
export interface ConstraintInput {
  type: 'TIME' | 'MONEY' | 'PEOPLE' | 'TECHNOLOGY' | 'MARKET' | 'REGULATORY';
  description: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  quantified?: string;              // 量化描述（如"预算只剩 50 万"）
}

/** 方法论上下文 */
export interface MethodologyContext {
  previousAnalyses?: string[];      // 之前的分析 ID
  userProfile?: Record<string, unknown>;
  identifiedBiases?: string[];
}

// ============================================================
// 方法论输出（统一出口）
// ============================================================

/**
 * 方法论统一输出接口
 * 
 * 所有方法论引擎的输出必须符合此格式，
 * 以便 Artifacts 层统一渲染为诊断报告。
 */
export interface MethodologyOutput {
  /** 方法论标识 */
  methodologyId: 'TPL' | 'SFC' | 'HSF';
  /** 本次执行唯一 ID */
  executionId: string;
  /** 执行时间戳 */
  timestamp: string;
  /** 当前投料阶段 */
  releasePhase: ReleasePhase;

  // === 核心输出 ===
  /** 发现列表 */
  findings: Finding[];
  /** 判断列表（每个判断都有置信度和推翻条件） */
  judgments: Judgment[];
  /** 建议列表（附带优先级和风险） */
  recommendations: Recommendation[];

  // === 可追溯性（与 ARTIFACTS 层对接） ===
  /** 引用的输入数据源 */
  inputDataRefs: DataSourceRef[];
  /** 推理链路（完整的从数据到结论的路径） */
  reasoningChain: ReasoningStep[];

  // === 质量指标 ===
  /** 整体置信度 */
  overallConfidence: ConfidenceAssessment;
  /** 数据完整度 0-1 */
  dataCompleteness: number;
  /** 局限性说明 */
  limitations: string[];

  // === Human-in-the-loop 标记 ===
  /** 需要用户确认的判断 ID 列表 */
  pendingUserConfirmation: string[];
  /** 需要用户补充的信息 */
  informationGaps: InformationGap[];
}

/** 发现 */
export interface Finding {
  id: string;
  description: string;
  evidence: string[];
  significance: 'CRITICAL' | 'IMPORTANT' | 'MINOR';
  relatedDataPoints: string[];      // 关联的数据点 ID
}

/** 判断（遵循宪法第四条：有据可依、置信度标注、可推翻性） */
export interface Judgment {
  id: string;
  statement: string;                // 判断陈述
  confidence: ConfidenceAssessment; // 置信度评估
  supportingEvidence: string[];     // 支撑证据
  refutationConditions: string[];   // 推翻条件 —— 什么新信息出现会改变这个判断
  category: string;                 // 判断类别
}

/** 建议 */
export interface Recommendation {
  id: string;
  action: string;                   // 建议的行动
  priority: 'P0' | 'P1' | 'P2';    // 优先级
  expectedOutcome: string;          // 预期结果
  risks: string[];                  // 风险
  prerequisites: string[];          // 前置条件
  estimatedEffort: string;          // 预估工作量
  confirmationLevel: 'L1' | 'L2' | 'L3'; // 执行确认等级
}

/** 推理步骤 */
export interface ReasoningStep {
  step: number;
  description: string;
  inputData: string;
  logic: string;
  output: string;
  confidence: number;               // 该步骤的置信度
}

/** 信息缺口 */
export interface InformationGap {
  id: string;
  description: string;              // 缺少什么信息
  importance: 'CRITICAL' | 'IMPORTANT' | 'NICE_TO_HAVE';
  impactOnAnalysis: string;         // 缺失对分析的影响
  suggestedQuestion: string;        // 建议向用户提问的问题
}

// ============================================================
// 方法论引擎抽象接口
// ============================================================

/**
 * 方法论引擎抽象接口
 * 
 * 所有方法论（TP-Lite / S'FOCUS / Haystack）必须实现此接口。
 * 这确保了 Artifacts 层可以统一消费任何方法论的输出。
 */
export interface MethodologyEngine {
  /** 方法论唯一标识 */
  readonly id: 'TPL' | 'SFC' | 'HSF';
  /** 方法论名称 */
  readonly name: string;
  /** 方法论描述 */
  readonly description: string;

  /**
   * 检查前置条件是否满足
   * 大白话：数据够不够用？现在适不适合跑这个分析？
   */
  checkPreconditions(input: MethodologyInput): PreconditionResult;

  /**
   * 执行分析
   * 核心方法：运行方法论，产出统一格式的分析结果
   */
  execute(input: MethodologyInput): Promise<MethodologyOutput>;

  /**
   * 获取该方法论适用的投料阶段
   */
  getApplicablePhases(): ReleasePhase[];
}

/** 前置条件检查结果 */
export interface PreconditionResult {
  satisfied: boolean;
  missingRequirements: string[];
  warnings: string[];
}

// ============================================================
// 工具函数
// ============================================================

/** 生成唯一 ID */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/** 获取当前 ISO 时间戳 */
export function now(): string {
  return new Date().toISOString();
}

/** 计算置信度等级 */
export function toConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

/** 创建置信度评估 */
export function createConfidence(
  score: number,
  rationale: string,
  dataCompleteness: number,
  crossValidated: boolean
): ConfidenceAssessment {
  return {
    level: toConfidenceLevel(score),
    score,
    rationale,
    dataCompleteness,
    crossValidated,
  };
}
