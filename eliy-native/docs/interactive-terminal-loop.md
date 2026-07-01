# Interactive Terminal Loop

## Purpose

This document defines the finite interactive terminal loop for `corepack pnpm chat`.

The loop is deterministic and provider-free. It reads finite stdin, handles basic terminal input, and returns stable skeleton responses without persistence.

## Command Contract

The standard entry is:

```bash
corepack pnpm chat
```

The script runs this CLI path:

```bash
tsx src/cli/eliy.ts chat
```

The proof and smoke entries remain:

```bash
tsx src/cli/eliy.ts proof terminal
```

## Interactive Loop Contract

`corepack pnpm chat` must:

- start a finite interactive terminal loop
- print a clear startup message
- read stdin line by line
- trim input for command handling
- return a deterministic skeleton response for non-empty input
- keep provider/model adapter behavior disabled
- avoid model calls
- avoid session, transcript, or runtime state persistence
- exit cleanly on `/exit`
- exit cleanly on EOF

## Input Handling

Input is handled as line-based terminal text:

- `/exit` exits with code `0`
- empty input is acknowledged cleanly
- non-empty input returns a deterministic skeleton response containing the input text
- input handling does not use timestamps, random IDs, local paths, environment values, or credential material

## Exit Contract

The loop exits with code `0` when:

- stdin contains `/exit`
- stdin reaches EOF

The loop prints a stable exit message before returning.

## Output Contract

Output is stable terminal text. A finite run can look like:

```text
Eliy Native chat loop started. Type /exit to quit.
> assistant: skeleton response received: hello
assistant: provider/model adapter not enabled; deterministic skeleton response only; no persistence.
> Eliy Native chat loop exited.
```

Tests should assert stable semantic markers, not a full golden output.

## Non-goals

This loop does not:

- add a provider/model adapter
- call a model
- read environment variables or credential material for provider/model behavior
- write session data
- write transcript data
- write runtime state
- modify Runtime Kernel core logic
- change proof or smoke contracts
- deploy
- restart runtime processes

## Verification Commands

```bash
cd eliy-native
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm proof
corepack pnpm smoke
printf '/exit\n' | corepack pnpm chat
printf 'hello\n/exit\n' | corepack pnpm chat
printf '\n/exit\n' | corepack pnpm chat
corepack pnpm exec tsx src/cli/eliy.ts chat --help
```

## Next PR Boundary

Future work must be scoped separately. This loop remains deterministic, provider-free, and persistence-free.
