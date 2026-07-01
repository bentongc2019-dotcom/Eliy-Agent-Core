# Eliy Native Manual Terminal Smoke Test

## Purpose

Validate the Eliy Native Runtime Kernel L0/L1 terminal baseline with a repeatable smoke test pack.

## Prerequisites

- Node.js
- corepack
- pnpm through corepack

## Standard Commands

Run from the repository root:

```bash
cd eliy-native
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm proof
corepack pnpm smoke
```

## Success Criteria

- `corepack pnpm typecheck` passes.
- `corepack pnpm test` passes with 16/16 tests.
- `corepack pnpm proof` returns `ok: true`.
- `corepack pnpm smoke` returns `ok: true`.
- `git status --short --untracked-files=all` is clean after generated runtime data cleanup.

## Runtime Data

The proof and smoke commands write local runtime data under `eliy-native/data/`.
Generated workspace data is ignored by `eliy-native/.gitignore` and must not be submitted.

## Boundary

This smoke test pack does not involve deploy, PM2 restart, or production runtime.
