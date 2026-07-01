# Terminal Chat Command Skeleton

## Purpose

PR #8 establishes the Eliy Native terminal chat command skeleton. It creates a stable command entry and presentation contract only.

This PR does not implement real terminal conversation capability.

## Command Contract

The standard terminal chat entry is:

```bash
corepack pnpm chat
```

The script runs this CLI path:

```bash
tsx src/cli/eliy.ts chat
```

PR #8 does not change the terminal smoke entry. `corepack pnpm smoke` still runs:

```bash
tsx src/cli/eliy.ts proof terminal
```

## No-Args Contract

`tsx src/cli/eliy.ts chat` must:

- exit with code `0`
- write non-empty stdout
- state that the terminal chat command skeleton is installed
- state that the interactive loop is not enabled
- state that the provider/model adapter is not enabled
- not wait for stdin
- not call a model
- not read API keys or secrets
- not write session, transcript, or runtime state

## Help Contract

`corepack pnpm exec tsx src/cli/eliy.ts chat --help` must:

- exit with code `0`
- write non-empty stdout
- include usage text
- describe the current command as the terminal chat command skeleton
- state that the interactive loop is not enabled in this PR
- state that the provider adapter is not enabled in this PR

## Output Contract

The no-args command uses stable JSON output:

```json
{
  "ok": true,
  "command": "chat",
  "mode": "terminal_chat_skeleton",
  "interactive_loop_enabled": false,
  "provider_adapter_enabled": false,
  "message": "Eliy Native terminal chat command skeleton is installed. Interactive loop is not enabled and provider/model adapter is not enabled in this PR."
}
```

Tests should assert stable semantic fields and markers, not the full JSON snapshot.

The output must not include dynamic IDs, timestamps, environment variables, paths, or credential material.

## Non-goals

PR #8 does not:

- implement an interactive loop
- read stdin for a continuous conversation
- connect a provider/model adapter
- read environment variables or secrets
- write session, transcript, or runtime state
- modify Runtime Kernel core logic
- deploy
- restart PM2
- generate package-lock.json
- merge before review

## Verification Commands

```bash
cd eliy-native
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm proof
corepack pnpm smoke
corepack pnpm chat
corepack pnpm exec tsx src/cli/eliy.ts chat --help
```

## Next PR Boundary

Real terminal conversation capability is left for a later PR.
