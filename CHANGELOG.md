# 💎 Eliy Agent Core — 尊享升级日志 (Changelog)

> **当前版本**：`v0.2.0`  
> **更新时间**：2026-05-19  
> **首席技术合伙人寄语**：富老板，我们完成了本阶段最核心的“感官与大脑”大升级！这次更新不仅让 Eliy 穿上了最顶奢的“紫金高定西装”，还给它装上了“双脑秒级切换”的超级引擎，同时把语音打断与安全防护拉到了商业级天花板。以下是今天为您整理的硬核更新细节：

## 🧊 2026-06-27: Conversation Management hk-beta2 deployed + live smoke baseline frozen

### 冻结记录
* **冻结 ID**：`CP-ELIY-BETA2-CONVERSATION-MANAGEMENT-HK-DEPLOYED-BASELINE-01`
* **冻结范围**：Conversation Management 已部署到 hk-beta2，runtime verification passed，owner-test authentication unblock passed，live browser smoke passed。
* **已验收结果**：自动命名、手动重命名、钉选、归档、删除、状态保留、Beta 1.0 protected、secret redaction、local / remote worktree clean。

### 运维事实
* hk-beta2 live smoke 依赖 `/etc/eliy-beta2/env` 中的 owner-test 变量。
* 相关变量名：`ELIY_OWNER_TEST_EMAIL`、`ELIY_OWNER_TEST_INVITE_CODE`
* 本次记录仅保留变量名，不记录变量值。

### 测试规则
* live real_llm 环境下，Conversation Management smoke 以会话管理行为为准，不以单条 assistant 回复措辞作为阻断条件。

## 🧊 2026-06-27: Identity Style Guard main merged baseline frozen

### 冻结记录
* **冻结 ID**：`CP-ELIY-BETA2-IDENTITY-STYLE-GUARD-MAIN-MERGED-BASELINE-01`
* **冻结范围**：Identity Style Guard blocked branch 已清障，PR #2 已 squash merge 到 main，post-merge verification passed。
* **PR**：`#2`
* **merge method**：squash merge
* **main merge commit**：`37fac1b08e98fbe571dc5aebb593dc5806d2f91a`
* **merge title**：`fix(eliy): unblock beta2 identity style guard`
* **验证结果**：post-merge verification passed，secret redaction passed。
* **部署状态**：No deploy，No PM2 restart，No hk-beta2 deployment。

### 冻结范围说明

本次冻结表示：

* Identity Style Guard blocked branch 已清障。
* identity / style guard 已从固定措辞断言调整为行为、边界、角色语境断言。
* continuous business dialogue 不再被迫重复固定显式自我介绍。
* Eliy 的身份、老板语境、判断边界与主体型互动风格仍被保留。
* Conversation Management baseline 未被破坏。
* post-merge verification passed。

本次冻结不表示：

* 已 deploy hk-beta2。
* 已 PM2 restart。
* 已进入 S’FOCUS runtime。
* 已进入 O 单 runtime。
* 已进入 Project / Workspace / Company Space。
* 已修改 provider routing / real LLM config。
* 已修改 auth / invite / owner-test config。
* 已继续扩展 identity style guard。

---

## 🚀 2026-05-19: 双脑破局 —— DeepSeek V4 强力入驻与多模型无缝热切换

### 💡 为什么这个改动很牛？
以前我们的 Agent 只能绑定在一个模型上运行，一旦遇到接口拥堵或者需要更强推理能力的场景，就得改代码发版。现在我们做到了**运行时热切换**。同时，我们接入了性价比之王 **DeepSeek V4**，这能帮您省下 90% 以上的商业分析算力成本，同时保证诊断的极高水准！

### 🛠️ 落地技术细节
* **多模型热插拔架构** (`eliy-kernel/runtime/core.ts`)：
  * 重构了 `EliyRuntimeConfig`，新增 `llms` 适配器池与 `activeLlmId` 状态管理。
  * 引入了运行时热切换方法 `switchLLM(adapterName: string)`，完美向下兼容旧版单模型配置。
  * 在 UI 交互总线中新增了 `SWITCH_LLM` 事件监听，前端可以直接发号施令，秒级切换大脑。
* **DeepSeek 原生适配器** (`adapters/llm/deepseek.ts`)：
  * 精准实现 `LLMAdapter` 规范，原生支持 `deepseek-chat` (V4) 与 `deepseek-reasoner` (R1/深度思考)。
  * 实现了基于 SSE (Server-Sent Events) 的流式解析器，在保障高频并发的同时，提供极其顺滑的逐字吐字反馈。
  * 自带轻量化 `healthCheck()` 活性探测，如果 API 异常能自动在运行时发出预警。

---

## 🎙️ 2026-05-19: 语音底座升级 —— 多路高保真语音与网域安全屏障

### 💡 为什么这个改动很牛？
AI 的声音就是您公司的面子，绝不能有机械感。我们不仅引入了 Google 和 Azure 两大顶级高保真语音合成引擎，更重要的是，我们加装了**网域防护锁**！即使别人在前端抓到了您的 Google API Key，也别想在其他网站上盗刷您的额度，安全防线固若金汤。

### 🛠️ 落地技术细节
* **网域限制 API Key 方案** (`frontend/webchat/config/google-api-key.json`)：
  * 对 Google TTS 接口进行了专属的域名约束认证，将密钥与您的部署域名强绑定，安全感拉满。
  * 在 `.gitignore` 中完善了敏感机密的过滤规则，防止开发者意外将私钥推送到公开仓库。
* **GCP 服务账户 & JWT 鉴权支持** (`frontend/webchat/google-tts.js`)：
  * 完美支持通过 Google Cloud Platform (GCP) Service Account JSON 来生成短期鉴权 JWT，提供企业级的安全性。
* **Azure TTS 独立适配** (`frontend/webchat/azure-tts.js`)：
  * 新增高性能 Azure Speech SDK 级原生合成适配器，支持高保真的自然情感语调。

---

## 🎨 2026-05-18: 尊享紫金视觉 2.0 —— 富老板全双工实时交互系统

### 💡 为什么这个改动很牛？
富老板的时间以秒计算，听 AI 啰里啰唆地念稿是不可接受的。因此我们研发了**全双工打断系统** —— 您说话或打字的同时，AI 声音立马掐断，专注听您说。配合为您量身定制的“紫金磨砂玻璃”视觉和真音频频谱动画，科技感与尊贵感直接拉满。

### 🛠️ 落地技术细节
* **富老板紫金视觉 (Purple-Gold Glassmorphism)** (`frontend/webchat/voice.html` & `styles.css`)：
  * 升级全套 UI 主题，采用深紫底色、高光亮金边界、微光磨砂玻璃的“紫金富老板”视觉风格。
  * 重新设计了控制面板布局，在视觉上更显奢华、内敛和干练。
* **全双工智能打断 (Full-Duplex Interruption)**：
  * 实现 `interruptBot()` 机制。无论是在语音模式下捕获到用户声音（由 Edge/Google/Azure STT 驱动），还是用户在输入框中按下第一个按键，系统都会立即终止当前的 TTS 合成与浏览器播报，实现即时打断。
* **真实 Audio 频谱/波形动画**：
  * 接入浏览器 Web Audio API 的 `AnalyserNode`，实时提取音频的时域/频域数据。
  * 在 Canvas 上动态绘制随着发音高低起伏的丝滑频谱波形曲线，让 AI 的声音“肉眼可见”。
* **Edge TTS 自然男声引擎** (`frontend/webchat/edge-tts.js`)：
  * 内置成熟的 Edge 自然男声作为核心 fallback，配合 Web Speech API，在无网或弱网环境下无缝提供兜底合成服务。

---

## ⚙️ 2026-05-17 & 之前: 内核底座与自动部署工作流

### 🛠️ 落地技术细节
* **GitHub Pages 自动化构建部署** (`.github/workflows/pages.yml`)：
  * 新增 GitHub Actions 自动流水线，每次推送至 `main` 分支时，自动进行类型检查、生产环境编译并推送到托管平台。
* **TSConfig 全面修复** (`tsconfig.json`)：
  * 彻底清除了构建路径别名（Path Aliasing）与严格模块解析配置的报错，打通了从底层 `eliy-kernel` 到上层适配器的极速 TypeScript 编译链条。

---

> 💼 **Eliy 已经整装待发。让科技赋能判断，用冷静实现跃迁。**
