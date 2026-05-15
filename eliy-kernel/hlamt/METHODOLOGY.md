# METHODOLOGY — 方法论层

> HLAMT 第四层（核心引擎）
> 职责：运行 TP-Lite / S'FOCUS / Haystack Filter 进行结构化商业诊断。
> 这是 Eliy 判断能力的核心驱动力。

---

## 核心理念

> 「没有方法论的判断就是猜测。」

Methodology 层定义了 Eliy 使用哪些方法论、何时使用、如何组合。
具体实现见 `methodology/` 目录下的 TypeScript 文件。

---

## 方法论注册表

| 方法论 | 代号 | 用途 | 实现文件 |
|--------|------|------|----------|
| TP-Lite | TPL | 约束理论轻量版：识别业务瓶颈 | `methodology/tp_lite.ts` |
| S'FOCUS | SFC | 战略聚焦五步法：从识别瓶颈到制定策略 | `methodology/sfocus.ts` |
| Haystack Filter | HSF | 信息降噪：从海量信息中提取关键信号 | `methodology/haystack_filter.ts` |

---

## 方法论调用协议

### 调用前置条件

```typescript
interface MethodologyInvocation {
  methodologyId: 'TPL' | 'SFC' | 'HSF';
  
  // 前置条件检查
  preconditions: {
    minimumDataPoints: number;     // 最少需要多少数据点
    requiredInputTypes: string[];  // 必须有哪些类型的输入
    currentPhase: ReleasePhase;    // 当前投料阶段（某些方法论只在特定阶段可用）
  };
  
  // 输入数据
  input: MethodologyInput;
  
  // 配置
  config: {
    maxIterations: number;         // 最大迭代次数
    confidenceThreshold: number;   // 最低置信度阈值
    timeoutMs: number;             // 超时时间
  };
}
```

### 调用决策矩阵

| 用户问题类型 | 首选方法论 | 辅助方法论 | 投料阶段 |
|-------------|-----------|-----------|----------|
| 「为什么增长停滞了」 | TP-Lite | Haystack | DIAGNOSIS |
| 「我应该先做什么」 | S'FOCUS | TP-Lite | PRESCRIPTION |
| 「信息太多不知道怎么决策」 | Haystack | S'FOCUS | FRAMING |
| 「我的瓶颈在哪里」 | TP-Lite | - | DIAGNOSIS |
| 「如何分配有限资源」 | S'FOCUS | TP-Lite | PRESCRIPTION |

---

## 方法论输出规范

所有方法论的输出必须符合统一格式：

```typescript
interface MethodologyOutput {
  methodologyId: string;
  executionId: string;              // 本次执行唯一 ID
  timestamp: string;
  
  // 核心输出
  findings: Finding[];              // 发现列表
  judgments: Judgment[];             // 判断列表
  recommendations: Recommendation[]; // 建议列表
  
  // 可追溯性
  inputDataRefs: string[];          // 引用的输入数据
  reasoningChain: ReasoningStep[];  // 推理链路
  
  // 质量指标
  overallConfidence: number;        // 整体置信度 0-1
  dataCompleteness: number;         // 数据完整度 0-1
  limitations: string[];            // 局限性说明
}

interface Finding {
  id: string;
  description: string;
  evidence: string[];
  significance: 'CRITICAL' | 'IMPORTANT' | 'MINOR';
}

interface Judgment {
  id: string;
  statement: string;               // 判断陈述
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  supportingEvidence: string[];
  refutationConditions: string[];  // 推翻条件
}

interface Recommendation {
  id: string;
  action: string;                  // 建议的行动
  priority: 'P0' | 'P1' | 'P2';   // 优先级
  expectedOutcome: string;
  risks: string[];
  prerequisites: string[];         // 前置条件
}

interface ReasoningStep {
  step: number;
  description: string;
  inputData: string;
  logic: string;
  output: string;
}
```

---

## 方法论组合规则

1. **不可同时运行两个主方法论**：避免结论冲突
2. **可叠加辅助方法论**：用 Haystack 预处理后再进入 TP-Lite
3. **结论冲突处理**：如果两个方法论产生矛盾结论，必须标注冲突并呈现给用户
4. **迭代深化**：同一方法论可以在获得新数据后重新运行

---

*HLAMT M 层。受宪法第四条（判断三原则）约束。*
