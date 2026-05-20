/**
 * S'FOCUS — 战略聚焦五步法
 *
 * 基于 TOC 的聚焦五步骤（Five Focusing Steps）改良版：
 *   S - Scan（扫描）：全局扫描业务现状，识别关键指标
 *   F - Find（定位）：找到当前最关键的约束/机会点
 *   O - Optimize（优化）：在不增加资源的前提下优化约束
 *   C - Coordinate（协调）：让其他环节配合约束的节奏
 *   U - Upgrade（升级）：判断是否需要投入资源突破约束
 *   S - Sustain（持续）：建立持续改进机制，防止惯性回退
 *
 * 核心区别于 TP-Lite：
 *   - TP-Lite 聚焦于"诊断瓶颈在哪"（诊断工具）
 *   - S'FOCUS 聚焦于"决定先做什么"（决策工具）
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
  generateId,
  now,
  createConfidence,
} from './types.js';

// ============================================================
// S'FOCUS 内部类型
// ============================================================

/** 业务维度扫描结果 */
interface DimensionScan {
  dimension: string;         // 维度名称（获客、转化、交付等）
  healthScore: number;       // 健康度 0-1
  keyMetrics: Array<{
    name: string;
    value: string | number;
    trend: 'UP' | 'DOWN' | 'FLAT' | 'UNKNOWN';
    benchmark?: string;      // 行业基准（如有）
  }>;
  signals: string[];         // 关键信号
  risks: string[];           // 风险信号
}

/** 聚焦点 */
interface FocusPoint {
  id: string;
  dimension: string;
  description: string;
  urgency: number;           // 紧迫度 0-1
  impact: number;            // 影响力 0-1
  feasibility: number;       // 可行性 0-1
  compositeScore: number;    // 综合得分
  rationale: string;
}

/** 优化方案 */
interface OptimizationPlan {
  focusPointId: string;
  quickWins: string[];       // 快速见效的行动
  mediumTerm: string[];      // 中期行动
  constraints: string[];     // 执行约束
}

// ============================================================
// S'FOCUS 六步分析流程
// ============================================================

/**
 * S - Scan: 全局扫描
 * 大白话：先把企业的各个维度体检一遍
 */
function stepScan(input: MethodologyInput): {
  scans: DimensionScan[];
  reasoning: ReasoningStep;
} {
  // 定义标准扫描维度
  const standardDimensions = ['获客', '转化', '交付', '客户留存', '团队', '财务'];

  const scans: DimensionScan[] = standardDimensions.map(dim => {
    // 从数据点中提取该维度的指标
    const relatedDataPoints = input.dataPoints.filter(dp =>
      dp.category.toLowerCase().includes(dim) ||
      dp.key.toLowerCase().includes(dim)
    );

    const hasData = relatedDataPoints.length > 0;
    const healthScore = hasData
      ? relatedDataPoints.reduce((sum, dp) => sum + dp.confidence, 0) / relatedDataPoints.length
      : 0.5; // 无数据时默认中等

    return {
      dimension: dim,
      healthScore,
      keyMetrics: relatedDataPoints.map(dp => ({
        name: dp.key,
        value: typeof dp.value === 'boolean' ? String(dp.value) : dp.value,
        trend: 'UNKNOWN' as const,
      })),
      signals: extractSignals(dim, input),
      risks: extractRisks(dim, input),
    };
  });

  return {
    scans,
    reasoning: {
      step: 1,
      description: 'Scan（扫描）：对业务 6 大维度进行全局体检',
      inputData: `${input.dataPoints.length} 个数据点, ${input.constraints.length} 个约束`,
      logic: '按标准维度（获客/转化/交付/留存/团队/财务）分类汇总数据点',
      output: `完成 ${scans.length} 个维度扫描, 数据覆盖: ${scans.filter(s => s.keyMetrics.length > 0).length} 维度`,
      confidence: input.dataPoints.length >= 6 ? 0.7 : 0.4,
    },
  };
}

/**
 * F - Find: 定位聚焦点
 * 大白话：从体检结果中找到"现在最应该解决的一件事"
 */
function stepFind(
  scans: DimensionScan[],
  input: MethodologyInput
): { focusPoints: FocusPoint[]; reasoning: ReasoningStep } {
  const focusPoints: FocusPoint[] = scans.map(scan => {
    // 紧迫度：健康度越低越紧迫
    const urgency = 1 - scan.healthScore;

    // 影响力：基于维度权重和风险信号数量
    const dimensionWeights: Record<string, number> = {
      '获客': 0.8, '转化': 0.9, '交付': 0.7,
      '客户留存': 0.85, '团队': 0.6, '财务': 0.95,
    };
    const impact = (dimensionWeights[scan.dimension] ?? 0.5) *
      (1 + scan.risks.length * 0.1);

    // 可行性：有更多数据的维度可行性更高（因为知道从哪下手）
    const feasibility = Math.min(1, 0.3 + scan.keyMetrics.length * 0.15);

    // 综合得分 = 紧迫度 × 40% + 影响力 × 40% + 可行性 × 20%
    const compositeScore = urgency * 0.4 + impact * 0.4 + feasibility * 0.2;

    return {
      id: generateId('fp'),
      dimension: scan.dimension,
      description: `${scan.dimension}维度 — 健康度 ${(scan.healthScore * 100).toFixed(0)}%`,
      urgency,
      impact: Math.min(1, impact),
      feasibility,
      compositeScore,
      rationale: `紧迫度 ${(urgency * 100).toFixed(0)}% × 影响力 ${(Math.min(1, impact) * 100).toFixed(0)}% × 可行性 ${(feasibility * 100).toFixed(0)}%`,
    };
  });

  // 按综合得分排序
  focusPoints.sort((a, b) => b.compositeScore - a.compositeScore);

  const topFocus = focusPoints[0];

  return {
    focusPoints,
    reasoning: {
      step: 2,
      description: 'Find（定位）：找到当前最应该聚焦的维度',
      inputData: `${scans.length} 个维度扫描结果`,
      logic: '综合得分 = 紧迫度(40%) + 影响力(40%) + 可行性(20%)',
      output: topFocus
        ? `最高优先级: ${topFocus.dimension} (综合得分: ${topFocus.compositeScore.toFixed(2)})`
        : '无法确定优先级',
      confidence: input.dataPoints.length >= 6 ? 0.65 : 0.35,
    },
  };
}

/**
 * O - Optimize: 优化策略
 */
function stepOptimize(
  topFocus: FocusPoint | undefined
): { plan: OptimizationPlan | null; reasoning: ReasoningStep } {
  if (!topFocus) {
    return {
      plan: null,
      reasoning: {
        step: 3, description: 'Optimize：无聚焦点，跳过',
        inputData: '无', logic: '无', output: '跳过', confidence: 0,
      },
    };
  }

  // 根据维度生成对应的优化策略
  const optimizationTemplates: Record<string, { quickWins: string[]; mediumTerm: string[] }> = {
    '获客': {
      quickWins: ['审计当前所有获客渠道的 ROI，关停负 ROI 渠道', '提高现有高效渠道的投放强度'],
      mediumTerm: ['建立获客漏斗数据看板', '测试 2-3 个新获客渠道'],
    },
    '转化': {
      quickWins: ['分析最近 30 天流失客户的流失节点', '优化转化路径中等待时间最长的步骤'],
      mediumTerm: ['建立 A/B 测试机制', '设计针对不同客户类型的转化路径'],
    },
    '交付': {
      quickWins: ['识别交付流程中的返工环节并消除', '标准化交付清单'],
      mediumTerm: ['建立交付质量监控指标', '培训团队标准化操作'],
    },
    '客户留存': {
      quickWins: ['联系最近流失的 5 个客户了解原因', '建立客户健康度评分'],
      mediumTerm: ['设计客户成功计划', '建立定期回访机制'],
    },
    '团队': {
      quickWins: ['与核心成员 1v1 了解当前痛点', '明确每个岗位的核心 KPI'],
      mediumTerm: ['建立团队能力矩阵', '设计关键岗位的备份计划'],
    },
    '财务': {
      quickWins: ['清理应收账款', '审计每月固定支出，砍掉非必要项'],
      mediumTerm: ['建立月度财务仪表盘', '设定现金流预警线'],
    },
  };

  const template = optimizationTemplates[topFocus.dimension] ?? {
    quickWins: ['需要更多信息才能生成具体优化策略'],
    mediumTerm: [],
  };

  return {
    plan: {
      focusPointId: topFocus.id,
      quickWins: template.quickWins,
      mediumTerm: template.mediumTerm,
      constraints: [`当前聚焦于 "${topFocus.dimension}" 维度`],
    },
    reasoning: {
      step: 3,
      description: `Optimize（优化）：针对 "${topFocus.dimension}" 生成优化策略`,
      inputData: `聚焦点: ${topFocus.dimension}, 得分: ${topFocus.compositeScore.toFixed(2)}`,
      logic: '基于维度特征生成快速见效(quick wins)和中期行动方案',
      output: `快速行动: ${template.quickWins.length} 条, 中期行动: ${template.mediumTerm.length} 条`,
      confidence: 0.55,
    },
  };
}

/**
 * C - Coordinate: 协调策略
 */
function stepCoordinate(
  topFocus: FocusPoint | undefined,
  allFocusPoints: FocusPoint[]
): { strategies: string[]; reasoning: ReasoningStep } {
  const strategies: string[] = [];

  if (topFocus) {
    const others = allFocusPoints.filter(fp => fp.id !== topFocus.id).slice(0, 3);
    strategies.push(`本阶段的核心 KPI 应围绕 "${topFocus.dimension}" 设定`);
    for (const other of others) {
      strategies.push(`"${other.dimension}" 维度暂时维持现状，不做大动作，资源优先给 "${topFocus.dimension}"`);
    }
    strategies.push('每周检查一次其他维度是否出现恶化信号，如恶化则重新评估优先级');
  }

  return {
    strategies,
    reasoning: {
      step: 4,
      description: 'Coordinate（协调）：让其他维度配合聚焦维度',
      inputData: `聚焦: ${topFocus?.dimension ?? '无'}, 其他维度: ${allFocusPoints.length - 1}`,
      logic: '非聚焦维度维持现状，资源集中于聚焦维度',
      output: `${strategies.length} 条协调策略`,
      confidence: 0.6,
    },
  };
}

/**
 * U - Upgrade: 判断是否需要升级投入
 */
function stepUpgrade(
  topFocus: FocusPoint | undefined,
  input: MethodologyInput
): { needed: boolean; options: string[]; reasoning: ReasoningStep } {
  let needed = false;
  const options: string[] = [];

  if (topFocus && topFocus.urgency > 0.8) {
    needed = true;
    options.push(`考虑在 "${topFocus.dimension}" 维度增加预算或人力`);
    options.push(`评估是否可以通过外部合作加速 "${topFocus.dimension}" 突破`);
  } else {
    options.push('当前阶段优先执行 Optimize 策略，暂不需要额外投入');
  }

  return {
    needed,
    options,
    reasoning: {
      step: 5,
      description: 'Upgrade（升级）：是否需要投入资源突破',
      inputData: `聚焦维度紧迫度: ${topFocus?.urgency.toFixed(2) ?? '无'}`,
      logic: '紧迫度 > 0.8 时建议升级投入',
      output: needed ? '建议升级投入' : '暂不需要',
      confidence: 0.5,
    },
  };
}

/**
 * S - Sustain: 持续改进机制
 */
function stepSustain(
  topFocus: FocusPoint | undefined
): { mechanisms: string[]; reasoning: ReasoningStep } {
  const mechanisms: string[] = [];

  if (topFocus) {
    mechanisms.push(`每周回顾 "${topFocus.dimension}" 的核心指标变化`);
    mechanisms.push('每月重新运行 S\'FOCUS 全局扫描，检查优先级是否需要调整');
    mechanisms.push('建立"瓶颈转移预警" —— 一旦当前聚焦点改善，新瓶颈可能出现在其他维度');
  }

  return {
    mechanisms,
    reasoning: {
      step: 6,
      description: 'Sustain（持续）：建立防止惯性回退的机制',
      inputData: `聚焦: ${topFocus?.dimension ?? '无'}`,
      logic: '通过周期性复查和瓶颈转移预警防止改善后的回退',
      output: `${mechanisms.length} 条持续机制`,
      confidence: 0.7,
    },
  };
}

// ============================================================
// 辅助函数
// ============================================================

function extractSignals(dimension: string, input: MethodologyInput): string[] {
  return input.dataPoints
    .filter(dp => dp.category.includes(dimension) && dp.confidence > 0.7)
    .map(dp => `${dp.key}: ${dp.value}`);
}

function extractRisks(dimension: string, input: MethodologyInput): string[] {
  return input.constraints
    .filter(c => c.description.includes(dimension) || c.severity === 'SEVERE')
    .map(c => c.description);
}

// ============================================================
// S'FOCUS 引擎实现
// ============================================================

export class SFocusEngine implements MethodologyEngine {
  readonly id = 'SFC' as const;
  readonly name = 'S\'FOCUS 战略聚焦引擎';
  readonly description = '战略聚焦六步法：扫描全局 → 定位焦点 → 优化约束 → 协调资源 → 升级投入 → 持续改进';

  checkPreconditions(input: MethodologyInput): PreconditionResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (input.dataPoints.length < 2) {
      missing.push('至少需要 2 个数据点');
    }
    if (!input.situationDescription) {
      missing.push('需要处境描述');
    }
    if (input.dataPoints.length < 6) {
      warnings.push('数据点不足 6 个，部分维度扫描将缺少数据支撑');
    }

    return { satisfied: missing.length === 0, missingRequirements: missing, warnings };
  }

  getApplicablePhases(): ReleasePhase[] {
    return ['FRAMING', 'DIAGNOSIS', 'PRESCRIPTION'];
  }

  async execute(input: MethodologyInput): Promise<MethodologyOutput> {
    const executionId = generateId('sfc');
    const timestamp = now();
    const reasoningChain: ReasoningStep[] = [];

    // S - Scan
    const { scans, reasoning: rScan } = stepScan(input);
    reasoningChain.push(rScan);

    // F - Find
    const { focusPoints, reasoning: rFind } = stepFind(scans, input);
    reasoningChain.push(rFind);
    const topFocus = focusPoints[0];

    // O - Optimize
    const { plan, reasoning: rOpt } = stepOptimize(topFocus);
    reasoningChain.push(rOpt);

    // C - Coordinate
    const { strategies: coordStrategies, reasoning: rCoord } = stepCoordinate(topFocus, focusPoints);
    reasoningChain.push(rCoord);

    // U - Upgrade
    const { needed, options, reasoning: rUpgrade } = stepUpgrade(topFocus, input);
    reasoningChain.push(rUpgrade);

    // S - Sustain
    const { mechanisms, reasoning: rSustain } = stepSustain(topFocus);
    reasoningChain.push(rSustain);

    // === 组装输出 ===
    const avgConf = reasoningChain.reduce((s, r) => s + r.confidence, 0) / reasoningChain.length;

    const findings: Finding[] = [];
    const judgments: Judgment[] = [];
    const recommendations: Recommendation[] = [];
    const informationGaps: InformationGap[] = [];

    // 维度扫描发现
    for (const scan of scans) {
      if (scan.healthScore < 0.4) {
        findings.push({
          id: generateId('fnd'),
          description: `"${scan.dimension}" 维度健康度偏低 (${(scan.healthScore * 100).toFixed(0)}%)`,
          evidence: scan.signals.length > 0 ? scan.signals : ['基于有限数据的初步评估'],
          significance: scan.healthScore < 0.2 ? 'CRITICAL' : 'IMPORTANT',
          relatedDataPoints: [],
        });
      }
    }

    // 聚焦判断
    if (topFocus) {
      judgments.push({
        id: generateId('jdg'),
        statement: `当前最应该聚焦的维度是 "${topFocus.dimension}"（综合得分 ${topFocus.compositeScore.toFixed(2)}）`,
        confidence: createConfidence(avgConf, topFocus.rationale, input.dataPoints.length / 10, false),
        supportingEvidence: [topFocus.rationale],
        refutationConditions: [
          '如果获得更完整的数据，优先级排序可能改变',
          `如果 "${topFocus.dimension}" 维度突然改善，聚焦点应转移`,
        ],
        category: 'STRATEGIC_FOCUS',
      });
    }

    // 行动建议
    if (plan) {
      for (const qw of plan.quickWins) {
        recommendations.push({
          id: generateId('rec'),
          action: qw,
          priority: 'P0',
          expectedOutcome: `快速改善 "${topFocus?.dimension}" 维度`,
          risks: ['效果可能需要 1-2 周才能显现'],
          prerequisites: ['确认聚焦方向正确'],
          estimatedEffort: '本周内可启动',
          confirmationLevel: 'L2',
        });
      }
      for (const mt of plan.mediumTerm) {
        recommendations.push({
          id: generateId('rec'),
          action: mt,
          priority: 'P1',
          expectedOutcome: `系统性提升 "${topFocus?.dimension}" 维度能力`,
          risks: ['需要持续投入'],
          prerequisites: ['先完成快速行动'],
          estimatedEffort: '1-3 个月',
          confirmationLevel: 'L2',
        });
      }
    }

    // 信息缺口
    for (const scan of scans) {
      if (scan.keyMetrics.length === 0) {
        informationGaps.push({
          id: generateId('gap'),
          description: `"${scan.dimension}" 维度缺少量化数据`,
          importance: scan.dimension === topFocus?.dimension ? 'CRITICAL' : 'NICE_TO_HAVE',
          impactOnAnalysis: '该维度的评估基于默认值，准确性较低',
          suggestedQuestion: `能分享一下你在 "${scan.dimension}" 方面的关键数据吗？`,
        });
      }
    }

    const inputDataRefs: DataSourceRef[] = input.dataPoints.map(dp => ({
      id: dp.id, type: 'USER_INPUT' as const,
      description: `${dp.category}: ${dp.key}`, timestamp: dp.timestamp,
    }));

    return {
      methodologyId: 'SFC',
      executionId, timestamp,
      releasePhase: input.currentPhase,
      findings, judgments, recommendations,
      inputDataRefs, reasoningChain,
      overallConfidence: createConfidence(avgConf, `S'FOCUS 六步分析`, input.dataPoints.length / 10, false),
      dataCompleteness: input.dataPoints.length / 12,
      limitations: [
        '维度扫描依赖用户提供的数据完整度',
        '优化策略基于通用模板，需要根据具体行业调整',
      ],
      pendingUserConfirmation: judgments.map(j => j.id),
      informationGaps,
    };
  }
}
