# Plan Management Semantic Contract

> Eliy O'PDCA Plan Management Semantics Closure v0.1

## File Positioning / 文件定位

本文件是 Eliy-Agent-Core 的 O'PDCA 计划经营语义合约文件。

本文件作为语义层面的冻结文件，不输出实现方案，不添加新解释，不进入工程交付。

## Stage Results / 本阶段成果

本阶段完成 O'PDCA 计划经营语义的闭合讨论，并产出：

- 核心命名规则
- 核心定义
- O'PDCA 语义映射
- O 单最小结构
- O 单状态语义
- U 型计划经营循环模型
- 预算、所需支援事项、Evidence / Trace、确认、绩效证据等边界
- Skill / Harness / Runtime 语义分工
- 用户侧文案规则
- 两岸用语转换规则
- 验证用例语义范围
- 工程交付边界

## Overall Judgment / 总判断

以下语义结论已经充分讨论并到达闭合点。本文件作为冻结引用锚点，后续工程实现以此为根据，不再重新打开语义讨论。

## Core Naming Rules / 核心命名规则

- `rc` = Richard Chen / 陈宗贤教授
- user-facing term（用户侧术语） = `O 单`
- engineering term（工程术语） = `OTUnit`
- `OTUnit` = Objective Task Unit
- 用户侧不直接展示 `OTUnit`

## Core Definitions / 核心定义

- **Objective** 是基于经营情境与证据提出、可被证据复盘的经营假设
- **Evidence** 说明事实依据
- **Trace** 说明系统过程
- **Confirmation** 是用户明确确认的行为，不是系统自动推断

## O'PDCA Semantics / O'PDCA 语义

O'PDCA 映射关系：

| Symbol | English | 中文 |
|--------|---------|------|
| O | Objective | 目标 |
| P | Plan | 计划 |
| D | Do | 执行 |
| C | Check | 检查 / 检讨 |
| A | Action | 改善行动 |

## rc O'PDCA to Eliy O 单 Mapping

rc 教授的 O'PDCA 到 Eliy O 单的映射关系：

- O（目标）→ Objective（经营假设）
- P（计划）→ O 单 Plan（计划）
- D（执行）→ O 单 执行 / 跟进
- C（检查）→ O 单 检查 / 检讨
- A（行动）→ O 单 改善行动 / 修订

## U-Shaped Planning Flow / U 型计划经营循环

U 型计划经营循环自上而下分解，自下而上汇总：

```
company objective              | 公司总目标
department objective           | 部门目标
department annual business     | 部门年度经营计划 + 部门预算
  plan + department budget
department plan presentation   | 部门计划发表研讨 / 确认
  / confirmation
annual plan and total budget   | 汇总年度计划与总预算
  aggregation
unit objective                 | 单位目标
unit annual work plan          | 单位年度工作计划
individual objective           | 个员目标
individual annual work plan    | 个员年度工作计划
```

## O 单 Minimal Structure

O 单最小结构：

- 负责人
- 完成时间
- 检查时间
- 判断标准
- 跟进 / 持续跟进 / 追踪进度
- 推进
- 检讨 → 差异 → 改善行动 → 修订 → 结案
- 依据 / 证据
- 所需支援事项
- 预算说明
- 绩效证据

## O 单 State Semantics

O 单状态语义：

- 建立（proposed）
- 确认（confirmed）
- 执行中（in_progress）
- 阻塞（blocked）
- 结案（closed）

## Record-Layer Semantics

记录层语义：

- Follow-up（跟进记录）
- Check（检查记录）
- Review（检讨记录）
- Revision（修订记录）
- Adjustment（调整记录）
- Closure（结案记录）

## Objective / O 单 Relationship

Objective 与 O 单的关系：

- 一个 Objective 下可有多个 O 单
- O 单的状态变化不影响 Objective 本身的存在
- Objective 的达成评估依赖于其下 O 单的结案证据

## Budget Semantics / 预算语义

预算说明作为可选的 O 单辅助字段，不参与 O 单本身的状态流转判定。

## Support-Request Semantics / 所需支援事项语义

所需支援事项作为可选的 O 单辅助字段，记录执行过程中需要的资源或支援请求。

## Evidence / Trace Boundary

- **Evidence** 用于说明行为的事实依据（外部 / 业务侧）
- **Trace** 用于说明系统的完整过程（系统侧 / 审计侧）
- Evidence 和 Trace 在语义上分开，在工程上不在同一字段存储

## User Confirmation Boundary

- 用户确认是 O 单状态变更的必要前置条件
- 系统不自行为用户确认
- 确认行为产生 Trace 记录

## Skill / Harness / Runtime Semantic Division

- **Skill** 只建议 / 识别 / 组织 / 发起确认
- **Harness** 校验字段、状态、确认、权限，并写入 Runtime / Evidence / Trace
- **Runtime** 保存 Objective、O 单 / OTUnit、Evidence、Trace、Confirmation、Review、Revision、Closure、Performance Evidence

## User-Facing Language Rules / 用户侧文案规则

用户侧文案使用的术语：

```
目标
O 单
负责人
完成时间
检查时间
判断标准
跟进
持续跟进
追踪进度
推进
检讨
差异
改善行动
修订
结案
依据 / 证据
所需支援事项
预算说明
绩效证据
```

用户侧文案不单独使用"跟"作为动词。

## Cross-Strait Terminology Conversion / 两岸用语转换

两岸用语对照：

| 简体中文 | 繁體中文 |
|----------|----------|
| 证据 | 證據 |
| 跟进 | 跟進 |
| 结案 | 結案 |
| 支援 | 支援 |
| 检讨 | 檢討 |
| 预算 | 預算 |
| 目标 | 目標 |
| 计划 | 計劃 |
| 执行 | 執行 |
| 负责人 | 負責人 |
| 改善行动 | 改善行動 |

## Validation Cases Semantic Range / 验证用例语义范围

验证用例覆盖以下语义范围：

- O 单的创建、确认、执行、阻塞、结案状态
- 跟进记录的追加
- 检查记录的产生
- 检讨 → 差异 → 改善行动 → 修订 → 结案的完整链路
- 依据 / 证据的引用
- 预算说明与所需支援事项的可选性
- 用户确认的前置性

## Engineering Handoff Boundary / 工程交付边界

本文件作为语义闭合点，工程实现以此为根据。

工程交付时：

- 不输出 Schema
- 不输出 TypeScript 接口定义
- 不输出 API 设计
- 不输出 UI 实作方案
- 不输出 数据库设计
- 不继续进入 Schema、代码、测试、工程指令或实现计划

## Closure Judgment / 闭合判断

以上语义结论已经 rc 确认，到达闭合点。后续工程实现应以此文件为语义锚点，不重新打开本阶段的语义讨论。

## Stage Conclusion / 阶段结论

O'PDCA 计划经营语义合约 v0.1 已闭合。

下一阶段应进入工程实现，但工程实现不在本文件的范围内。
