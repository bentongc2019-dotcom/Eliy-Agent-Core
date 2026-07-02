# Local Real Provider Smoke

## Purpose

This is a manual local smoke guide for verifying one real provider chat run with Eliy Native.

It is not automated CI. It uses the existing provider env config only and does not change chat behavior.

## Preconditions

- `corepack pnpm chat` already works in the local checkout.
- The operator sets provider config locally before running the smoke.
- Provider config values must not be committed.
- No secrets should be pasted into docs, logs, tickets, screenshots, PR body, or chat.

## Existing Provider Env Config

Use only these existing environment variables:

- `ELIY_PROVIDER_BASE_URL`
- `ELIY_PROVIDER_API_KEY`
- `ELIY_PROVIDER_MODEL`

If all three are set in the local shell, the chat loop can use provider mode for the smoke.
If config is incomplete, the chat loop falls back to the deterministic skeleton response.

## Manual Smoke Command

```bash
cd eliy-native

printf 'hello\n/exit\n' | corepack pnpm chat
```

This command uses provider mode only if all three provider env vars are already set in the local shell.
If config is incomplete, it falls back to the deterministic skeleton response.
The evidence must not include actual env values.

Optional pre-check:

```bash
printf 'provider config local precheck: base_url_set=%s api_key_set=%s model_set=%s\n' \
  "${ELIY_PROVIDER_BASE_URL:+yes}" \
  "${ELIY_PROVIDER_API_KEY:+yes}" \
  "${ELIY_PROVIDER_MODEL:+yes}"
```

This pre-check prints only `yes` or `no`. It never prints values.

## Expected Terminal Behavior

- Provider enabled: the chat loop prints the provider response in the terminal.
- Provider disabled or config incomplete: the chat loop prints the deterministic skeleton response.
- `/exit` still exits cleanly.
- Empty input is handled cleanly.

## Safe Evidence Format

```text
Local real provider smoke evidence:

command used:
printf 'hello\n/exit\n' | corepack pnpm chat

provider enabled: Yes/No
response received: Yes/No
secret output: No
package-lock generated: No
git status:
<clean / output copied without secrets>
```

## Secret Handling Rules

Secret output means none of the following appear in the evidence or surrounding logs:

- API key value
- Authorization header value
- provider config value
- `.env` contents
- raw token or bearer credential

Do not paste real keys, real tokens, private endpoints, or account details anywhere in the smoke evidence.

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
corepack pnpm exec tsx src/cli/eliy.ts chat --help
```

## Non-goals

- no provider adapter changes
- no chat loop behavior changes
- no proof or smoke contract changes
- no persistence
- no deploy
- no PM2 restart

## PR Boundary

This guide documents a manual local real provider smoke only.

It does not add automation, real-provider CI, or secret management changes.
