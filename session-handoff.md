# Session Handoff

## Current state

- Repository: `C:\craft_agents`
- Implementation worktree: `C:\craft_agents\.worktrees\infra-002-instance-isolation-impl`
- Current branch: `codex/infra-002-instance-isolation-impl`
- `infra-002` complete-instance isolation is implemented and marked `passing`.
- The implementation branch still needs final integration into `codex/infra-002-instance-isolation` or another user-selected target.

## Completed product scope

- `stock-001`: single-stock five-step research flow for A-share, Hong Kong, and US symbols.
- `stock-002`: local SQLite persistence for watchlist items, research runs/steps, and reports.
- `stock-003`: standalone Reports Center with filtering, details, session navigation, and Markdown export.
- `stock-004`: standalone Watchlist with groups, search, notes, atomic editing, confirmed removal, and direct research launch.
- `stock-005`: service-side automatic persistence of five research steps and the final report, with visible retry and Agent regeneration recovery.

## Latest verification

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`: passed.
- Infra-002 focused suite: 104 tests, 0 failures across 12 files.
- `lint:instance-paths`: passed.
- Shared, server-core, headless server, session-tools-core, and Electron typechecks: passed.
- Windows main-process build and root main-process build: passed.
- Installed Craft Agents and StockCraft Dev ran concurrently with separate config roots, Electron userData directories, locks, SQLite files, windows, and deep-link schemes.
- `stockcraft-dev://settings/preferences` reached only the development instance; production log and lock remained unchanged.

## Known issues

- Running `registration.test.ts` and `registration-profiles.test.ts` in the same Bun invocation shares mock registration state and can produce a timeout/cross-profile false negative. Run each file in its own process.
- `bash ./init.sh` enters a broken WSL environment without `/bin/bash`; use `init.ps1` on this machine.
- This implementation worktree used `--ignore-scripts`; GUI/package smoke reused the main checkout's Electron 39.2.7 distribution and bundled `uv.exe`.
- Offline unpacked packaging required a one-off CLI override disabling EXE metadata editing because winCodeSign could not be downloaded. The committed builder config keeps normal metadata editing enabled.

## Next action

1. Validate the final record-only commit.
2. Integrate `codex/infra-002-instance-isolation-impl` into the chosen target branch.
