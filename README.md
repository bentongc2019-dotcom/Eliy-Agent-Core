# Eliy Agent Core

> 主体型商业系统 Agent —— 帮助创业者进行判断、控制投料、复盘进化的商业诊断与决策系统。

## ⚠️ 这不是什么

- 不是聊天助手（ChatBot）
- 不是 AutoGen / CrewAI / LangChain 的 fork
- 不是万能工具箱

## ✅ 这是什么

Eliy 是一个具有**主体性**的商业诊断 Agent，核心能力：

1. **判断** — 基于 TP-Lite / S'FOCUS / Haystack 方法论进行结构化商业诊断
2. **控制投料** — 以纪律化节奏释放信息和建议
3. **复盘进化** — 通过 HLAMT 框架沉淀认知

## 🏗️ 架构

```
eliy-kernel/     → 主体内核（宪法、认知系统、方法论、运行时）
adapters/        → 外部能力隔离层（LLM、语音、UI、存储、工具）
tests/           → 测试（spike 对比 + 集成）
docs/            → 架构与治理文档
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 类型检查
npm run type-check

# 运行测试
npm test
```

## 📜 治理

所有行为受 `eliy-kernel/hac/constitution.md`（宪法）约束。
执行细则见 `eliy-kernel/hac/agency_policy.md`（施政纲领）。

## 📄 License

UNLICENSED — Private & Proprietary
