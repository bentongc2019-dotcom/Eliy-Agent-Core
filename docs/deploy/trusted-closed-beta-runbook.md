# Eliy Beta 2.0 Trusted Small Closed Beta Deploy Runbook

## Scope

This runbook applies only to `trusted small closed beta deploy`.

It does not describe:

- formal product closed beta deploy;
- production SaaS;
- enterprise deployment;
- formal cloud DB baseline;
- admin / RBAC / billing;
- O 单 / O’PDCA / S’FOCUS runtime.

The current baseline is:

`This P0 foundation baseline is based on file-backed local store. It is not a formal cloud database production baseline.`

## Deployment types

### Local / internal smoke

- `HOST=127.0.0.1`
- `ELIY_COOKIE_SECURE=false`
- `ELIY_COOKIE_SAMESITE=Lax`
- Node server may listen directly on localhost
- Intended for developer validation only

### Trusted small closed beta

- `HOST=127.0.0.1` or an internal bind address
- Node server should stay private
- Expose only HTTPS through Nginx / Caddy / platform proxy
- `ELIY_COOKIE_SECURE=true`
- `ELIY_COOKIE_SAMESITE=Lax`
- `ELIY_PUBLIC_BASE_URL=https://<trusted-beta-domain>`
- Limited trusted users only
- Manual backup / cleanup required

### Future production

- process manager / health checks
- managed backups
- formal cloud DB
- observability and retention policy
- production deploy pipeline

## Environment variables

### Required for trusted beta

- `PORT`
- `HOST`
- `ELIY_PUBLIC_BASE_URL`
- `ELIY_COOKIE_SECURE`
- `ELIY_COOKIE_SAMESITE`
- `ELIY_SESSION_TTL_MS`
- `ELIY_ALLOWLIST`
- `ELIY_INVITE_CODES`
- `ELIY_RUNTIME_DATA_DIR` or explicit per-path overrides
- `ELIY_ACCOUNT_STORAGE_DIR`

### Runtime path overrides

- `ELIY_RUNTIME_DATA_DIR=/var/lib/eliy-beta2/runtime`
- `ELIY_ACCOUNT_STORAGE_DIR=/var/lib/eliy-beta2/account-store`
- `ELIY_TRANSCRIPTS_DIR=/var/lib/eliy-beta2/runtime/transcripts`
- `ELIY_MEMORY_DIR=/var/lib/eliy-beta2/runtime/memory`
- `ELIY_REPORTS_DIR=/var/lib/eliy-beta2/runtime/reports`
- `ELIY_STATE_DIR=/var/lib/eliy-beta2/runtime/state`
- `ELIY_EVIDENCE_DIR=/var/lib/eliy-beta2/runtime/hlamt`

### Cookie rules

- `ELIY_COOKIE_SECURE=true` is required for trusted beta HTTPS
- `ELIY_COOKIE_SAMESITE=Lax` is the default
- `ELIY_COOKIE_SAMESITE=None` must be paired with `ELIY_COOKIE_SECURE=true`
- session cookie remains `HttpOnly`

## Server binding

- Local smoke may listen on `127.0.0.1`
- Trusted beta should keep Node private and expose HTTPS through a reverse proxy
- Do not expose raw Node HTTP directly to the internet
- The server startup log should show host, port, public base URL, cookie mode, and runtime data location

## Allowlist and invite

- `ELIY_ALLOWLIST` is a comma-separated list of email addresses
- `ELIY_INVITE_CODES` is a comma-separated list of invite codes
- Trusted beta should use env / secret injection, not an admin UI
- Prefer one code per user or a very small shared group code
- Rotate invite codes by updating env / secret and restarting the service

## Runtime data and cleanup

### Paths to keep out of the repository tree

- account store
- transcripts
- memory
- reports
- state
- evidence

### Backup

- Back up `ELIY_ACCOUNT_STORAGE_DIR` before deploy
- Back up runtime data before and after deploy windows if you need audit history

### Cleanup

- Remove stale runtime transcripts, reports, and state files on a regular schedule
- Keep temp smoke artifacts outside the repository tree

## Rollback reference

- current main: `24bbca915f9d1ed3e59d39d1e65e2f7217117aa0`
- pre-merge main: `d37a645b56e6bd61ea44c8eadb32d78e648a0915`
- baseline tag: `eliy-beta2-p0-foundation-baseline-20260619`
- source baseline commit: `70bc88f018568b2e458312dc17107f99fb037705`

### Rollback notes

- code rollback and data rollback are separate
- file-backed store rollback can overwrite newer data
- keep a backup before any trusted beta deployment

## Deploy smoke checklist

Run in the experiments package:

```bash
cd /Users/rich1350/Documents/Eliy-Agent-Core/experiments/openai-agents-ts-runtime

npm run typecheck
npm run build
npm run test:eliy-beta2-gate2-ui-adapter-minimum
npm run test:eliy-beta2-account-storage-minimum
npm run test:hac-agent-c1-gate2-minimum-integration
npm run test:trusted-deploy-p0-config
```

Run the repository-level checks:

```bash
cd /Users/rich1350/Documents/Eliy-Agent-Core
git diff --check
git status --short --untracked-files=all
```

Run the browser smoke manually:

- login
- `/api/auth/me`
- conversation list
- send message
- message history
- trace chip
- logout
- session expired
- user isolation spot check

## No-go conditions

Do not authorize trusted beta deploy if any of the following are true:

- main HEAD is wrong
- worktree is not clean
- smoke fails
- Node is exposed directly without TLS termination
- cookie secure mode is incompatible with the access path
- runtime data still writes into the repository tree in deploy mode
- rollback references are missing
- allowlist / invite injection is not controllable via env or secrets
