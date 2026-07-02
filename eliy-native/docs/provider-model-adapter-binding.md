# Provider / Model Adapter Binding

## Purpose

PR #10 adds a minimal OpenAI-compatible provider path for the Eliy Native interactive chat loop.

`corepack pnpm chat` continues to work without provider config. When provider config is complete, non-empty chat input can call an OpenAI-compatible `/chat/completions` endpoint and print the provider response.

## Provider Config Contract

Provider config is read only at runtime from these environment variables:

- `ELIY_PROVIDER_BASE_URL`
- `ELIY_PROVIDER_API_KEY`
- `ELIY_PROVIDER_MODEL`
- `ELIY_PROVIDER_TIMEOUT_MS`

Provider mode is enabled only when all three values are present and non-empty.

## Provider Disabled Behavior

When provider config is absent or incomplete:

- no provider call happens
- `corepack pnpm chat` still works
- non-empty input returns the deterministic skeleton response
- `/exit`, empty input, and EOF remain stable

Partial config does not crash the loop and does not call the provider.

## Provider Enabled Behavior

When provider config is complete:

- non-empty input calls the configured OpenAI-compatible endpoint
- the terminal prints the provider response as `assistant: <response text>`
- `/exit`, empty input, and EOF remain stable
- no session data, transcript data, or runtime state is written by the chat loop

The provider request timeout defaults to 10 seconds. `ELIY_PROVIDER_TIMEOUT_MS` can override it when set to a valid positive integer in milliseconds. Invalid timeout values fall back to the default. Timeout config is read only at runtime.

## OpenAI-Compatible Request Contract

The chat loop sends:

```http
POST {baseUrl}/chat/completions
Content-Type: application/json
```

The request includes the configured API key in the provider authorization header. The key and header value must not be printed.

Request body:

```json
{
  "model": "<model>",
  "messages": [
    {
      "role": "user",
      "content": "<user input>"
    }
  ]
}
```

The response parser supports:

```json
{
  "choices": [
    {
      "message": {
        "content": "..."
      }
    }
  ]
}
```

## Redaction / Security Contract

- config values are not printed
- API key values are not printed
- request headers are not printed
- provider error output is redacted
- provider requests use a bounded timeout and timeout errors are redacted
- timeout errors use redacted details only
- tests use a local mock HTTP server
- no real API key is required for tests
- no real provider call happens in tests

## Interactive Loop Contract

The interactive loop remains finite and presentation-only:

- `/exit` exits with code 0
- empty input is handled cleanly
- EOF exits cleanly
- non-empty input uses provider mode only when config is complete
- non-empty input falls back to the deterministic skeleton response when config is incomplete
- proof and smoke contracts are preserved

## Non-goals

- no Runtime Kernel core logic changes
- no proof contract changes
- no smoke contract changes
- no persistence
- no session data
- no transcript data
- no runtime state writes
- no deploy
- no PM2 restart

## Verification Commands

```bash
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

Provider-enabled behavior is verified by automated tests with a local mock HTTP server.

## Next PR Boundary

This PR stops at provider/model adapter binding for the existing interactive chat loop.

Future PRs may decide whether to add richer model behavior, conversation state, transcript recording, or runtime persistence. Those are outside PR #10.
