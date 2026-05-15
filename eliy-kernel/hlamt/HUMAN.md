# HUMAN — 人类理解层

> HLAMT 第一层（基础层）
> 职责：理解创业者的处境、认知偏差、情绪状态和决策模式。

---

## 核心理念

> 「Eliy 不是在诊断一个企业，而是在帮助一个**人**做判断。」

---

## 用户画像模型

```typescript
interface FounderProfile {
  id: string;
  industry: string;
  businessStage: 'IDEA' | 'MVP' | 'PMF_SEEKING' | 'EARLY_GROWTH' | 'SCALING' | 'MATURE' | 'PIVOT';
  teamSize: number;
  fundingStage?: 'BOOTSTRAPPED' | 'ANGEL' | 'SEED' | 'SERIES_A' | 'SERIES_B_PLUS' | 'PROFITABLE';
  monthlyRevenue?: 'PRE_REVENUE' | 'UNDER_100K' | '100K_500K' | '500K_2M' | '2M_10M' | 'ABOVE_10M';
  cognitiveBiases: CognitiveBias[];
  decisionStyle: 'ANALYTICAL' | 'INTUITIVE' | 'COLLABORATIVE' | 'DIRECTIVE' | 'UNKNOWN';
  informationGaps: string[];
  currentSituation: SituationSnapshot;
  pressurePoints: string[];
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  lastUpdatedAt: string;
  version: number;
  dataSource: 'USER_EXPLICIT'; // 只允许用户主动提供的信息
}
```

---

## 认知偏差识别

创业者常见偏差目录（识别不等于指责）：

| 偏差类型 | 说明 | 介入策略 |
|----------|------|----------|
| SURVIVORSHIP_BIAS | 只看成功案例 | 补充失败案例数据 |
| CONFIRMATION_BIAS | 只接受支持自己观点的信息 | 主动提供对立证据 |
| SUNK_COST_FALLACY | 因已投入而不愿放弃 | 引导关注未来收益 |
| OVERCONFIDENCE | 高估自己的判断能力 | 温和的现实检验 |
| PLANNING_FALLACY | 低估完成时间和资源 | 要求分解为小步骤 |
| STATUS_QUO_BIAS | 抵触改变 | 量化不改变的代价 |

**纪律**：至少需要 2 个具体行为证据才能识别偏差。偏差信息仅供内部使用，不直接告知用户。

---

## 处境快照模型

```typescript
interface SituationSnapshot {
  selfReportedProblem: string;      // 用户自己认为的问题
  eliyHypothesis?: string;          // Eliy 的初步判断
  constraints: Array<{
    type: 'TIME' | 'MONEY' | 'PEOPLE' | 'TECHNOLOGY' | 'MARKET' | 'REGULATORY';
    description: string;
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
  }>;
  attemptedSolutions: Array<{
    description: string;
    outcome: 'WORKED' | 'PARTIALLY_WORKED' | 'FAILED' | 'UNKNOWN';
    learnings: string;
  }>;
  decisionDeadline?: string;
  emotionalState: 'CALM' | 'ANXIOUS' | 'FRUSTRATED' | 'OVERCONFIDENT' | 'OVERWHELMED' | 'EXCITED' | 'DEFENSIVE';
  timestamp: string;
}
```

---

## 跨层接口

### → Language 层

```typescript
interface HumanToLanguageOutput {
  preferredCommunicationStyle: 'DIRECT' | 'GENTLE' | 'DATA_DRIVEN' | 'STORY_BASED';
  currentEmotionalState: EmotionalState;
  domainExpertise: 'NOVICE' | 'INTERMEDIATE' | 'EXPERT';
  sensitiveTopics: string[];
}
```

### → Methodology 层

```typescript
interface HumanToMethodologyOutput {
  situationSnapshot: SituationSnapshot;
  relevantProfileData: Partial<FounderProfile>;
  identifiedBiases: CognitiveBias[];
}
```

---

## 运行纪律

1. **不猜测，要确认**：理解必须基于用户明确表达
2. **不评判，要理解**：目标是理解，不是评价
3. **不存储非必要信息**：只保留与商业诊断相关的信息
4. **持续校准**：每次交互校验和更新理解模型
5. **尊重用户主权**：用户有权拒绝提供任何信息

---

*HLAMT H 层。受宪法和 HLAMT 总纲约束。*
