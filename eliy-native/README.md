# Eliy Native Runtime Kernel L0 / L1

Eliy Native is the clean engineering baseline for the HAC-Agent Native Runtime.

Current scope:

- Runtime Kernel L0 / L1
- Terminal-first proof
- CLI-first runtime loop
- Workspace isolation through `data/workspaces/<workspace_id>/`

## Install

This subproject uses `pnpm`.

```bash
cd eliy-native
pnpm install
```

## Test

```bash
cd eliy-native
pnpm test
```

## CLI

```bash
pnpm cli --help
pnpm cli workspace create --name "Demo Workspace" --company "Demo Company"
pnpm cli workspace current
```

## Terminal Runtime Proof

The proof runs entirely through CLI commands and writes to local JSON / JSONL files under `data/workspaces/`.

Proof flow:

1. Create Workspace
2. Create Company
3. Create User / Membership
4. Load Runtime Policy
5. Load HAC-Agent Governance
6. Load HLAMT.md
7. Create Objective
8. Create OTUnit
9. Follow up OTUnit
10. Generate Evidence Candidate
11. Confirm Evidence
12. Create Review
13. Generate Adjust
14. Apply Adjust
15. Close OTUnit
16. Update Objective Achievement
17. Print Audit Log
18. Print RuntimeResult Summary

Run:

```bash
pnpm proof
```

## Data

- `data/workspaces/` contains workspace-isolated runtime files
- `data/workspaces/<workspace_id>/audit/audit.jsonl` contains audit entries

## Phase Scope

L0 / L1:

- schemas
- local file store
- runtime result
- audit log
- state machine
- CLI commands
- tests
- HAC-Agent governance loader
- HLAMT loader
- skill stubs
- terminal runtime proof

Later phases:

- front-end UI
- production auth
- multi-tenant admin
- full Gateway
- full MCP integration
- external integrations
- production deployment
