# Session Handoff

## Current state

- Repository: `C:\craft_agents`
- Current branch: `codex/infra-002-instance-isolation`
- `infra-002` complete-instance isolation is implemented and marked `passing`.
- `docs-001` StockCraft README rewrite is implemented and marked `passing`.
- The branch is ahead of `origin/codex/infra-002-instance-isolation` and still needs the user's normal push/integration decision.

## Completed product scope

- `stock-001`: single-stock five-step research flow for A-share, Hong Kong, and US symbols.
- `stock-002`: local SQLite persistence for watchlist items, research runs/steps, and reports.
- `stock-003`: standalone Reports Center with filtering, details, session navigation, and Markdown export.
- `stock-004`: standalone Watchlist with groups, search, notes, atomic editing, confirmed removal, and direct research launch.
- `stock-005`: service-side automatic persistence of five research steps and the final report, with visible retry and Agent regeneration recovery.
- `infra-002`: full runtime and data isolation between StockCraft Dev and an installed Craft Agents instance.
- `docs-001`: Chinese-first GitHub README for StockCraft, including local startup, verified capabilities, architecture, upstream basis, limitations, and investment disclaimer.

## Latest verification

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
- `bun run typecheck:shared`: passed.
- README required-content and removed-upstream-content checks: passed.
- Every package script documented in README exists in `package.json`.
- `feature_list.json` JSON validation, `git diff --check`, and changed-file scope checks: passed after the final record edits.

## Known issues

- The GitHub repository remains named `TradingAgents`, while the product and README are named StockCraft.
- This is a development preview; there is no stable release download or production-readiness claim.
- Running `registration.test.ts` and `registration-profiles.test.ts` in the same Bun invocation shares mock registration state and can produce a timeout/cross-profile false negative. Run each file in its own process.
- `bash ./init.sh` enters a broken WSL environment without `/bin/bash`; use `init.ps1` on this machine.
- Electron's Node 22 `node:sqlite` API still emits an experimental-feature warning.

## Next action

1. Commit the README implementation and persistent workflow records.
2. Push or integrate `codex/infra-002-instance-isolation` when requested.
