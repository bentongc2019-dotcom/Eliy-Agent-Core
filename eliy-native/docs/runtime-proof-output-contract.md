# Runtime Proof Output Contract

## Purpose

Define the minimal auditable output contract for the Eliy Native Runtime Kernel L0/L1 terminal proof.
The contract gives future changes a stable smoke-test boundary without binding the full presentation output.

## Command Contract

The standard terminal smoke entry is:

```bash
corepack pnpm smoke
```

The smoke script runs the terminal proof through this path:

```bash
tsx src/cli/eliy.ts proof terminal
```

`corepack pnpm proof` uses the same CLI path.

## Success Contract

A successful terminal proof output must express:

- the terminal proof command executed
- the proof target is clear: `proof terminal`
- the proof passed with `ok: true`
- stdout is non-empty
- the process exits with code `0`

The current output is JSON. Tests should prefer stable JSON fields and semantic markers over full text snapshots.

## Output Hygiene Contract

The terminal proof output must not contain:

- secret
- token
- API key
- `.env` source text
- authorization header values
- bearer token values

stderr must not contain unhandled exception, stack trace, or fatal error text during a successful run.

## Stability Boundary

The contract intentionally does not bind:

- `objective.status`
- `otunit.status`
- audit length
- warnings array
- `requires_confirmation`
- full RuntimeResult shape
- full snapshot / golden output
- dynamic IDs
- timestamps
- workspace IDs
- audit IDs
- decorative banner text
- emoji
- whitespace or blank-line layout

Tests should assert the smallest stable semantics needed for auditability.

## Non-goals

This contract does not add Runtime functionality.

This contract does not modify Runtime Kernel core logic, OTUnit behavior, Evidence behavior, Review behavior, Adjust behavior, local store semantics, Skill semantics, HLAMT semantics, or HAC-Agent semantics.

This contract does not involve deploy, PM2 restart, or production runtime.

## Verification Commands

```bash
cd eliy-native
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm proof
corepack pnpm smoke
```
