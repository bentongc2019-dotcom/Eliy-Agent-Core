# License Review

Generated: 2026-06-15T11:16:49.204Z

## Scope

Production dependency scan used `package-lock.json` and installed package metadata. Saved LICENSE files under `reports/licenses/`.

## Counts

- Installed package entries: 145
- Production-reachable package entries: 98
- npm audit production vulnerabilities: 0

## Production License Distribution

- MIT: 96
- BSD-3-Clause: 1
- 0BSD: 1

## Suspicious or Unknown

None found in production-reachable installed package metadata.

No GPL, AGPL, SSPL, BUSL, Commons Clause, PolyForm, Elastic License, non-commercial-use restriction, multi-tenant commercial service restriction, source-available-only license, or forced product-branding license string was found in scanned production metadata.

## Assistant Cloud Package Note

`assistant-cloud@0.1.33` is present as a transitive dependency of `@assistant-ui/react`, licensed MIT. This prototype does not import `AssistantCloud`, `useCloudThreadListRuntime`, cloud adapters, or any cloud credential. Its presence as an installed package is recorded, but runtime use is not required by the prototype source.

License conclusion for non-browser evidence: Passed. Browser validation remains environment-blocked.
