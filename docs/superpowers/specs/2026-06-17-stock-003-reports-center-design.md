# StockCraft Reports Center Design

## Goal

Implement the first standalone StockCraft Reports center. Users can browse saved stock research reports, filter the report list, open full report details, jump back to the linked Craft session, and export a complete Markdown copy.

## Scope

This design covers `stock-003` only. It depends on the SQLite storage and RPC work from `stock-002`, especially `listStockResearchReports` and `getStockResearchReport`.

In scope:

- Add a first-class Reports entry to the app navigation.
- Add a Reports page with a searchable/filterable report list and a detail panel.
- Load report lists and details through the existing ElectronAPI/RPC boundary.
- Export a selected report as Markdown from renderer-side data.
- Navigate from a report detail back to its associated Craft session.
- Cover empty, loading, and failure states.

Out of scope:

- New report-generation automation.
- New SQLite schema or server-side report filtering.
- Watchlist UI.
- Cloud sync or cross-device report sharing.
- Investment recommendation logic beyond displaying stored report fields.

## Recommended Approach

Use a standalone Reports page and reuse the storage RPCs already introduced by `stock-002`.

The first version keeps filtering in the renderer. `listStockResearchReports` returns the saved report list, and the Reports page filters by text and risk level in memory. This avoids widening the backend contract before the report volume proves it is necessary. If report counts later become large, the same UI can move filtering into RPC parameters without changing the page concept.

## User Experience

The page follows the approved three-part layout:

- Left navigation: a `Reports` entry appears alongside existing workspace navigation and opens the Reports page.
- Report list: a dense list with search, risk filter, symbol, market, risk level, summary, and created time.
- Report detail: full report content with `Open Session` and `Export MD` actions.

The page is a work surface, not a landing page. It should match the existing Craft Agents density and panel style, use existing tokens, and avoid decorative hero treatment.

## Architecture

Add a renderer-side `stock-reports` module:

- `ReportsPage.tsx`: owns loading state, selected report state, filters, and detail rendering.
- `report-filtering.ts`: pure helpers for text/risk filtering and default sorting.
- `report-export.ts`: pure helper that formats a `StockResearchReport` into Markdown.
- Tests beside the module.

The page should call:

- `window.electronAPI.listStockResearchReports()` for the list.
- `window.electronAPI.getStockResearchReport(reportId)` for detail.

Renderer code must not access SQLite or `server-core` directly.

Navigation should use the existing route/navigation patterns. The implementation plan should inspect `routes.ts`, `route-parser.ts`, `NavigationContext`, `MainContentPanel`, and sidebar navigation rendering to choose the smallest consistent route addition.

## Data Flow

Initial load:

1. Reports page mounts.
2. It calls `listStockResearchReports`.
3. Reports are sorted by `createdAt` descending.
4. Local filters derive the visible list.
5. If reports exist, the page may select the first report by default; if no report exists, it shows the empty state.

Selecting a report:

1. User selects an item in the list.
2. Page calls `getStockResearchReport(report.id)`.
3. The detail panel renders title, symbol, market, rating, risk level, summary, full Markdown content, created time, and disclaimer area.

Open Session:

1. The report detail exposes the linked `sessionId`.
2. Clicking `Open Session` navigates to the existing session route for that session.
3. If the report shape does not yet include `sessionId`, the implementation should add it to the existing report DTO mapping from the already-joined `research_runs` row instead of adding a new endpoint.

Export Markdown:

1. `formatStockReportMarkdown(report)` builds a complete Markdown document.
2. The document includes title, stock information, rating, risk level, summary, report body, and a research-only disclaimer.
3. The UI triggers the existing browser/download style if available. If no project helper fits, the implementation can create a narrowly scoped renderer utility for downloading a Markdown blob.

## Error Handling

Reports list states:

- Loading: show a lightweight loading state in the report list area.
- Empty: show a calm empty state with a path back to Stock Research.
- Failure: show the error and a retry button.

Report detail states:

- Not selected: ask the user to select a report.
- Loading: keep the list usable and show detail loading only in the detail panel.
- Missing/deleted report: show that the report no longer exists or was removed.
- Failure: show a detail-level retry button.

Actions:

- Export failure should show a toast or inline error without mutating report data.
- Open Session should show a clear unavailable-session message if `sessionId` is missing or navigation cannot resolve.

## Testing Strategy

Use TDD for implementation.

Pure helpers:

- `report-filtering.test.ts` verifies search by symbol, title, and summary.
- It verifies risk-level filtering.
- It verifies newest-first sorting.
- `report-export.test.ts` verifies Markdown contains title, stock information, rating, risk level, summary, content, and disclaimer.

Renderer page:

- Page test verifies list loading and rendering.
- Page test verifies empty state.
- Page test verifies list failure retry state.
- Page test verifies selecting a report loads and displays details.
- Page test verifies detail failure state.
- Page test verifies `Open Session` invokes navigation to the associated session.
- Page test verifies `Export MD` calls the export helper with the selected report.

Integration surface:

- If navigation route/channel surface changes, update existing route, navigation, or IPC stability tests.
- Existing `stock-002` RPC/storage tests remain the backend safety net.

Final verification should include:

- Focused stock reports tests.
- Existing stock storage/RPC tests affected by DTO additions.
- Relevant route/navigation tests.
- `bun run typecheck:shared`.
- `cd apps/electron && bun run typecheck`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`.
- `python -m json.tool feature_list.json`.
- `git diff --check`.

## Risks And Decisions

- This branch is based on `codex/stock-002-sqlite-storage` until PR #2 lands, because `stock-003` needs the stock storage RPCs.
- Renderer-local filtering is intentionally chosen for v1. It is simpler and keeps the storage contract stable.
- The report DTO may need `sessionId` for `Open Session`. That should be added to the existing report record shape if absent.
- Export is a local convenience feature. It does not create a new persistent report record.
- Every exported report must include research-only, not-investment-advice language.
