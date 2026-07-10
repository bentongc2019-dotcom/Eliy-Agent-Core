# Eliy Chat UI Design Baseline V1

Document status: Frozen TO-BE V1 / Founder Approved / Frozen Baseline / Not Implementation-Ready

上位来源：`Eliy Chat UI Design Baseline V1｜Draft V0.1`

AS-IS PR93 仅用于对照，不进入 TO-BE 冻结，不代表设计基线。

## 1. Scope

- 产品定位：`Eliy｜老板的 AI 经营助手`
- 基准视口：`1440 × 900`
- 浏览器缩放：`100%`
- 设计语言：`简体中文`
- 本文档只定义设计资产、交互规格、组件映射与工具边界
- 本文档不描述产品实现代码，不作为 implementation-ready 方案

## 2. Chat-first Information Architecture

默认页面首先是一款成熟 Chat 产品。

- 默认显示 `Sidebar + Chat Main`
- `Workspace` 默认关闭
- `Workspace` 只在用户主动打开或 Eliy 生成工件时出现
- `Skill` 不作为固定导航入口
- 暂未实现的能力不在主界面占位
- 多角色与 Skill 通过对话呈现，不堆在 Sidebar

## 3. Fixed and Scroll Regions

页面本身不滚动。所有滚动发生在独立内容区。

- `Sidebar`
  - 顶部固定：品牌 / 新对话 / 搜索
  - 中部滚动：项目 / 已置顶 / 对话
  - 底部固定：设置
- `Chat Main`
  - 顶部固定：Chat Header
  - 中部滚动：消息列表
  - 底部固定：Composer
- `Workspace`
  - 顶部固定：Workspace Header
  - 中部滚动：工件内容

## 4. Desktop Layout Tokens

### Frozen design values

| Token | Value | Status |
|---|---:|---|
| Eliy Purple 600 | `#7C3AED` | Frozen design value |
| Page background | `#FFFFFF` | Frozen design value |
| Sidebar background | 极浅灰近似值 | Frozen design value |
| Selected background | 极浅紫灰近似值 | Frozen design value |
| Text primary | 近黑 | Frozen design value |
| Text secondary | 中灰 | Frozen design value |
| Border subtle | 浅灰 | Frozen design value |

### Layout size

| Region | Width / Height | Status |
|---|---:|---|
| Sidebar | `272 px` | Frozen design value |
| Workspace | `420 px` | Frozen design value |
| Chat Main | 弹性宽度 | Frozen design value |
| Chat Header | `56 px` suggested | Frozen design value |
| Composer | `52–56 px` default, `160 px` max | Frozen design value |
| Message content max width | `780 px` | Frozen design value |

### Radius

| Surface | Radius |
|---|---:|
| 会话条目 | `6–8 px` |
| 用户消息 | `16–18 px` |
| 输入框 | `18–22 px` |
| 浮层菜单 | `10–12 px` |

## 5. Sidebar Structure

Sidebar uses light sections instead of large cards.

- Fixed top block
  - `Eliy`
  - `老板的 AI 经营助手`
  - `＋ 新对话`
  - `搜索`
- Middle scroll block
  - Section order: `项目 → 已置顶 → 对话`
  - Section titles are lightweight
  - Collapse arrows are visible
  - `已置顶` is not duplicated in normal conversation list
  - `项目` shows project containers, not every conversation inside
- Fixed bottom block
  - `设置`

Selected conversation uses a very light purple-gray background or a 2 px brand-purple indicator. The `…` affordance appears only on selected, hover, or keyboard focus states.

## 6. Chat Header

- Height: `56 px`
- Fixed at the top of the chat area
- Left side shows current conversation context
- Right side shows `工作区`
- `分享` is not shown as an available control in TO-BE V1
- If a future share entry is needed, its position may be reserved in text-only notes, not in the default UI

## 7. Message Presentation

- Message list scrolls independently
- Content is centered within a maximum width of `780 px`
- Eliy messages align left
- User messages align right
- User messages use a pale purple-gray background and a rounded bubble
- Eliy message attribution appears only when needed and at low visual weight
- Do not repeat uppercase `ELIY`
- Do not draw full bubbles around Eliy replies

## 8. Composer

- Fixed to the bottom of the chat area
- Left side has `＋`
- Placeholder: `输入想和 Eliy 讨论的问题……`
- Right side uses a brand-purple send icon with a white upward arrow
- Do not show `发送` text
- Disclaimer below the composer:
  - `Eliy 可能会出错，请核实重要经营信息。`
- Composer grows with multiline input up to `160 px`
- Overflow becomes internal scroll
- Empty input is disabled
- Enter sends
- Shift + Enter inserts a newline

## 9. Workspace

- Width in TO-BE V1: `420 px`
- Uses a single vertical divider on the left
- No outer card container
- Header text: `工作区`
- Content scrolls independently
- Empty state copy:
  - `这里会显示 Eliy 为你整理出的行动、资料和 O 单。`
- Do not show:
  - action cards
  -资料 cards
  - notes cards
  - multiple placeholders
  - real O 单 form
  - real资料功能
  - real备注功能

## 10. Eight Design States

All exports are `1440 × 900`.

| # | State | PNG path | Freeze status |
|---:|---|---|---|
| 1 | Default Chat | `eliy-native/docs/design/exports/01-default-chat.png` | Complete |
| 2 | Sidebar Sections | `eliy-native/docs/design/exports/02-sidebar-sections.png` | Complete |
| 3 | Conversation Overflow | `eliy-native/docs/design/exports/03-conversation-overflow.png` | Complete |
| 4 | Message Actions | `eliy-native/docs/design/exports/04-message-actions.png` | Complete |
| 5 | Fixed Composer | `eliy-native/docs/design/exports/05-fixed-composer.png` | Complete |
| 6 | Workspace Open | `eliy-native/docs/design/exports/06-workspace-open.png` | Complete |
| 7 | Project Conversation Variant A | `eliy-native/docs/design/exports/07-project-conversation-variant-a.png` | Complete, Not Selected / Historical alternative only |
| 8 | Project Conversation Variant B | `eliy-native/docs/design/exports/08-project-conversation-variant-b.png` | Complete, Founder Selected / Frozen |

## 11. Design Source

Figma MCP is unavailable in this Codex environment, so the design source of record is editable SVG.

- SVG source: `eliy-native/docs/design/eliy-chat-ui-wireframe-v1.svg`
- SVG validation: `xmllint --noout eliy-native/docs/design/eliy-chat-ui-wireframe-v1.svg`

## 12. Frozen Design Baseline / Not Implementation-Ready

This baseline is a frozen design recovery artifact only.

- Final design freeze authorized on `2026-07-11`
- TO-BE V1 is now a frozen design baseline
- Implementation authorization remains outstanding
- Not implementation-ready
- Do not treat frozen design token values as implemented product tokens
- Do not use this document to modify product UI source code
- Do not infer behavior not explicitly specified here

## 13. Founder Decision Index

All 25 decisions are Founder confirmed and frozen under the explicit final freeze authorization dated `2026-07-11`.

1. Eliy Purple final value: `#7C3AED`. Founder confirmed / frozen.
2. Sidebar width: `272 px`. Founder confirmed / frozen.
3. Workspace width: `420 px`. Founder confirmed / frozen.
4. Message content max width: `780 px`. Founder confirmed / frozen.
5. Share control in V1: hidden by default. Founder confirmed / frozen.
6. Eliy name frequency for consecutive assistant messages: low-frequency, contextual only. Founder confirmed / frozen.
7. User bubble background and radius: pale purple-gray with `16–18 px` radius. Founder confirmed / frozen.
8. Action Bar format: icon-only with tooltip. Founder confirmed / frozen.
9. Like / Dislike without persistence: retained as design controls. Founder confirmed / frozen.
10. Send button shape: circular brand-purple graphic button. Founder confirmed / frozen.
11. Composer disclaimer wording: `Eliy 可能会出错，请核实重要经营信息。` Founder confirmed / frozen.
12. Attachment menu visibility: show only upload image and upload file. Founder confirmed / frozen.
13. Default section states: all expanded in V1. Founder confirmed / frozen.
14. Search entry mechanism: Dialog / Command Palette style overlay. Founder confirmed / frozen.
15. Rename interaction: Dialog. Founder confirmed / frozen.
16. Delete confirmation: required. Founder confirmed / frozen.
17. Workspace auto-open suppression after manual close: suppress in the current conversation until a new artifact is generated. Founder confirmed / frozen.
18. Workspace close affordance: concise text or icon form, preserving the current design direction. Founder confirmed / frozen.
19. Project conversation mode: Variant B. Variant A is Not Selected / Historical alternative only; Variant B is Founder Selected / Frozen. Founder confirmed / frozen.
20. Pinned conversations in normal list: do not duplicate. Founder confirmed / frozen.
21. New chat inherits project context: yes, from the currently selected project. Founder confirmed / frozen.
22. Keyboard focus behavior for message actions: fully visible on focus. Founder confirmed / frozen.
23. `Eliy 正在思考` in V1: design only when a waiting state is needed. Founder confirmed / frozen.
24. Empty Workspace detail level: one low-weight explanatory line only. Founder confirmed / frozen.
25. Whether to add 1280 × 800 states before Founder freeze: not in this round unless Founder later requests it. Founder confirmed / frozen.
