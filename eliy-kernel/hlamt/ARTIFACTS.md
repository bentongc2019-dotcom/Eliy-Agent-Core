# ARTIFACTS — 认知工件层

> HLAMT 第三层
> 职责：将 Eliy 的分析和判断固化为可追溯、可审计的结构化产物。
> 核心原则：**没有数据支撑的工件就是废纸。**

---

## 核心理念

> 「每一个工件都必须回答：这个结论是从哪来的？」

认知工件不是"漂亮的报告"，而是 Eliy 思考过程的结构化呈现。
用户可以追问任何一个结论的来源，工件必须给出完整的追溯链路。

---

## 工件类型注册表

| 工件类型 | 文件 | 用途 | 数据源 |
|----------|------|------|--------|
| DiagnosisReport | `diagnosis_report.html` | 商业诊断报告 | 方法论分析结果 + 用户输入 |
| SystemMap | `system_map.html` | 业务系统链路图 | 用户描述 + Eliy 结构化 |
| TOCCloud | `toc_cloud.html` | 约束理论关系可视化 | TP-Lite 分析结果 |

---

## 工件元数据规范

每个工件必须包含以下元数据：

```typescript
interface ArtifactMetadata {
  id: string;                        // 工件唯一 ID
  type: 'DiagnosisReport' | 'SystemMap' | 'TOCCloud';
  version: number;                   // 工件版本号
  createdAt: string;                 // 创建时间 ISO 8601
  updatedAt: string;                 // 最后更新时间
  sessionId: string;                 // 所属会话 ID
  userId: string;                    // 所属用户 ID
  
  // === 可追溯性（核心！） ===
  dataSources: DataSourceRef[];      // 数据来源引用列表
  methodologyUsed: string[];         // 使用的方法论
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // === 投料阶段标注 ===
  releasePhase: 'INTAKE' | 'FRAMING' | 'DIAGNOSIS' | 'PRESCRIPTION' | 'FOLLOW_UP';
  
  // === 有效性 ===
  validUntil?: string;               // 有效期（过期后提示复查）
  invalidationConditions: string[];  // 什么情况下此工件失效
}

interface DataSourceRef {
  id: string;                        // 数据源 ID
  type: 'USER_INPUT' | 'METHODOLOGY_OUTPUT' | 'EXTERNAL_DATA';
  description: string;               // 数据来源描述
  timestamp: string;                 // 数据获取时间
  rawDataSnapshot?: string;          // 原始数据快照（脱敏后）
}
```

---

## 工件生命周期

```
[需求触发] → [数据收集] → [结构化处理] → [渲染生成] → [用户呈现] → [版本归档]
     │                                                        │
     │            [数据变更] → [工件失效检查] → [更新/作废]      │
     └────────────────────────────────────────────────────────┘
```

### 生命周期规则

1. **创建**：只有 Methodology 层的分析完成后，才能触发工件创建
2. **更新**：数据源更新时，相关工件必须标记为"待刷新"
3. **作废**：当失效条件满足时，工件自动标记为"已作废"
4. **归档**：所有版本永久保留，支持历史对比

---

## 可追溯性实现

### 追溯链路示例

```
用户在工件中看到：「你的获客成本是行业平均的 3.2 倍」
                     │
                     ▼ 追溯
数据源 1：用户输入 — 「我们月均获客成本约 5000 元/客户」(2026-05-15)
数据源 2：方法论 — TP-Lite 瓶颈分析输出 (session_abc123)
数据源 3：外部参考 — 行业基准数据（来源标注）
                     │
                     ▼ 计算链路
5000 / 1562.5(行业均值) = 3.2 倍
```

### 追溯接口

```typescript
interface TraceabilityQuery {
  artifactId: string;
  claimText: string;   // 用户想追溯的具体结论
}

interface TraceabilityResult {
  claim: string;
  dataSources: DataSourceRef[];
  calculationChain: string;   // 计算/推理过程
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  caveats: string[];           // 注意事项/局限性
}
```

---

## 工件渲染规范

### HTML 工件结构要求

所有 HTML 工件必须遵循：

1. **数据与展示分离**：HTML 中嵌入 `<script type="application/json">` 存放结构化源数据
2. **可离线查看**：不依赖外部 CDN，所有样式内联
3. **打印友好**：支持 `@media print` 优化
4. **响应式**：移动端可正常阅读
5. **可追溯标注**：每个判断结论标注 `data-source-id`，点击可展开数据来源

---

## 跨层接口

### ← 从 Language 层接收

```typescript
interface ArtifactsInput {
  formattedContent: string;
  structuredAnnotations: Array<{
    type: 'JUDGMENT' | 'EVIDENCE' | 'ACTION' | 'CAVEAT';
    content: string;
    metadata: Record<string, unknown>;
  }>;
}
```

### ← 从 Methodology 层接收

```typescript
interface MethodologyToArtifactsOutput {
  analysisResult: Record<string, unknown>;   // 分析结果
  judgmentChain: JudgmentNode[];              // 判断链路
  dataSources: DataSourceRef[];              // 数据来源
}
```

---

*HLAMT A 层。受宪法第七条（认知工件不可伪造）约束。*
