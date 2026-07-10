# Eliy Chat Component Mapping V1

Document status: Frozen TO-BE V1 / Founder Approved / Frozen Baseline / Not Implementation-Ready

This document maps Eliy design needs onto likely foundation components. It is a design-only mapping and does not install or import any dependency.

| Eliy component | Preferred foundation | Directly adopted portion | Eliy brand customization | Business customization | Not to rebuild | Implementation timing | Open questions |
|---|---|---|---|---|---|---|---|
| Thread | assistant-ui Thread primitives | Message state, scroll handling, streaming state, latest-message behavior | Wider content column, chat-first spacing, Chinese typography | Workspace-aware header and empty-state coordination | Thread state machine, streaming scroll, message lifecycle | Later implementation phase | Whether assistant-ui Thread primitives fit the existing shell without layout churn |
| Message | assistant-ui Message primitive | Role, parts, status, rendering boundary | Eliy/user alignment, bubble style, copy weight, avatarless replies | Business-specific labels and editorial tone | Message state model, stream parts lifecycle | Later implementation phase | Founder confirmed: consecutive Eliy attribution is low-frequency and contextual only; frozen |
| Composer | assistant-ui Composer primitives | Submit, disabled state, multiline input, keyboard behavior, attachment boundary | Rounded input, purple send icon, disclaimer copy | Upload image/file attachment menu contents | Enter / Shift+Enter behavior, sending state, attachment state machine | Later implementation phase | Whether Composer owns send-state animation or only state display |
| Action Bar | assistant-ui Action Bar | Hover/focus lifecycle, action slots | Icon set, tooltip text, brand color accents | Like/dislike business semantics | Hover/focus lifecycle, tooltip accessibility, action reveal timing | Later implementation phase | Founder confirmed: icon-only with Tooltip; frozen |
| Sidebar | shadcn/ui Sidebar | Fixed top, scroll middle, fixed bottom structure | Brand block, section order, conversation density | Project / pinned / conversation taxonomy | Sidebar shell mechanics and responsive fixed regions | Later implementation phase | Whether a standard Sidebar shell needs custom collapse animation |
| Collapsible | shadcn/ui Collapsible | Expand/collapse behavior and disclosure semantics | Lightweight section headers and chevrons | `项目`, `已置顶`, `对话` section treatment | Keyboard expand logic, disclosure state management | Later implementation phase | Founder confirmed: all sections expanded by default in V1; frozen |
| Scroll Area | shadcn/ui Scroll Area | Scroll container behavior, keyboard scroll, scrollbar affordance | Narrow gutters, subtle scrollbars, fixed-region separation | Sidebar middle, message list, workspace content | Scrollbar and keyboard behavior reimplementation | Later implementation phase | Whether custom scrollbar styling is enough or if native scroll is preferred |
| Dropdown Menu | shadcn/ui Dropdown Menu | Escape handling, outside click, focus return, menu positioning | Conversation overflow menu, attachment menu, item spacing | Pin / rename / move / archive / delete actions | Focus trap, outside click, focus return, menu lifecycle | Later implementation phase | Founder confirmed: delete requires a confirmation Dialog; frozen |
| Tooltip | shadcn/ui Tooltip | Delay, hover/focus behavior, accessible naming for icons | Brand-aware hover labels for icon-only actions | Message actions, attachment icons, workspace close affordance | Tooltip delay and focus behavior | Later implementation phase | Founder confirmed: icon actions expose Tooltip labels and the complete action set remains visible on keyboard focus; frozen |
| Dialog | shadcn/ui Dialog | Modal focus management, escape handling, backdrop | Rename dialog, delete confirmation dialog, search surface if modal | Business naming and confirm copy | Modal focus management, backdrop, escape handling | Later implementation phase | Founder confirmed: search uses a Dialog / Command Palette style overlay; rename uses Dialog; frozen |
| Workspace Panel | Eliy custom business panel | Desktop fixed 420 px panel, dedicated header, independent scroll | No outer card, single divider, empty-state treatment, brand spacing | First artifact auto-open, manual close suppression, business content structure | Mobile sheet behavior in this round | Later implementation phase | Founder confirmed: empty state is one low-weight explanatory line; frozen |

## Mapping rules

### 1. Directly adopt assistant-ui

- Thread primitives
- Message primitive
- Composer primitives
- Action Bar

The direct adoption boundary is the state and interaction engine, not the visual shell.

### 2. Directly adopt shadcn/ui

- Sidebar
- Collapsible
- Scroll Area
- Dropdown Menu
- Tooltip
- Dialog

These primitives are preferred for interaction correctness and accessibility.

### 3. Eliy brand customization

- Purple brand accent
- Chat-first geometry
- Sidebar section ordering
- Chinese content rhythm
- Business vocabulary
- Workspace width and content cadence

### 4. Do not rebuild in this task

- Message state machine
- Streaming scroll behavior
- Message lifecycle model
- Enter / Shift+Enter composer behavior
- Hover/focus reveal lifecycle
- Dropdown focus management
- Dialog focus management

## Implementation timing

This task only defines the mapping.

- No assistant-ui installation
- No shadcn/ui installation
- No dependency changes
- No implementation code
- No product UI source edits
