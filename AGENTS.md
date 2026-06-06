# Eliy-Agent-Core｜AGENTS.md

## 一、文件目的

本文件是 Eliy-Agent-Core 项目的本地 Coding Agent 运行约束。

进入本项目后，Coding Agent 必须先读取本文件，再执行任何代码修改、测试、提交或迁移操作。

本文件目标：

1. 保护已冻结基线；
2. 控制修改范围；
3. 维持可复现测试；
4. 保护 `.env` 与 API Key；
5. 确保每次修改都有可审计证据；
6. 避免 Coding Agent 在未确认边界时扩大任务。

---

## 二、当前项目定位

Eliy-Agent-Core 是 Eliy 艾利的本地核心运行项目。

当前阶段重点是：

1. Chat-first 用户侧交互；
2. DeepSeek V4 Flash real_llm 调用；
3. Artifact Payload；
4. Runtime Guard；
5. Recorder；
6. NEXT_CONTEXT；
7. ARTIFACT_STATUS；
8. SFOCUS.skill；
9. Web Staging 验证。

项目当前不以大规模重构为目标。所有修改必须围绕当前明确任务进行。

---

## 三、当前冻结基线

### 1. SFOCUS.skill real_llm 基线

冻结卡：

```text
CP-ELIY-V032-SFOCUS-SKILL-REAL-LLM-BASELINE-01｜SFOCUS.skill real_llm 基线冻结卡｜V0.1
```

冻结 commit：

```text
26c36040e84daa1255253f7f3c548d78fd0d95a4
```

已验证：

1. SFOCUS.skill 标准文件结构完成；
2. DeepSeek V4 Flash real_llm 调用通过；
3. SFOCUS.skill 可触发；
4. next_action_card 可生成；
5. proposed → accepted → frozen 状态流转通过；
6. Action Card Payload 可跨轮保持；
7. NEXT_CONTEXT / ARTIFACT_STATUS / Recorder 链路通过；
8. 前端不会在采用或冻结时生成空白行动卡；
9. 工作区最终干净。

### 2. SFOCUS.skill Web Staging 技术验证基线

冻结卡：

```text
CP-ELIY-V032-SFOCUS-WEB-STAGING-TEST-01｜SFOCUS.skill 网页端体验验证基线｜V0.1
```

冻结 commit：

```text
eefe8f2
```

已验证：

1. SFOCUS.skill 网页端可触发；
2. DeepSeek V4 Flash real_llm 调用正常；
3. next_action_card 可生成；
4. C2 后状态规范化为 proposed；
5. D 后状态流转为 accepted；
6. E 后状态流转为 frozen；
7. 后台不再写入 suggested；
8. 前端不生成空白 Action Card；
9. 工作区干净。

---

## 四、进入项目后的固定检查

每次开始工作前，先执行：

```bash
pwd
git branch --show-current
git log --oneline -5
git status --short
```

并回报：

1. 当前分支；
2. 当前 HEAD；
3. 工作区是否干净；
4. 是否与当前任务要求的基线一致。

如工作区不干净，先说明原因，不要直接覆盖、删除或清理。

---

## 五、环境变量与安全规则

`.env` 不得完整输出。

允许确认变量是否存在：

```bash
node -e "require('dotenv').config(); console.log({
  hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
  mode: process.env.CANDIDATE_GENERATION_MODE
})"
```

不得输出：

1. `DEEPSEEK_API_KEY` 完整值；
2. 任何私钥；
3. 账号密码；
4. token；
5. 本地敏感路径以外的个人资料。

如需要调试 API，只输出：

1. 是否存在 Key；
2. 当前模式；
3. HTTP status；
4. 错误类型；
5. 脱敏后的响应摘要。

---

## 六、Artifact Lifecycle 规则

当前 Artifact Lifecycle 标准状态为：

```text
none
proposed
pending_user_confirmation
accepted
frozen
```

不得新增生命周期状态。

特别规则：

1. `suggested` 不是后台生命周期状态；
2. 若 LLM payload 或 client artifact context 中出现 `suggested`，后台生命周期必须规范化为 `proposed`；
3. `accepted` 只能由用户明确采用、确认采用等语义触发；
4. `frozen` 只能由用户明确冻结语义触发；
5. Runtime Guard 是状态判定的核心边界，不得绕过。

---

## 七、Runtime Guard 修改规则

以下逻辑属于高风险区域：

1. `classifyArtifactInput()`;
2. `determineArtifactStatus()`;
3. `/api/chat`;
4. `/api/record`;
5. Artifact Payload parse；
6. ARTIFACT_STATUS 写入；
7. NEXT_CONTEXT 写入；
8. Client Artifact Context carry-over。

修改这些区域前必须先说明：

1. 当前失败现象；
2. 失败发生在哪一层；
3. 最小修正点；
4. 是否影响已冻结基线；
5. 是否改变 Artifact Lifecycle；
6. 是否改变 Runtime Guard；
7. 是否引入硬编码样本词。

如任务未明确要求，不得修改 `classifyArtifactInput()` 和 `determineArtifactStatus()`。

---

## 八、SFOCUS.skill 规则

SFOCUS.skill 文件结构：

```text
skills/
  sfocus/
    SKILL.md
    references/
      sfocus-process.md
      minimal-action-card-template.md
      recorder-fields.md
      eval-scenarios.md
```

当前 SFOCUS.skill 核心逻辑已冻结。

除非任务明确要求，不得修改：

1. `skills/sfocus/SKILL.md`;
2. `skills/sfocus/references/`;
3. SFOCUS 正式步骤；
4. Choke the Release 规则；
5. Minimal Action Card 结构。

SFOCUS.skill 当前固定步骤：

```text
Step 0｜System
Step 1｜Find
Step 2｜Optimize
Step 3｜Cooperation
Step 4｜Upgrade
Step 5｜Start again
```

---

## 九、当前 Web Staging 任务边界

当前 Web Staging 后续工作重点是：

1. 提供用户可访问的网页端测试地址；
2. 确认启动方式；
3. 确认访问方式；
4. 确认 real_llm 环境配置；
5. 保持已冻结 SFOCUS.skill 与 Artifact Lifecycle 不变。

允许处理：

1. 本地启动说明；
2. 局域网访问；
3. 临时隧道；
4. 临时测试地址；
5. 环境检查；
6. 前后端连接检查；
7. 启动脚本；
8. 测试文档。

不得在 Web Staging 阶段顺手修改：

1. SFOCUS.skill 核心逻辑；
2. Runtime Guard；
3. Artifact Lifecycle；
4. Recorder 语义；
5. DeepSeek real_llm 调用链路；
6. Action Card 状态流转逻辑。

如发现必须修改上述内容，先报告原因并等待确认。

---

## 十、测试证据要求

每次代码修改后，必须回传：

1. 修改了哪些文件；
2. 修改的核心逻辑；
3. 使用了什么测试方式；
4. 测试输入；
5. 测试输出；
6. 关键日志；
7. 关键文件内容；
8. `git status --short`;
9. `git log --oneline -5`;
10. commit hash。

涉及 SFOCUS.skill / Action Card 时，至少测试：

### Test C2｜生成 Action Card

输入：

```text
我先选老师时间和精力不足作为当前候选瓶颈，请帮我形成一张最小行动卡。
```

期望：

```text
Artifact: next_action_card
Status: proposed
```

### Test D｜采用 Action Card

输入：

```text
这张最小行动卡可以采用。
```

期望：

```text
Artifact: next_action_card
Status: accepted
```

### Test E｜冻结 Action Card

输入：

```text
先冻结这张 S’FOCUS 最小行动卡。
```

期望：

```text
Artifact: next_action_card
Status: frozen
```

并检查：

1. 前端是否生成空白卡；
2. 前端是否保留原 Action Card 内容；
3. ARTIFACT_STATUS.md；
4. NEXT_CONTEXT.md；
5. 终端 `/api/chat` 与 `/api/record` 日志。

---

## 十一、证据采集顺序

测试时先保存证据，再清理工作区。

正确顺序：

1. 执行测试；
2. 保存 ARTIFACT_STATUS.md；
3. 保存 NEXT_CONTEXT.md；
4. 保存终端日志；
5. 保存前端截图或前端观察结果；
6. 回传测试结果；
7. 再执行清理。

清理命令示例：

```bash
git restore eliy-kernel/hlamt/EVIDENCE.md \
  eliy-kernel/memory/ARTIFACT_STATUS.md \
  eliy-kernel/memory/NEXT_CONTEXT.md \
  eliy-kernel/memory/STATE.md \
  eliy-kernel/transcripts/latest-transcript.md

git clean -fd
git status --short
```

不得在证据采集前先清理。

---

## 十二、提交规则

每次提交前确认：

```bash
git diff --stat
git status --short
```

提交信息采用简洁格式：

```text
fix(scope): description
feat(scope): description
test(scope): description
docs(scope): description
```

示例：

```text
fix(sfocus): normalize suggested action card status to proposed
```

提交后回传：

```bash
git log --oneline -5
git status --short
git show --name-status --oneline HEAD
```

---

## 十三、分支规则

新任务优先新开分支。

分支命名建议：

```text
test/<task-name>
feature/<task-name>
fix/<task-name>
docs/<task-name>
```

当前已使用：

```text
test/sfocus-web-staging
chore/codex-agent-harness
```

冻结后不直接在冻结基线上继续混合开发。新目标、新验证、新部署应开新分支。

---

## 十四、任务执行方式

收到任务后，按以下顺序工作：

1. 复述当前任务对象；
2. 确认当前分支与 HEAD；
3. 读取相关文件；
4. 给出只读诊断；
5. 标明最小修正点；
6. 明确允许修改文件；
7. 执行修改；
8. 执行测试；
9. 提交 commit；
10. 回传证据。

若任务只是环境准备或只读检查，不要修改代码。

---

## 十五、当前优先级

当前最高优先级：

让用户获得可访问的网页端测试地址，并能在浏览器中体验 SFOCUS.skill real_llm 闭环。

当前不处理：

1. 新方法论 Skill；
2. BAM；
3. 多智能体；
4. Business Workspace；
5. 语音；
6. 长期账号系统；
7. 多用户权限；
8. 数据库迁移。

如收到相关需求，先确认是否切换任务分支。

---

## 十六、失败处理规则

如果测试失败，先定位失败层级：

1. 前端输入；
2. `/api/chat`;
3. real_llm 调用；
4. `<eliy_artifact>` parse；
5. artifact payload；
6. 前端渲染；
7. `/api/record`;
8. Runtime Guard；
9. ARTIFACT_STATUS.md；
10. NEXT_CONTEXT.md；
11. Git 工作区。

不得直接扩大修改范围。先给出失败层级和最小修正建议。

---

## 十七、输出格式

回传开发结果时使用以下结构：

1. 当前分支；
2. 当前 HEAD；
3. 修改文件；
4. 核心修改；
5. 测试方式；
6. 测试结果；
7. 关键证据；
8. Git 状态；
9. 是否建议冻结；
10. 下一步建议。

---

## 十八、总原则

Eliy-Agent-Core 的当前开发原则：

1. 保护冻结基线；
2. 小步修改；
3. 每步可测；
4. 每步可回滚；
5. 证据先于判断；
6. 不绕过 Runtime Guard；
7. 不泄露 `.env`；
8. 不扩大任务边界；
9. 不用一次修改解决多个问题；
10. 先保持系统可运行，再谈优化。
