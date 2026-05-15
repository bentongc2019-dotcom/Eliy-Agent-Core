# TRAINING — 训练进化层

> HLAMT 第五层（最顶层）
> 职责：通过结构化复盘沉淀认知，实现 Eliy 的自我进化。
> 核心约束：所有进化必须受治理审查，不可自动扩张。

---

## 核心理念

> 「进化不是自动发生的，而是有纪律的沉淀。」

Training 层不是"自我学习"——Eliy 不会自己偷偷变聪明。
每一次进化都是一个受控的、可审计的、人类参与的过程。

---

## 进化来源

| 来源 | 描述 | 治理等级 |
|------|------|----------|
| 诊断复盘 | 一次完整诊断循环结束后的总结 | INSIGHT（需治理审查+用户确认） |
| 方法论改进 | 发现方法论的不足和优化空间 | METHODOLOGY（需管理员审批） |
| 模式识别 | 跨用户的共性问题模式 | METHODOLOGY（需管理员审批） |
| 错误修正 | Eliy 做出了错误判断后的修正 | INSIGHT（需治理审查+用户确认） |

---

## 复盘结构

每次完整的诊断-行动-复盘循环结束后，Training 层生成复盘报告：

```typescript
interface RetrospectiveReport {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: string;
  
  // 诊断回顾
  originalDiagnosis: {
    findings: string[];
    judgments: string[];
    recommendations: string[];
  };
  
  // 实际结果
  actualOutcome: {
    description: string;
    userFeedback?: string;         // 用户反馈
    objectiveMetrics?: Record<string, number>; // 客观指标变化
  };
  
  // 偏差分析
  deviationAnalysis: {
    accurateJudgments: string[];   // 准确的判断
    inaccurateJudgments: Array<{
      judgment: string;
      actualOutcome: string;
      rootCause: string;           // 为什么判断错了
    }>;
    missedSignals: string[];       // 遗漏的信号
  };
  
  // 进化提案（需要经过治理审查才能生效）
  evolutionProposals: EvolutionProposal[];
}

interface EvolutionProposal {
  id: string;
  type: 'METHOD_IMPROVEMENT' | 'PATTERN_RECOGNITION' | 'ERROR_CORRECTION';
  description: string;
  evidence: string[];              // 支撑证据
  proposedChange: string;          // 具体的改变
  expectedImpact: string;          // 预期影响
  
  // 治理状态
  governanceStatus: 'PROPOSED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewNotes?: string;
}
```

---

## 进化治理流程

```
[复盘完成] → [生成进化提案]
                  │
                  ▼
         [治理规则自动审查]
          ├── 是否违反宪法？ → YES → 拒绝
          ├── 是否自动扩张记忆？ → YES → 拒绝
          └── 通过自动审查
                  │
                  ▼
         [人工审查（根据治理等级）]
          ├── INSIGHT → 用户确认
          └── METHODOLOGY → 管理员审批
                  │
                  ▼
         [审批通过] → [写入进化库] → [更新相关层级]
```

---

## 进化边界（不可越线）

1. **不可修改宪法**：Training 层的进化不能修改 constitution.md 的内容
2. **不可降低标准**：进化不能放宽判断纪律或确认等级
3. **不可自动生效**：所有进化必须经过人类审批
4. **不可跨用户泄露**：从用户 A 学到的模式不能直接应用于用户 B（除非脱敏为通用模式）
5. **必须可回滚**：每次进化都必须支持回滚到上一版本

---

## 进化指标

```typescript
interface EvolutionMetrics {
  totalRetrospectives: number;        // 总复盘次数
  proposalCount: number;              // 提案总数
  approvalRate: number;               // 审批通过率
  judgmentAccuracyTrend: number[];    // 判断准确率趋势
  averageConfidenceCalibration: number; // 置信度校准度（预测 vs 实际）
  patternLibrarySize: number;         // 模式库大小
}
```

---

## 跨层反馈接口

### → 向 Methodology 层反馈

```typescript
interface TrainingToMethodologyFeedback {
  methodologyId: string;
  improvements: Array<{
    area: string;
    currentBehavior: string;
    suggestedBehavior: string;
    evidence: string[];
  }>;
}
```

### → 向 Human 层反馈

```typescript
interface TrainingToHumanFeedback {
  newPatterns: Array<{
    patternName: string;
    description: string;
    recognitionCriteria: string[];
  }>;
  biasCalibrations: Array<{
    biasType: string;
    originalWeight: number;
    calibratedWeight: number;
  }>;
}
```

---

*HLAMT T 层。受宪法第八条（记忆写入治理）和第九条（Skill 管理）约束。*
