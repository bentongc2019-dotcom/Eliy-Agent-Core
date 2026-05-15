/**
 * TP-Lite — 约束理论轻量版（瓶颈诊断引擎）
 *
 * 基于 TOC（Theory of Constraints）的 7 步判断流程：
 *   Step 1: 识别系统边界（这个企业的"系统"是什么）
 *   Step 2: 绘制价值流（从输入到输出的完整链路）
 *   Step 3: 识别瓶颈（哪个环节在拖慢整个系统）
 *   Step 4: 量化瓶颈影响（瓶颈造成了多大损失）
 *   Step 5: 挖尽瓶颈（不增加资源的情况下能做什么）
 *   Step 6: 迁就瓶颈（其他环节如何配合瓶颈）
 *   Step 7: 提升瓶颈（是否需要投入资源突破瓶颈）
 *
 * 上位约束：
 *   - constitution.md 第四条（判断三原则）
 *   - agency_policy.md §1（human-in-the-loop）
 *   - METHODOLOGY.md（统一输出规范）
 */

import {
  type MethodologyEngine,
  type MethodologyInput,
  type MethodologyOutput,
  type ReleasePhase,
  type PreconditionResult,
  type Finding,
  type Judgment,
  type Recommendation,
  type ReasoningStep,
  type DataSourceRef,
  type InformationGap,
  type DataPoint,
  type ConstraintInput,
  generateId,
  now,
  createConfidence,
} from './types.js';

// ============================================================
// TP-Lite 内部类型
// ============================================================

/** 系统边界定义 */
interface SystemBoundary {
  name: string;
  inputs: string[];
  outputs: string[];
  keyProcesses: string[];
  externalDependencies: string[];
}

/** 价值流节点 */
interface ValueStreamNode {
  id: string;
  name: string;
  description: string;
  throughput: number | null;       // 产能/吞吐量（null = 未知）
  utilization: number | null;      // 利用率 0-1（null = 未知）
  waitTime: number | null;         // 等待时间（null = 未知）
  isBottleneck: boolean;
  bottleneckScore: number;         // 瓶颈得分 0-1
}

/** 瓶颈分析结果 */
interface BottleneckAnalysis {
  bottleneckNode: ValueStreamNode;
  impactScore: number;             // 影响得分 0-1
  quantifiedLoss: string;         // 量化损失描述
  exploitStrategies: string[];    // 挖尽策略
  subordinateStrategies: string[]; // 迁就策略
  elevateRequired: boolean;       // 是否需要提升
  elevateOptions: string[];       // 提升选项
}

// ============================================================
// TP-Lite 七步分析流程
// ============================================================

/**
 * Step 1: 识别系统边界
 * 大白话：先搞清楚"你的生意到底是怎么运转的"
 */
function step1_identifySystemBoundary(
  input: MethodologyInput
): { boundary: SystemBoundary; reasoning: ReasoningStep } {
  // 从数据点中提取系统边界信息
  const businessModel = input.dataPoints.find(dp => dp.category === 'business_model');
  const revenue = input.dataPoints.find(dp => dp.category === 'revenue');
  const team = input.dataPoints.find(dp => dp.category === 'team');

  const boundary: SystemBoundary = {
    name: businessModel?.value as string || '待用户补充',
    inputs: extractInputs(input.dataPoints),
    outputs: extractOutputs(input.dataPoints),
    keyProcesses: extractProcesses(input.dataPoints),
    externalDependencies: extractDependencies(input.constraints),
  };

  const reasoning: ReasoningStep = {
    step: 1,
    description: '识别系统边界：定义企业运作的输入、输出和核心流程',
    inputData: `数据点数量: ${input.dataPoints.length}, 约束条件: ${input.constraints.length}`,
    logic: '从用户提供的商业模式、收入来源、团队信息中提取系统边界',
    output: `系统: ${boundary.name}, 核心流程: ${boundary.keyProcesses.length} 个`,
    confidence: businessModel ? 0.7 : 0.3,
  };

  return { boundary, reasoning };
}

/**
 * Step 2: 绘制价值流
 * 大白话：把从"花钱"到"赚钱"的每个环节列出来
 */
function step2_mapValueStream(
  input: MethodologyInput,
  boundary: SystemBoundary
): { nodes: ValueStreamNode[]; reasoning: ReasoningStep } {
  const nodes: ValueStreamNode[] = boundary.keyProcesses.map((process, index) => {
    // 尝试从数据点中找到该环节的量化数据
    const throughputData = input.dataPoints.find(
      dp => dp.category === 'throughput' && dp.key === process
    );
    const utilizationData = input.dataPoints.find(
      dp => dp.category === 'utilization' && dp.key === process
    );

    return {
      id: generateId('vsn'),
      name: process,
      description: `价值流环节 ${index + 1}: ${process}`,
      throughput: throughputData ? Number(throughputData.value) : null,
      utilization: utilizationData ? Number(utilizationData.value) : null,
      waitTime: null, // 需要更多数据
      isBottleneck: false, // Step 3 会判断
      bottleneckScore: 0,
    };
  });

  const reasoning: ReasoningStep = {
    step: 2,
    description: '绘制价值流：从输入到输出的完整链路',
    inputData: `核心流程: ${boundary.keyProcesses.join(' → ')}`,
    logic: '将每个流程环节转化为价值流节点，关联已知的吞吐量和利用率数据',
    output: `价值流节点: ${nodes.length} 个, 有量化数据: ${nodes.filter(n => n.throughput !== null).length} 个`,
    confidence: nodes.some(n => n.throughput !== null) ? 0.6 : 0.3,
  };

  return { nodes, reasoning };
}

/**
 * Step 3: 识别瓶颈
 * 大白话：找到最慢的那个环节
 */
function step3_identifyBottleneck(
  nodes: ValueStreamNode[],
  input: MethodologyInput
): { nodes: ValueStreamNode[]; reasoning: ReasoningStep } {
  // 瓶颈识别策略：
  // 1. 有量化数据 → 找吞吐量最低或利用率最高的节点
  // 2. 无量化数据 → 基于用户描述的痛点和约束进行推断

  const scoredNodes = nodes.map(node => {
    let score = 0;

    // 利用率最高的环节更可能是瓶颈
    if (node.utilization !== null) {
      score += node.utilization * 0.4;
    }

    // 吞吐量最低的环节更可能是瓶颈（归一化处理）
    if (node.throughput !== null) {
      const maxThroughput = Math.max(...nodes.filter(n => n.throughput !== null).map(n => n.throughput!));
      if (maxThroughput > 0) {
        score += (1 - node.throughput / maxThroughput) * 0.4;
      }
    }

    // 用户主动提到的痛点环节加分
    const isPainPoint = input.constraints.some(c =>
      c.description.includes(node.name)
    );
    if (isPainPoint) score += 0.2;

    return { ...node, bottleneckScore: score };
  });

  // 标记瓶颈
  const maxScore = Math.max(...scoredNodes.map(n => n.bottleneckScore));
  const updatedNodes = scoredNodes.map(node => ({
    ...node,
    isBottleneck: node.bottleneckScore === maxScore && maxScore > 0.2,
  }));

  const bottleneck = updatedNodes.find(n => n.isBottleneck);
  const hasQuantitativeData = nodes.some(n => n.throughput !== null || n.utilization !== null);

  const reasoning: ReasoningStep = {
    step: 3,
    description: '识别瓶颈：找到拖慢整个系统的环节',
    inputData: `${nodes.length} 个价值流节点, ${hasQuantitativeData ? '有' : '无'}量化数据`,
    logic: hasQuantitativeData
      ? '基于利用率(40%)、吞吐量(40%)和用户痛点(20%)综合评分'
      : '基于用户描述的约束和痛点进行定性推断（置信度较低）',
    output: bottleneck
      ? `识别到瓶颈: ${bottleneck.name} (得分: ${bottleneck.bottleneckScore.toFixed(2)})`
      : '未能明确识别瓶颈，需要更多数据',
    confidence: hasQuantitativeData ? 0.65 : 0.3,
  };

  return { nodes: updatedNodes, reasoning };
}

/**
 * Step 4: 量化瓶颈影响
 */
function step4_quantifyImpact(
  bottleneckNode: ValueStreamNode | undefined,
  input: MethodologyInput
): { impact: string; reasoning: ReasoningStep } {
  let impact = '无法量化 — 缺少瓶颈环节的产能数据和财务数据';

  if (bottleneckNode && bottleneckNode.throughput !== null) {
    const revenueData = input.dataPoints.find(dp => dp.key === 'monthly_revenue');
    if (revenueData) {
      impact = `瓶颈环节 "${bottleneckNode.name}" 的利用率为 ${((bottleneckNode.utilization ?? 0) * 100).toFixed(0)}%，` +
        `预估对整体产能的限制约为 ${((1 - (bottleneckNode.utilization ?? 0.5)) * 100).toFixed(0)}%`;
    }
  }

  return {
    impact,
    reasoning: {
      step: 4,
      description: '量化瓶颈影响：瓶颈造成了多大损失',
      inputData: bottleneckNode ? `瓶颈: ${bottleneckNode.name}` : '未识别到瓶颈',
      logic: '结合瓶颈环节的产能数据和整体营收数据估算损失',
      output: impact,
      confidence: bottleneckNode?.throughput !== null ? 0.5 : 0.2,
    },
  };
}

/**
 * Step 5: 挖尽瓶颈（不增加资源，能做什么）
 */
function step5_exploitBottleneck(
  bottleneckNode: ValueStreamNode | undefined
): { strategies: string[]; reasoning: ReasoningStep } {
  const strategies: string[] = [];

  if (bottleneckNode) {
    // 通用挖尽策略 + 根据节点特征定制
    strategies.push(`确保 "${bottleneckNode.name}" 环节零闲置 —— 消除该环节的一切等待和浪费`);
    strategies.push(`优先处理高价值任务 —— 在 "${bottleneckNode.name}" 排队时，先做利润最高的`);
    strategies.push(`提前质检 —— 进入 "${bottleneckNode.name}" 之前就筛掉不合格的输入`);
  }

  return {
    strategies,
    reasoning: {
      step: 5,
      description: '挖尽瓶颈：不增加资源的优化策略',
      inputData: bottleneckNode ? `瓶颈: ${bottleneckNode.name}` : '无',
      logic: 'TOC 挖尽原则：让瓶颈每一分钟都在创造价值',
      output: `生成 ${strategies.length} 条挖尽策略`,
      confidence: strategies.length > 0 ? 0.6 : 0.2,
    },
  };
}

/**
 * Step 6: 迁就瓶颈（其他环节如何配合）
 */
function step6_subordinateToBottleneck(
  bottleneckNode: ValueStreamNode | undefined,
  allNodes: ValueStreamNode[]
): { strategies: string[]; reasoning: ReasoningStep } {
  const strategies: string[] = [];

  if (bottleneckNode) {
    const nonBottlenecks = allNodes.filter(n => !n.isBottleneck);
    for (const node of nonBottlenecks) {
      strategies.push(`"${node.name}" 的产出节奏应匹配 "${bottleneckNode.name}" 的消化能力，避免堆积`);
    }
    strategies.push(`全公司的 KPI 应以 "${bottleneckNode.name}" 的产出为基准，而非各环节独立最大化`);
  }

  return {
    strategies,
    reasoning: {
      step: 6,
      description: '迁就瓶颈：其他环节配合瓶颈的策略',
      inputData: `非瓶颈环节: ${allNodes.filter(n => !n.isBottleneck).length} 个`,
      logic: 'TOC 迁就原则：非瓶颈环节的产出速度不应超过瓶颈的消化速度',
      output: `生成 ${strategies.length} 条迁就策略`,
      confidence: strategies.length > 0 ? 0.6 : 0.2,
    },
  };
}

/**
 * Step 7: 提升瓶颈（是否需要投入资源）
 */
function step7_elevateBottleneck(
  bottleneckNode: ValueStreamNode | undefined,
  input: MethodologyInput
): { analysis: { required: boolean; options: string[] }; reasoning: ReasoningStep } {
  const options: string[] = [];
  let required = false;

  if (bottleneckNode) {
    // 如果利用率已经很高（>90%），挖尽空间小，需要提升
    if (bottleneckNode.utilization !== null && bottleneckNode.utilization > 0.9) {
      required = true;
      options.push(`增加 "${bottleneckNode.name}" 的产能（招人/买设备/外包）`);
      options.push(`用技术手段自动化 "${bottleneckNode.name}" 的部分工作`);
      options.push(`重新设计流程，绕过或简化 "${bottleneckNode.name}"`);
    } else {
      options.push('当前应优先挖尽现有产能，暂不建议增加投入');
    }
  }

  return {
    analysis: { required, options },
    reasoning: {
      step: 7,
      description: '提升瓶颈：是否需要投入资源突破',
      inputData: bottleneckNode
        ? `利用率: ${bottleneckNode.utilization ?? '未知'}`
        : '无瓶颈数据',
      logic: '利用率 > 90% 时判定需要提升；否则优先挖尽',
      output: required ? `需要提升，${options.length} 个选项` : '暂不需要提升',
      confidence: bottleneckNode?.utilization !== null ? 0.6 : 0.3,
    },
  };
}

// ============================================================
// 辅助函数
// ============================================================

function extractInputs(dataPoints: DataPoint[]): string[] {
  return dataPoints
    .filter(dp => dp.category === 'input' || dp.category === 'resource')
    .map(dp => dp.key);
}

function extractOutputs(dataPoints: DataPoint[]): string[] {
  return dataPoints
    .filter(dp => dp.category === 'output' || dp.category === 'revenue')
    .map(dp => dp.key);
}

function extractProcesses(dataPoints: DataPoint[]): string[] {
  const processes = dataPoints
    .filter(dp => dp.category === 'process' || dp.category === 'workflow')
    .map(dp => dp.value as string);
  // 如果用户没提供流程数据，给出通用流程作为起点
  return processes.length > 0
    ? processes
    : ['获客', '转化', '交付', '服务', '复购'];
}

function extractDependencies(constraints: ConstraintInput[]): string[] {
  return constraints
    .filter(c => c.type === 'TECHNOLOGY' || c.type === 'REGULATORY')
    .map(c => c.description);
}

// ============================================================
// TP-Lite 引擎实现
// ============================================================

export class TPLiteEngine implements MethodologyEngine {
  readonly id = 'TPL' as const;
  readonly name = 'TP-Lite 瓶颈诊断引擎';
  readonly description = '基于约束理论（TOC）的轻量版商业瓶颈识别与优化方法论';

  /** 检查前置条件 */
  checkPreconditions(input: MethodologyInput): PreconditionResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (input.dataPoints.length < 3) {
      missing.push('至少需要 3 个数据点才能启动瓶颈分析');
    }
    if (!input.situationDescription || input.situationDescription.length < 20) {
      missing.push('需要用户提供至少 20 字的处境描述');
    }
    if (!input.dataPoints.some(dp => dp.category === 'process' || dp.category === 'workflow')) {
      warnings.push('缺少流程/工作流数据，将使用通用流程模板（准确度下降）');
    }
    if (!input.dataPoints.some(dp => dp.category === 'throughput' || dp.category === 'utilization')) {
      warnings.push('缺少吞吐量/利用率量化数据，瓶颈识别将基于定性推断');
    }

    return {
      satisfied: missing.length === 0,
      missingRequirements: missing,
      warnings,
    };
  }

  /** 获取适用的投料阶段 */
  getApplicablePhases(): ReleasePhase[] {
    return ['FRAMING', 'DIAGNOSIS'];
  }

  /** 执行 TP-Lite 七步分析 */
  async execute(input: MethodologyInput): Promise<MethodologyOutput> {
    const executionId = generateId('tpl');
    const timestamp = now();
    const reasoningChain: ReasoningStep[] = [];

    // === Step 1: 识别系统边界 ===
    const { boundary, reasoning: r1 } = step1_identifySystemBoundary(input);
    reasoningChain.push(r1);

    // === Step 2: 绘制价值流 ===
    const { nodes: rawNodes, reasoning: r2 } = step2_mapValueStream(input, boundary);
    reasoningChain.push(r2);

    // === Step 3: 识别瓶颈 ===
    const { nodes: scoredNodes, reasoning: r3 } = step3_identifyBottleneck(rawNodes, input);
    reasoningChain.push(r3);

    const bottleneck = scoredNodes.find(n => n.isBottleneck);

    // === Step 4: 量化影响 ===
    const { impact, reasoning: r4 } = step4_quantifyImpact(bottleneck, input);
    reasoningChain.push(r4);

    // === Step 5: 挖尽瓶颈 ===
    const { strategies: exploitStrategies, reasoning: r5 } = step5_exploitBottleneck(bottleneck);
    reasoningChain.push(r5);

    // === Step 6: 迁就瓶颈 ===
    const { strategies: subStrategies, reasoning: r6 } = step6_subordinateToBottleneck(bottleneck, scoredNodes);
    reasoningChain.push(r6);

    // === Step 7: 提升瓶颈 ===
    const { analysis: elevateAnalysis, reasoning: r7 } = step7_elevateBottleneck(bottleneck, input);
    reasoningChain.push(r7);

    // === 组装统一输出 ===
    const avgConfidence = reasoningChain.reduce((sum, r) => sum + r.confidence, 0) / reasoningChain.length;

    const findings: Finding[] = [];
    const judgments: Judgment[] = [];
    const recommendations: Recommendation[] = [];
    const informationGaps: InformationGap[] = [];

    // 组装 Findings
    if (bottleneck) {
      findings.push({
        id: generateId('fnd'),
        description: `系统瓶颈位于 "${bottleneck.name}" 环节（瓶颈得分: ${bottleneck.bottleneckScore.toFixed(2)}/1.0）`,
        evidence: [`价值流分析: ${scoredNodes.length} 个环节对比`, `瓶颈影响: ${impact}`],
        significance: bottleneck.bottleneckScore > 0.6 ? 'CRITICAL' : 'IMPORTANT',
        relatedDataPoints: input.dataPoints.map(dp => dp.id),
      });
    }

    // 组装 Judgments（遵循宪法第四条）
    if (bottleneck) {
      judgments.push({
        id: generateId('jdg'),
        statement: `当前系统的核心瓶颈是 "${bottleneck.name}"，优化此环节对整体产能的提升效果最大`,
        confidence: createConfidence(
          avgConfidence,
          scoredNodes.some(n => n.throughput !== null)
            ? '基于量化数据的瓶颈评分'
            : '基于定性推断，缺少量化数据验证',
          input.dataPoints.length / 10, // 粗略估计完整度
          scoredNodes.some(n => n.throughput !== null),
        ),
        supportingEvidence: [`七步分析完整链路`, `瓶颈得分: ${bottleneck.bottleneckScore.toFixed(2)}`],
        refutationConditions: [
          `如果获得更精确的各环节吞吐量数据，瓶颈可能转移到其他环节`,
          `如果市场环境发生重大变化，系统边界可能需要重新定义`,
        ],
        category: 'BOTTLENECK_IDENTIFICATION',
      });
    }

    // 组装 Recommendations
    for (const strategy of exploitStrategies) {
      recommendations.push({
        id: generateId('rec'),
        action: strategy,
        priority: 'P0',
        expectedOutcome: '在不增加资源的情况下提升瓶颈环节产能',
        risks: ['可能需要调整现有工作流程', '团队需要时间适应新节奏'],
        prerequisites: ['确认瓶颈判断正确'],
        estimatedEffort: '1-2 周调整期',
        confirmationLevel: 'L2', // 建议层，需标注置信度
      });
    }

    if (elevateAnalysis.required) {
      for (const option of elevateAnalysis.options) {
        recommendations.push({
          id: generateId('rec'),
          action: option,
          priority: 'P1',
          expectedOutcome: '突破瓶颈产能上限',
          risks: ['需要额外资金投入', '效果不确定'],
          prerequisites: ['先完成 P0 的挖尽策略', '验证瓶颈确实无法通过优化解决'],
          estimatedEffort: '1-3 个月',
          confirmationLevel: 'L3', // 涉及资源投入，必须用户确认
        });
      }
    }

    // 检查信息缺口
    if (!scoredNodes.some(n => n.throughput !== null)) {
      informationGaps.push({
        id: generateId('gap'),
        description: '缺少各业务环节的吞吐量/产能数据',
        importance: 'CRITICAL',
        impactOnAnalysis: '无法精确识别瓶颈，当前结论基于定性推断',
        suggestedQuestion: '你能提供每个业务环节每天/每周能处理多少订单（或客户/任务）吗？',
      });
    }

    // 组装数据源引用
    const inputDataRefs: DataSourceRef[] = input.dataPoints.map(dp => ({
      id: dp.id,
      type: 'USER_INPUT' as const,
      description: `${dp.category}: ${dp.key} = ${dp.value}`,
      timestamp: dp.timestamp,
    }));

    return {
      methodologyId: 'TPL',
      executionId,
      timestamp,
      releasePhase: input.currentPhase,
      findings,
      judgments,
      recommendations,
      inputDataRefs,
      reasoningChain,
      overallConfidence: createConfidence(
        avgConfidence,
        `七步分析平均置信度，基于 ${input.dataPoints.length} 个数据点`,
        input.dataPoints.length / 10,
        scoredNodes.some(n => n.throughput !== null),
      ),
      dataCompleteness: input.dataPoints.length / 10,
      limitations: [
        '本分析基于用户提供的有限数据，可能遗漏关键环节',
        '瓶颈识别的准确性取决于输入数据的完整性和准确性',
        ...(scoredNodes.some(n => n.throughput !== null) ? [] : ['缺少量化数据，瓶颈识别基于定性推断']),
      ],
      pendingUserConfirmation: judgments.map(j => j.id),
      informationGaps,
    };
  }
}
