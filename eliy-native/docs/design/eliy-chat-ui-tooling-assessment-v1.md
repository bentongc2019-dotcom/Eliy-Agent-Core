# Eliy Chat UI Tooling Assessment V1

Document status: Frozen TO-BE V1 / Founder Approved / Frozen Baseline / Not Implementation-Ready

Time of assessment: `2026-07-11 02:22:06 CST`

## Figma MCP availability

- MCP server name: `none discovered`
- Figma MCP available: `No`
- Figma MCP mode: `unavailable`
- Design canvas used: `Editable SVG`
- Penpot used: `No`
- Third-party tool installed: `No`

### Evidence

- Tool registry inspection returned `mcp__node_repl` and `mcp__sites`
- A targeted search for `figma mcp` did not surface any Figma-specific MCP tool
- No authenticated Figma MCP server was available to the session
- No write-capable Figma design surface existed in this environment

### Tools inspected

- `mcp__node_repl`
- `mcp__sites`

### 判定理由

This session has no writable Figma MCP connection, so Figma cannot be used as the design canvas. Because the user required a strict available / unavailable decision, the correct classification is `Figma MCP unavailable`.

### Authentication / permission block

- Authentication status: no Figma auth path exposed
- Permission block: unavailable by absence of tool, not by a transient user grant

## AS-IS capture

- Preview started: `Yes`
- Viewport: `1440 × 900`
- Browser zoom / device scale: `100% / 1`
- Capture method: local Google Chrome headless screenshot against `http://127.0.0.1:5173/`
- AS-IS capture path: `eliy-native/docs/design/exports/00-as-is-pr93.png`
- AS-IS status: `Comparison only / Not design baseline`

### Result

- Capture completed successfully
- The preview process was stopped after capture
- Port 5173 was then re-checked for residual listeners

## TO-BE design method

Because Figma MCP is unavailable, the design source of record is a single editable SVG:

- `eliy-native/docs/design/eliy-chat-ui-wireframe-v1.svg`

The SVG contains eight independent artboards for the required states. It is the master design artifact, not implementation code.

## PNG export method

- Each required state is exported at `1440 × 900`
- Export uses local Google Chrome headless rendering
- Temporary wrappers may be created in `/tmp` only
- No new npm package was installed
- No third-party renderer was installed
- No repository source file outside `eliy-native/docs/design/` was modified

## SVG validation method

- Validation command: `xmllint --noout eliy-native/docs/design/eliy-chat-ui-wireframe-v1.svg`
- The SVG must remain standard XML and editable
- Text remains SVG text, not rasterized text inside the source

## Not used

- Storybook installed: `No`
- Playwright added: `No`
- Penpot used: `No`
- Dependency / lockfile changed: `No`
- Product UI source changed: `No`
- Runtime / kernel / provider / skills / CLI changed: `No`

## Future implementation-stage tool suggestions

- Keep the frozen SVG/PNG set as the design source of record until implementation work receives separate authorization
- If implementation begins later, use the existing repo toolchain only
- Prefer visual diffing against the exported PNG set before any code change

## Founder decision list

All 25 items are `Founder confirmed / frozen`.

1. Eliy Purple final value: `#7C3AED`. Founder confirmed / frozen.
2. Sidebar width: `272 px`. Founder confirmed / frozen.
3. Workspace width: `420 px`. Founder confirmed / frozen.
4. Message content max width: `780 px`. Founder confirmed / frozen.
5. Share control treatment: hidden by default in V1. Founder confirmed / frozen.
6. Eliy name frequency: low-frequency, contextual only. Founder confirmed / frozen.
7. User bubble styling: pale purple-gray with `16–18 px` radius. Founder confirmed / frozen.
8. Action Bar format: icon-only with Tooltip. Founder confirmed / frozen.
9. Like / Dislike visibility without persistence: retained as design controls. Founder confirmed / frozen.
10. Send button shape: circular brand-purple graphic button. Founder confirmed / frozen.
11. Composer disclaimer text: `Eliy 可能会出错，请核实重要经营信息。` Founder confirmed / frozen.
12. Attachment menu behavior: show upload image and upload file only. Founder confirmed / frozen.
13. Section default states: all expanded in V1. Founder confirmed / frozen.
14. Search surface type: Dialog / Command Palette style overlay. Founder confirmed / frozen.
15. Rename surface: Dialog. Founder confirmed / frozen.
16. Delete confirmation: required. Founder confirmed / frozen.
17. Workspace auto-open suppression: after manual close, suppress in the current conversation until a new artifact is generated. Founder confirmed / frozen.
18. Workspace close affordance: concise text or icon form, preserving the current design direction. Founder confirmed / frozen.
19. Project conversation variant: Variant B selected; Variant A is Not Selected / Historical alternative only. Founder confirmed / frozen.
20. Pinned conversation duplication: do not duplicate in the normal conversation list. Founder confirmed / frozen.
21. Project inheritance on new chat: inherit the currently selected project context. Founder confirmed / frozen.
22. Keyboard focus behavior for message actions: fully visible. Founder confirmed / frozen.
23. `Eliy 正在思考` in V1: only design when a waiting state is needed. Founder confirmed / frozen.
24. Empty Workspace detail level: one low-weight explanatory line only. Founder confirmed / frozen.
25. 1280 × 800 additional design state before freeze: not in this round unless Founder later requests it. Founder confirmed / frozen.
