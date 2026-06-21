# Session Handoff

## Current state

- Repository: `C:\craft_agents`
- Current branch: `main`
- Integrated StockCraft v1 commit: `fcad437`
- Local `main` has not been pushed after the stock-005 integration.
- All features in `feature_list.json`, including `stock-005`, are `passing`.

## Completed product scope

- `stock-001`: single-stock five-step research flow for A-share, Hong Kong, and US symbols.
- `stock-002`: local SQLite persistence for watchlist items, research runs/steps, and reports.
- `stock-003`: standalone Reports Center with filtering, details, session navigation, and Markdown export.
- `stock-004`: standalone Watchlist with groups, search, notes, atomic editing, confirmed removal, and direct research launch.
- `stock-005`: service-side automatic persistence of five research steps and the final report, with visible retry and Agent regeneration recovery.

## Latest verification

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
- Stock-005 focused suite: 73 tests, 0 failures, 517 expectations.
- Registration tests: 4 tests passed when the two files were run in separate Bun processes.
- Shared, server-core, Electron, and headless server typechecks: passed.
- i18n sorted/parity checks: passed; 6 locales and 1488 keys each.
- `feature_list.json` validation and `git diff --check`: passed after the final record update.

## Known issues

- Running `registration.test.ts` and `registration-profiles.test.ts` in the same Bun invocation shares mock registration state and can produce a timeout/cross-profile false negative. Run each file in its own process.
- `bash ./init.sh` enters a broken WSL environment without `/bin/bash`; use `init.ps1` on this machine.

## Next action

1. Push local `main` to `origin/main`.
2. After pushing, StockCraft v1 has no remaining feature-list gap.
