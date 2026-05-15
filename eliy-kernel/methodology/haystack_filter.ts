/**
 * Haystack Filter — 信息降噪与关键信号提取引擎
 *
 * 核心思想：创业者淹没在信息海洋中，Eliy 帮他们"大海捞针"。
 *
 * 三层过滤机制：
 *   Layer 1 - Relevance Filter（相关性过滤）：剔除与核心问题无关的信息
 *   Layer 2 - Signal Amplifier（信号放大）：识别和放大弱信号
 *   Layer 3 - Contradiction Detector（矛盾检测）：发现信息间的矛盾
 *
 * 适用场景：
 *   - 用户说"信息太多不知道怎么决策"
 *   - 需要在 FRAMING 阶段整理用户输入
 *   - 作为 TP-Lite 和 S'FOCUS 的预处理器
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
// Haystack 内部类型
// ============================================================

/** 信息分类结果 */
interface ClassifiedInfo {
  id: string;
  original: DataPoint;
  relevanceScore: number;      // 相关性 0-1
  signalStrength: number;      // 信号强度 0-1
  category: InfoCategory;
  tags: string[];
}

type InfoCategory =
  | 'CORE_SIGNAL'       // 核心信号：直接关系到核心问题
  | 'SUPPORTING'        // 支撑信息：间接相关，提供上下文
  | 'NOISE'             // 噪音：与核心问题无关
  | 'WEAK_SIGNAL'       // 弱信号：可能重要但容易被忽略
  | 'CONTRADICTION';    // 矛盾信号：与其他信息冲突

/** 矛盾对 */
interface ContradictionPair {
  id: string;
  dataPointA: DataPoint;
  dataPointB: DataPoint;
  contradictionType: 'DIRECT' | 'IMPLICIT' | 'TEMPORAL';
  description: string;
  resolutionSuggestion: string;
}

// ============================================================
// 三层过滤实现
// ============================================================

/**
 * Layer 1: 相关性过滤
 * 大白话：先把明显跟你的问题没关系的信息扔掉
 */
function layer1_relevanceFilter(
  input: MethodologyInput
): { classified: ClassifiedInfo[]; reasoning: ReasoningStep } {
  const keywords = extractKeywords(input.situationDescription);

  const classified: ClassifiedInfo[] = input.dataPoints.map(dp => {
    // 计算与核心问题的相关性
    let relevanceScore = 0;

    // 关键词匹配
    const dpText = `${dp.category} ${dp.key} ${dp.value}`.toLowerCase();
    const matchCount = keywords.filter(kw => dpText.includes(kw.toLowerCase())).length;
    relevanceScore += Math.min(1, matchCount / Math.max(keywords.length, 1)) * 0.5;

    // 数据可信度加权
    relevanceScore += dp.confidence * 0.3;

    // 用户直接提供的数据更相关
    if (dp.source === 'USER_EXPLICIT') relevanceScore += 0.2;

    // 分类
    let category: InfoCategory;
    if (relevanceScore >= 0.6) category = 'CORE_SIGNAL';
    else if (relevanceScore >= 0.3) category = 'SUPPORTING';
    else category = 'NOISE';

    return {
      id: generateId('ci'),
      original: dp,
      relevanceScore,
      signalStrength: 0, // Layer 2 填充
      category,
      tags: extractTags(dp),
    };
  });

  const coreCount = classified.filter(c => c.category === 'CORE_SIGNAL').length;
  const noiseCount = classified.filter(c => c.category === 'NOISE').length;

  return {
    classified,
    reasoning: {
      step: 1,
      description: 'Layer 1 相关性过滤：剔除与核心问题无关的信息',
      inputData: `${input.dataPoints.length} 个数据点, 关键词: [${keywords.join(', ')}]`,
      logic: '关键词匹配(50%) + 数据可信度(30%) + 来源权重(20%)',
      output: `核心信号: ${coreCount}, 支撑: ${classified.length - coreCount - noiseCount}, 噪音: ${noiseCount}`,
      confidence: keywords.length > 0 ? 0.6 : 0.3,
    },
  };
}

/**
 * Layer 2: 信号放大
 * 大白话：找到那些"容易被忽略但可能很重要"的信号
 */
function layer2_signalAmplifier(
  classified: ClassifiedInfo[],
  input: MethodologyInput
): { amplified: ClassifiedInfo[]; reasoning: ReasoningStep } {
  const amplified = classified.map(item => {
    let signalStrength = item.relevanceScore;

    // 弱信号检测：低相关性但高置信度的数据可能是被忽略的重要信号
    if (item.relevanceScore < 0.4 && item.original.confidence > 0.8) {
      signalStrength += 0.3;
      item.category = 'WEAK_SIGNAL';
      item.tags.push('可能被忽略的重要信号');
    }

    // 孤立信号放大：如果某个类别只有一个数据点，它可能是独特的洞察
    const sameCategoryCount = classified.filter(
      c => c.original.category === item.original.category
    ).length;
    if (sameCategoryCount === 1 && item.relevanceScore > 0.2) {
      signalStrength += 0.15;
      item.tags.push('孤立信号');
    }

    // 与约束相关的信号放大
    const relatedToConstraint = input.constraints.some(c =>
      item.original.key.includes(c.type.toLowerCase()) ||
      c.description.includes(item.original.key)
    );
    if (relatedToConstraint) {
      signalStrength += 0.2;
      item.tags.push('关联约束条件');
    }

    return { ...item, signalStrength: Math.min(1, signalStrength) };
  });

  const weakSignals = amplified.filter(a => a.category === 'WEAK_SIGNAL');

  return {
    amplified,
    reasoning: {
      step: 2,
      description: 'Layer 2 信号放大：识别被忽略的弱信号',
      inputData: `${classified.length} 个分类后的信息`,
      logic: '低相关+高置信=弱信号, 孤立数据点=独特洞察, 约束相关=放大',
      output: `发现 ${weakSignals.length} 个弱信号`,
      confidence: 0.55,
    },
  };
}

/**
 * Layer 3: 矛盾检测
 * 大白话：找到互相打架的信息，创业者自己可能没意识到
 */
function layer3_contradictionDetector(
  amplified: ClassifiedInfo[]
): { contradictions: ContradictionPair[]; reasoning: ReasoningStep } {
  const contradictions: ContradictionPair[] = [];
  const relevant = amplified.filter(a => a.category !== 'NOISE');

  // 两两比较，检测矛盾
  for (let i = 0; i < relevant.length; i++) {
    for (let j = i + 1; j < relevant.length; j++) {
      const a = relevant[i];
      const b = relevant[j];

      // 同类别但数值矛盾
      if (a.original.category === b.original.category && a.original.key === b.original.key) {
        if (a.original.value !== b.original.value) {
          contradictions.push({
            id: generateId('ctr'),
            dataPointA: a.original,
            dataPointB: b.original,
            contradictionType: 'DIRECT',
            description: `"${a.original.key}" 存在两个不同的值: ${a.original.value} vs ${b.original.value}`,
            resolutionSuggestion: '请确认哪个数据是最新的，或者是否存在统计口径差异',
          });
        }
      }

      // 语义矛盾检测（简化版：标签重叠但分类不同）
      const tagOverlap = a.tags.filter(t => b.tags.includes(t));
      if (tagOverlap.length > 0 && a.category !== b.category) {
        // 可能存在隐含矛盾
        const aCat = a.original.category;
        const bCat = b.original.category;
        if (isImplicitContradiction(aCat, bCat)) {
          contradictions.push({
            id: generateId('ctr'),
            dataPointA: a.original,
            dataPointB: b.original,
            contradictionType: 'IMPLICIT',
            description: `"${a.original.key}" 和 "${b.original.key}" 可能存在隐含矛盾`,
            resolutionSuggestion: '建议深入了解两者的关系，可能存在未被意识到的冲突',
          });
        }
      }
    }
  }

  return {
    contradictions,
    reasoning: {
      step: 3,
      description: 'Layer 3 矛盾检测：发现信息间的冲突',
      inputData: `${relevant.length} 个有效信息，${relevant.length * (relevant.length - 1) / 2} 个比较对`,
      logic: '同类别数值矛盾(直接) + 标签重叠但分类不同(隐含)',
      output: `发现 ${contradictions.length} 个矛盾`,
      confidence: 0.5,
    },
  };
}

// ============================================================
// 辅助函数
// ============================================================

function extractKeywords(text: string): string[] {
  // 简化版关键词提取：按空格分词，过滤短词
  return text
    .replace(/[，。！？、；：""''（）\[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .slice(0, 20);
}

function extractTags(dp: DataPoint): string[] {
  const tags: string[] = [dp.category];
  if (dp.source === 'USER_EXPLICIT') tags.push('用户提供');
  if (dp.confidence > 0.8) tags.push('高可信');
  if (dp.confidence < 0.3) tags.push('低可信');
  return tags;
}

function isImplicitContradiction(catA: string, catB: string): boolean {
  // 某些类别组合容易存在隐含矛盾
  const conflictPairs = [
    ['revenue', 'cost'], ['growth', 'retention'],
    ['hiring', 'budget'], ['expansion', 'cash_flow'],
  ];
  return conflictPairs.some(([a, b]) =>
    (catA.includes(a) && catB.includes(b)) ||
    (catA.includes(b) && catB.includes(a))
  );
}

// ============================================================
// Haystack Filter 引擎实现
// ============================================================

export class HaystackFilterEngine implements MethodologyEngine {
  readonly id = 'HSF' as const;
  readonly name = 'Haystack Filter 信息降噪引擎';
  readonly description = '三层过滤（相关性/信号放大/矛盾检测），从信息海洋中提取关键信号';

  checkPreconditions(input: MethodologyInput): PreconditionResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (input.dataPoints.length < 3) {
      missing.push('至少需要 3 个数据点才能进行有效的信息过滤');
    }
    if (!input.situationDescription || input.situationDescription.length < 10) {
      missing.push('需要处境描述作为相关性判断的锚点');
    }
    if (input.dataPoints.length < 8) {
      warnings.push('数据点较少，矛盾检测的效果可能有限');
    }

    return { satisfied: missing.length === 0, missingRequirements: missing, warnings };
  }

  getApplicablePhases(): ReleasePhase[] {
    return ['INTAKE', 'FRAMING']; // 主要用于早期阶段的信息整理
  }

  async execute(input: MethodologyInput): Promise<MethodologyOutput> {
    const executionId = generateId('hsf');
    const timestamp = now();
    const reasoningChain: ReasoningStep[] = [];

    // Layer 1: 相关性过滤
    const { classified, reasoning: r1 } = layer1_relevanceFilter(input);
    reasoningChain.push(r1);

    // Layer 2: 信号放大
    const { amplified, reasoning: r2 } = layer2_signalAmplifier(classified, input);
    reasoningChain.push(r2);

    // Layer 3: 矛盾检测
    const { contradictions, reasoning: r3 } = layer3_contradictionDetector(amplified);
    reasoningChain.push(r3);

    // === 组装输出 ===
    const avgConf = reasoningChain.reduce((s, r) => s + r.confidence, 0) / reasoningChain.length;

    const findings: Finding[] = [];
    const judgments: Judgment[] = [];
    const recommendations: Recommendation[] = [];
    const informationGaps: InformationGap[] = [];

    // 核心信号发现
    const coreSignals = amplified.filter(a => a.category === 'CORE_SIGNAL');
    if (coreSignals.length > 0) {
      findings.push({
        id: generateId('fnd'),
        description: `从 ${input.dataPoints.length} 个数据点中提取 ${coreSignals.length} 个核心信号`,
        evidence: coreSignals.map(s => `${s.original.key}: ${s.original.value} (相关性: ${(s.relevanceScore * 100).toFixed(0)}%)`),
        significance: 'IMPORTANT',
        relatedDataPoints: coreSignals.map(s => s.original.id),
      });
    }

    // 弱信号发现
    const weakSignals = amplified.filter(a => a.category === 'WEAK_SIGNAL');
    if (weakSignals.length > 0) {
      findings.push({
        id: generateId('fnd'),
        description: `发现 ${weakSignals.length} 个容易被忽略的弱信号`,
        evidence: weakSignals.map(s => `⚠️ ${s.original.key}: ${s.original.value} — ${s.tags.join(', ')}`),
        significance: 'IMPORTANT',
        relatedDataPoints: weakSignals.map(s => s.original.id),
      });
    }

    // 矛盾发现
    for (const ctr of contradictions) {
      findings.push({
        id: generateId('fnd'),
        description: ctr.description,
        evidence: [`数据A: ${ctr.dataPointA.key}=${ctr.dataPointA.value}`, `数据B: ${ctr.dataPointB.key}=${ctr.dataPointB.value}`],
        significance: ctr.contradictionType === 'DIRECT' ? 'CRITICAL' : 'IMPORTANT',
        relatedDataPoints: [ctr.dataPointA.id, ctr.dataPointB.id],
      });
    }

    // 噪音过滤判断
    const noiseCount = amplified.filter(a => a.category === 'NOISE').length;
    if (noiseCount > 0) {
      judgments.push({
        id: generateId('jdg'),
        statement: `在你提供的 ${input.dataPoints.length} 条信息中，有 ${noiseCount} 条与当前核心问题关联性较低，建议暂时搁置`,
        confidence: createConfidence(avgConf, '基于关键词匹配和数据特征分析', input.dataPoints.length / 10, false),
        supportingEvidence: [`噪音信息占比: ${((noiseCount / input.dataPoints.length) * 100).toFixed(0)}%`],
        refutationConditions: ['如果用户的核心问题描述不完整，部分"噪音"可能实际上是相关信息'],
        category: 'INFORMATION_FILTERING',
      });
    }

    // 建议
    if (contradictions.length > 0) {
      recommendations.push({
        id: generateId('rec'),
        action: '优先解决信息矛盾：' + contradictions[0].resolutionSuggestion,
        priority: 'P0',
        expectedOutcome: '消除信息矛盾，为后续分析建立可靠的数据基础',
        risks: ['可能需要额外的数据收集'],
        prerequisites: [],
        estimatedEffort: '1-2 次对话',
        confirmationLevel: 'L1',
      });
    }

    recommendations.push({
      id: generateId('rec'),
      action: `聚焦于 ${coreSignals.length} 个核心信号进行深度分析（建议后续使用 TP-Lite 或 S'FOCUS）`,
      priority: 'P1',
      expectedOutcome: '基于降噪后的信息进行更精准的诊断',
      risks: ['过度过滤可能遗漏重要信息'],
      prerequisites: ['信息矛盾已解决'],
      estimatedEffort: '继续当前会话',
      confirmationLevel: 'L1',
    });

    const inputDataRefs: DataSourceRef[] = input.dataPoints.map(dp => ({
      id: dp.id, type: 'USER_INPUT' as const,
      description: `${dp.category}: ${dp.key}`, timestamp: dp.timestamp,
    }));

    return {
      methodologyId: 'HSF',
      executionId, timestamp,
      releasePhase: input.currentPhase,
      findings, judgments, recommendations,
      inputDataRefs, reasoningChain,
      overallConfidence: createConfidence(avgConf, '三层信息过滤分析', input.dataPoints.length / 10, false),
      dataCompleteness: input.dataPoints.length / 10,
      limitations: [
        '关键词提取为简化版，可能遗漏语义相关但词汇不同的信息',
        '矛盾检测目前仅支持同类别数值矛盾和有限的隐含矛盾',
        '弱信号识别依赖启发式规则，不保证完整性',
      ],
      pendingUserConfirmation: judgments.map(j => j.id),
      informationGaps,
    };
  }
}
