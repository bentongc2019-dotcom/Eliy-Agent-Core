# Eliy Chat Interaction Spec V1

Document status: Frozen TO-BE V1 / Founder Approved / Frozen Baseline / Not Implementation-Ready

Source baseline: `Eliy Chat UI Design Baseline V1｜Draft V0.1`

This spec defines interaction behavior for the design-only recovery set. It does not change product source code.

## A. Page Shell

- Browser page does not scroll
- All vertical movement is confined to internal scroll regions
- Default shell is `Sidebar + Chat Main`
- `Workspace` appears only on explicit open or when an artifact is generated
- The page should preserve a stable viewport at `1440 × 900`

## B. Sidebar

- `＋ 新对话` starts a new chat
- `搜索` opens a search surface
- `项目`, `已置顶`, and `对话` are collapsible sections
- `设置` stays fixed at the bottom
- All three sections are expanded by default in V1; Founder confirmed / frozen
- Section headers are lightweight and may show collapse chevrons
- `项目` shows project containers, not every conversation inside a project
- `已置顶` shows pinned conversations only
- `对话` shows regular conversations only

## C. Conversation Switching

- Clicking a conversation selects it
- Keyboard focus can move through conversation items
- Selected state is shown through a subtle background or a left brand bar
- The selected item may show `…`
- Project metadata may appear as a low-weight second line or breadcrumb depending on the variant

## D. Conversation Overflow

- `…` appears on hover, keyboard focus, or selected state
- Clicking `…` opens a floating dropdown menu
- The dropdown must be an independent overlay, not an inline expansion
- `Escape` closes the menu
- Clicking outside closes the menu
- Focus returns to the triggering conversation after close
- Actions in the menu:
  - `置顶`
  - `改名`
  - `移至项目`
  - `归档`
  - separator
  - `删除`
- `删除` requires a confirmation dialog
- Menu layout must not change sidebar height or reflow nearby items

## E. Messages

- Eliy replies align left
- User messages align right
- Messages group by contiguous speaker runs
- The content area has a maximum width of `780 px` in TO-BE V1
- Message action affordances appear only on hover or keyboard focus
- Eliy actions shown in V1 design:
  - `复制`
  - `喜欢`
  - `不喜欢`
  - `…`
- User actions shown in V1 design:
  - `复制`
  - `…`
- Tooltip behavior is required for icon-only actions
- Current stage does not promise persistence or a feedback pipeline
- Do not show unavailable actions such as `重新生成`, `分享该回复`, `引用到新对话`, `报告问题`, `编辑`, or `从这里重新开始` in the V1 action set

## F. Composer

- Composer stays fixed to the bottom of the chat area
- Default height is about `52–56 px`
- It can grow to a maximum of `160 px`
- Beyond max height, the textarea scrolls internally
- Enter sends the message
- Shift + Enter inserts a line break
- `＋` opens the attachment menu
- Attachment menu contents in TO-BE V1:
  - `上传图片`
  - `上传文件`
- Empty input is disabled
- The disclaimer is low contrast and single-line
- There is no persistent success notice after send
- There is no permanent `发送成功，Eliy 已回复` style banner

## G. Workspace

- Workspace opens manually from the chat area
- Workspace can also open when Eliy produces the first artifact
- If the user manually closes Workspace, ordinary chat should not reopen it automatically for that chat session unless the user explicitly opens it again or a new artifact is generated
- Workspace contains an independent scroll area
- Workspace content is separate from message bubbles and should not merge into the message stream
- Empty state copy is a single sentence:
  - `这里会显示 Eliy 为你整理出的行动、资料和 O 单。`
- The empty state retains one low-weight explanatory line only; Founder confirmed / frozen

## H. Project Conversation Variant A / Variant B

### Variant A

Decision status: Not Selected / Historical alternative only.

- Sidebar `项目` section selects `增长实验`
- Chat header shows `增长实验 / 渠道增长复盘`
- The `对话` list shows only conversations inside the selected project
- New chats inherit the selected project context
- Project context is expressed primarily in the header breadcrumb

Pros:

- Clear project context
- Less list noise
- Better for long-running project work

Risks:

- Users may not realize the list is filtered
- Switching across projects takes more effort

### Variant B

Decision status: Founder Selected / Frozen.

- Sidebar `项目` section may still show `增长实验`
- The regular `对话` list remains global
- Each project conversation shows a low-weight project label
- Chat header shows `渠道增长复盘` with `增长实验` as metadata
- Project selection only affects new chat creation context, not the global conversation list

Pros:

- Global history remains visible
- Closer to mainstream chat UX
- Lower project switching cost

Risks:

- Project context is weaker
- The list gets noisier as volume grows

Founder decision: Variant B is selected and frozen. The regular conversation list remains global, each project conversation carries a low-weight project label, and project selection primarily affects new-chat context. Variant A is retained only as a historical design alternative.

## I. Accessibility

- Focus order should start from sidebar top actions, then sidebar sections, then chat header actions, then messages, then composer, then workspace
- All icon-only controls need an `aria-label`
- Tooltip text should match the visible action name
- Keyboard users must be able to open, navigate, and close dropdown menus
- Reduced motion should remove non-essential animation while preserving layout transitions
- Color contrast should stay readable for primary and secondary text
- Focus rings use a clear brand-aware outline and should never be hidden by the shell

## Current-stage exclusions

- No permanent empty-state cards for unavailable features
- No fixed Skill navigation
- No implementation promise for message persistence or workspace artifact persistence
- No product code changes are implied by this spec
