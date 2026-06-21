# Session Handoff

## Current state

- Repository: `C:\craft_agents`
- Current branch: `codex/stock-005-auto-persistence`
- Base branch: `main` at `c650775`
- `stock-005` is the only `in_progress` feature.

## Completed product scope

- `stock-001`: single-stock five-step research flow for A-share, Hong Kong, and US symbols.
- `stock-002`: local SQLite persistence for watchlist items, research runs/steps, and reports.
- `stock-003`: standalone Reports Center with filtering, details, session navigation, and Markdown export.
- `stock-004`: standalone Watchlist with groups, search, notes, atomic editing, confirmed removal, and direct research launch.

## Latest verification

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
- StockCraft focused suite: 94 tests, 0 failures, 546 expectations.
- Registration tests: 4 tests passed when the two files were run in separate Bun processes.
- Shared, server-core, and Electron typechecks: passed.
- i18n sorted/parity checks: passed; 6 locales and 1484 keys each.
- `feature_list.json` validation and `git diff --check`: passed after the final record update.

## Known issues

- Running `registration.test.ts` and `registration-profiles.test.ts` in the same Bun invocation shares mock registration state and can produce a timeout/cross-profile false negative. Run each file in its own process.
- `bash ./init.sh` enters a broken WSL environment without `/bin/bash`; use `init.ps1` on this machine.

## Next action

1. User reviews `docs/superpowers/specs/2026-06-21-stock-005-auto-persistence-design.md`.
2. After approval, write the TDD implementation plan.
3. Execute the plan one task at a time and keep `stock-005` `in_progress` until final verification.
