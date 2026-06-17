# StockCraft Reports Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone StockCraft Reports page where users can browse saved reports, filter them, open details, jump back to the linked Craft session, and export Markdown.

**Architecture:** Reuse the `stock-002` storage/RPC boundary and keep new behavior mostly in the renderer. Add `sessionId` to the existing report DTO, create focused renderer helpers for filtering/export/actions, add a `reports` route/navigation state, and render `ReportsPage` from the main content panel.

**Tech Stack:** Bun tests, TypeScript, React 18, Electron renderer, existing RPC/ElectronAPI channel map, `bun:sqlite` storage via `StockStorageService`.

---

## File Structure

- Modify `packages/shared/src/stock/types.ts`: add `sessionId` to `StockResearchReport`.
- Modify `packages/server-core/src/stock/stock-storage.ts`: include `research_runs.session_id` in report rows.
- Modify `packages/server-core/src/stock/stock-storage.test.ts`: assert reports expose `sessionId`.
- Create `apps/electron/src/renderer/stock-reports/report-filtering.ts`: local filtering and sorting helpers.
- Create `apps/electron/src/renderer/stock-reports/report-export.ts`: Markdown formatting and download filename helpers.
- Create `apps/electron/src/renderer/stock-reports/report-actions.ts`: action helpers for open-session and export.
- Create tests under `apps/electron/src/renderer/stock-reports/__tests__/`.
- Modify `apps/electron/src/shared/routes.ts`: add `routes.view.reports()`.
- Modify `apps/electron/src/shared/types.ts`: add `ReportsNavigationState` and `isReportsNavigation`.
- Modify `apps/electron/src/shared/route-parser.ts`: parse/build `reports`.
- Create `apps/electron/src/shared/__tests__/route-parser-reports.test.ts`.
- Create `apps/electron/src/renderer/pages/ReportsPage.tsx`: standalone Reports center UI.
- Modify `apps/electron/src/renderer/pages/index.ts`: export `ReportsPage`.
- Modify `apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx`: render `ReportsPage`.
- Modify `apps/electron/src/renderer/components/app-shell/AppShell.tsx`: add left navigation item and list title handling.
- Modify `apps/electron/src/renderer/contexts/NavigationContext.tsx`: re-export `isReportsNavigation`.
- Modify `packages/shared/src/i18n/locales/en.json` and `zh-Hans.json`: add visible labels.
- Modify `claude-progress.md` and `feature_list.json` at the end after verification.

## Task 1: Add `sessionId` To Report DTO

**Files:**
- Modify: `packages/shared/src/stock/types.ts`
- Modify: `packages/server-core/src/stock/stock-storage.ts`
- Test: `packages/server-core/src/stock/stock-storage.test.ts`

- [ ] **Step 1: Write the failing storage/DTO test**

Update the existing `creates research runs with five pending steps and stores reports` test in `packages/server-core/src/stock/stock-storage.test.ts` so both list and detail assertions expect `sessionId`.

```ts
    expect(service.listResearchReports()).toMatchObject([
      {
        id: report.id,
        runId: run.id,
        sessionId: 'session-1',
        title: 'AAPL Research Report',
        symbol: { displaySymbol: 'AAPL' },
      },
    ])
    expect(service.getResearchReport(report.id)).toMatchObject({
      sessionId: 'session-1',
      contentMarkdown: expect.stringContaining('Not investment advice'),
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts
```

Expected: FAIL because `StockResearchReport` objects do not yet include `sessionId`.

- [ ] **Step 3: Add `sessionId` to shared report type**

In `packages/shared/src/stock/types.ts`, change `StockResearchReport` to:

```ts
export interface StockResearchReport {
  id: string
  runId: string
  sessionId: string
  title: string
  symbol: ParsedStockSymbol
  rating: string | null
  riskLevel: string | null
  summary: string
  contentMarkdown: string
  createdAt: number
  updatedAt: number
}
```

- [ ] **Step 4: Include `sessionId` in storage rows and mapping**

In `packages/server-core/src/stock/stock-storage.ts`, update `ResearchReportRow`:

```ts
interface ResearchReportRow extends SymbolRow {
  report_id: string
  run_id: string
  session_id: string
  title: string
  rating: string | null
  risk_level: string | null
  summary: string
  content_markdown: string
  report_created_at: number
  report_updated_at: number
}
```

Update `RESEARCH_REPORT_SELECT_SQL` to select the session id:

```sql
    research_reports.id AS report_id,
    research_reports.run_id,
    research_runs.session_id,
    research_reports.title,
```

Update `mapResearchReportRow`:

```ts
function mapResearchReportRow(row: ResearchReportRow): StockResearchReport {
  return {
    id: row.report_id,
    runId: row.run_id,
    sessionId: row.session_id,
    title: row.title,
    symbol: mapSymbolRow(row),
    rating: row.rating,
    riskLevel: row.risk_level,
    summary: row.summary,
    contentMarkdown: row.content_markdown,
    createdAt: row.report_created_at,
    updatedAt: row.report_updated_at,
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```powershell
git add packages/shared/src/stock/types.ts packages/server-core/src/stock/stock-storage.ts packages/server-core/src/stock/stock-storage.test.ts
git commit -m "Expose report session id"
```

## Task 2: Add Report Filtering And Export Helpers

**Files:**
- Create: `apps/electron/src/renderer/stock-reports/report-filtering.ts`
- Create: `apps/electron/src/renderer/stock-reports/report-export.ts`
- Test: `apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts`
- Test: `apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts`

- [ ] **Step 1: Write filtering tests**

Create `apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { filterStockReports, sortStockReportsNewestFirst } from '../report-filtering'

function report(overrides: Partial<StockResearchReport>): StockResearchReport {
  return {
    id: 'report-1',
    runId: 'run-1',
    sessionId: 'session-1',
    title: 'AAPL Research Report',
    symbol: {
      input: 'AAPL',
      symbol: 'AAPL',
      market: 'US',
      exchange: 'US',
      displaySymbol: 'AAPL',
      currency: 'USD',
    },
    rating: 'Hold',
    riskLevel: 'Moderate',
    summary: 'Ecosystem strength with valuation risk.',
    contentMarkdown: '# AAPL',
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  }
}

describe('filterStockReports', () => {
  test('matches query against symbol, title, and summary', () => {
    const reports = [
      report({ id: 'a', title: 'Apple deep dive', symbol: { ...report({}).symbol, displaySymbol: 'AAPL', symbol: 'AAPL' } }),
      report({ id: 'b', title: 'Tencent report', symbol: { input: '00700.HK', symbol: '00700', market: 'HK', exchange: 'HK', displaySymbol: '00700.HK', currency: 'HKD' }, summary: 'Gaming and ads.' }),
      report({ id: 'c', title: 'Maotai report', symbol: { input: '600519', symbol: '600519', market: 'CN', exchange: 'SH', displaySymbol: '600519.SH', currency: 'CNY' }, summary: 'Premium baijiu moat.' }),
    ]

    expect(filterStockReports(reports, { query: 'aapl', riskLevel: 'all' }).map(r => r.id)).toEqual(['a'])
    expect(filterStockReports(reports, { query: 'gaming', riskLevel: 'all' }).map(r => r.id)).toEqual(['b'])
    expect(filterStockReports(reports, { query: 'maotai', riskLevel: 'all' }).map(r => r.id)).toEqual(['c'])
  })

  test('filters by risk level when selected', () => {
    const reports = [
      report({ id: 'low', riskLevel: 'Low' }),
      report({ id: 'high', riskLevel: 'High' }),
      report({ id: 'none', riskLevel: null }),
    ]

    expect(filterStockReports(reports, { query: '', riskLevel: 'high' }).map(r => r.id)).toEqual(['high'])
    expect(filterStockReports(reports, { query: '', riskLevel: 'all' }).map(r => r.id)).toEqual(['low', 'high', 'none'])
  })
})

describe('sortStockReportsNewestFirst', () => {
  test('sorts by createdAt descending without mutating input', () => {
    const reports = [
      report({ id: 'old', createdAt: 100 }),
      report({ id: 'new', createdAt: 300 }),
      report({ id: 'mid', createdAt: 200 }),
    ]

    expect(sortStockReportsNewestFirst(reports).map(r => r.id)).toEqual(['new', 'mid', 'old'])
    expect(reports.map(r => r.id)).toEqual(['old', 'new', 'mid'])
  })
})
```

- [ ] **Step 2: Write export tests**

Create `apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { buildStockReportFilename, formatStockReportMarkdown } from '../report-export'

const report: StockResearchReport = {
  id: 'report-1',
  runId: 'run-1',
  sessionId: 'session-1',
  title: 'AAPL Research Report',
  symbol: {
    input: 'AAPL',
    symbol: 'AAPL',
    market: 'US',
    exchange: 'US',
    displaySymbol: 'AAPL',
    currency: 'USD',
  },
  rating: 'Hold',
  riskLevel: 'Moderate',
  summary: 'Quality business with valuation risk.',
  contentMarkdown: '## Core thesis\n\nServices and ecosystem remain strong.',
  createdAt: Date.UTC(2026, 5, 17),
  updatedAt: Date.UTC(2026, 5, 17),
}

describe('formatStockReportMarkdown', () => {
  test('includes complete report metadata, content, and disclaimer', () => {
    const markdown = formatStockReportMarkdown(report)

    expect(markdown).toContain('# AAPL Research Report')
    expect(markdown).toContain('- Symbol: AAPL')
    expect(markdown).toContain('- Market: US')
    expect(markdown).toContain('- Rating: Hold')
    expect(markdown).toContain('- Risk level: Moderate')
    expect(markdown).toContain('Quality business with valuation risk.')
    expect(markdown).toContain('## Core thesis')
    expect(markdown).toContain('For research only. Not investment advice.')
  })
})

describe('buildStockReportFilename', () => {
  test('uses symbol and title in a filesystem-friendly markdown filename', () => {
    expect(buildStockReportFilename(report)).toBe('AAPL-aapl-research-report.md')
  })
})
```

- [ ] **Step 3: Run helper tests to verify they fail**

Run:

```powershell
bun test apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts
```

Expected: FAIL because `report-filtering.ts` and `report-export.ts` do not exist.

- [ ] **Step 4: Implement filtering helper**

Create `apps/electron/src/renderer/stock-reports/report-filtering.ts`:

```ts
import type { StockResearchReport } from '@craft-agent/shared/stock'

export type StockReportRiskFilter = 'all' | string

export interface StockReportFilters {
  query: string
  riskLevel: StockReportRiskFilter
}

export function sortStockReportsNewestFirst(reports: StockResearchReport[]): StockResearchReport[] {
  return [...reports].sort((left, right) => right.createdAt - left.createdAt)
}

export function filterStockReports(
  reports: StockResearchReport[],
  filters: StockReportFilters,
): StockResearchReport[] {
  const query = filters.query.trim().toLowerCase()
  const riskLevel = filters.riskLevel.trim().toLowerCase()

  return reports.filter((report) => {
    const matchesQuery = query.length === 0 || [
      report.title,
      report.summary,
      report.symbol.symbol,
      report.symbol.displaySymbol,
      report.symbol.market,
    ].some((value) => value.toLowerCase().includes(query))

    const matchesRisk = riskLevel === 'all'
      || (report.riskLevel ?? '').trim().toLowerCase() === riskLevel

    return matchesQuery && matchesRisk
  })
}
```

- [ ] **Step 5: Implement export helper**

Create `apps/electron/src/renderer/stock-reports/report-export.ts`:

```ts
import type { StockResearchReport } from '@craft-agent/shared/stock'

const DISCLAIMER = 'For research only. Not investment advice.'

export function formatStockReportMarkdown(report: StockResearchReport): string {
  const metadata = [
    `- Symbol: ${report.symbol.displaySymbol}`,
    `- Market: ${report.symbol.market}`,
    `- Currency: ${report.symbol.currency}`,
    `- Rating: ${report.rating ?? 'Unrated'}`,
    `- Risk level: ${report.riskLevel ?? 'Unspecified'}`,
    `- Created: ${new Date(report.createdAt).toISOString()}`,
  ].join('\n')

  return [
    `# ${report.title}`,
    '',
    '## Stock',
    '',
    metadata,
    '',
    '## Summary',
    '',
    report.summary,
    '',
    report.contentMarkdown.trim(),
    '',
    '## Disclaimer',
    '',
    DISCLAIMER,
    '',
  ].join('\n')
}

export function buildStockReportFilename(report: StockResearchReport): string {
  const titleSlug = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  const symbolSlug = report.symbol.displaySymbol
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${symbolSlug}-${titleSlug || 'report'}.md`
}
```

- [ ] **Step 6: Run helper tests to verify they pass**

Run:

```powershell
bun test apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/electron/src/renderer/stock-reports
git commit -m "Add stock report helpers"
```

## Task 3: Add Reports Route And Navigation State

**Files:**
- Modify: `apps/electron/src/shared/routes.ts`
- Modify: `apps/electron/src/shared/types.ts`
- Modify: `apps/electron/src/shared/route-parser.ts`
- Modify: `apps/electron/src/renderer/contexts/NavigationContext.tsx`
- Test: `apps/electron/src/shared/__tests__/route-parser-reports.test.ts`

- [ ] **Step 1: Write reports route parser tests**

Create `apps/electron/src/shared/__tests__/route-parser-reports.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { buildCompoundRoute, buildRouteFromNavigationState, parseCompoundRoute, parseRouteToNavigationState } from '../route-parser'
import { routes } from '../routes'

describe('route-parser: reports routes', () => {
  it('builds the reports route', () => {
    expect(routes.view.reports()).toBe('reports')
  })

  it('parses "reports" as reports navigator', () => {
    const result = parseCompoundRoute('reports')
    expect(result).not.toBeNull()
    expect(result!.navigator).toBe('reports')
    expect(result!.details).toBeNull()
  })

  it('converts reports route to navigation state', () => {
    expect(parseRouteToNavigationState('reports')).toEqual({
      navigator: 'reports',
      details: null,
    })
  })

  it('roundtrips reports navigation state back to route', () => {
    expect(buildRouteFromNavigationState({ navigator: 'reports', details: null })).toBe('reports')
  })

  it('roundtrips reports compound route', () => {
    expect(buildCompoundRoute(parseCompoundRoute('reports')!)).toBe('reports')
  })
})
```

- [ ] **Step 2: Run route test to verify it fails**

Run:

```powershell
bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts
```

Expected: FAIL because `routes.view.reports`, `NavigatorType = 'reports'`, and `ReportsNavigationState` do not exist.

- [ ] **Step 3: Add reports route builder**

In `apps/electron/src/shared/routes.ts`, add this under `routes.view` near other top-level navigator routes:

```ts
    /** StockCraft reports center */
    reports: () => 'reports' as const,
```

- [ ] **Step 4: Add reports navigation state**

In `apps/electron/src/shared/types.ts`, add:

```ts
export interface ReportsNavigationState {
  navigator: 'reports'
  details: null
  rightSidebar?: RightSidebarPanel
}
```

Add it to the `NavigationState` union:

```ts
  | ReportsNavigationState
```

Add the type guard:

```ts
export const isReportsNavigation = (
  state: NavigationState
): state is ReportsNavigationState => state.navigator === 'reports'
```

- [ ] **Step 5: Teach route parser about reports**

In `apps/electron/src/shared/route-parser.ts`:

Update `NavigatorType`:

```ts
export type NavigatorType = 'sessions' | 'sources' | 'skills' | 'automations' | 'settings' | 'reports'
```

Add `'reports'` to `COMPOUND_ROUTE_PREFIXES`.

Inside `parseCompoundRoute`, before sessions handling, add:

```ts
  if (first === 'reports') {
    if (segments.length === 1) {
      return { navigator: 'reports', details: null }
    }
    return null
  }
```

Inside `buildCompoundRoute`, add:

```ts
  if (parsed.navigator === 'reports') {
    return 'reports'
  }
```

Inside `convertCompoundToNavigationState`, add:

```ts
  if (compound.navigator === 'reports') {
    return { navigator: 'reports', details: null }
  }
```

Inside `navigationStateToCompoundRoute`, add:

```ts
  if (state.navigator === 'reports') {
    return { navigator: 'reports', details: null }
  }
```

Inside `convertParsedRouteToNavigationState`, add:

```ts
    case 'reports':
      return { navigator: 'reports', details: null }
```

- [ ] **Step 6: Re-export reports guard from navigation context**

In `apps/electron/src/renderer/contexts/NavigationContext.tsx`, add `isReportsNavigation` to the imports from `../../shared/types` and to the re-export line:

```ts
export { isSessionsNavigation, isSourcesNavigation, isSettingsNavigation, isSkillsNavigation, isAutomationsNavigation, isReportsNavigation }
```

- [ ] **Step 7: Run route test to verify it passes**

Run:

```powershell
bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run existing route parser tests**

Run:

```powershell
bun test apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-history-key.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-reconcile.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add apps/electron/src/shared/routes.ts apps/electron/src/shared/types.ts apps/electron/src/shared/route-parser.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/renderer/contexts/NavigationContext.tsx
git commit -m "Add reports route"
```

## Task 4: Add Report Actions And Page State Helpers

**Files:**
- Create: `apps/electron/src/renderer/stock-reports/report-actions.ts`
- Create: `apps/electron/src/renderer/stock-reports/report-page-state.ts`
- Test: `apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts`
- Test: `apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts`

- [ ] **Step 1: Write report action tests**

Create `apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts`:

```ts
import { describe, expect, mock, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { exportStockReportMarkdown, openStockReportSession } from '../report-actions'

function report(): StockResearchReport {
  return {
    id: 'report-1',
    runId: 'run-1',
    sessionId: 'session-1',
    title: 'AAPL Research Report',
    symbol: { input: 'AAPL', symbol: 'AAPL', market: 'US', exchange: 'US', displaySymbol: 'AAPL', currency: 'USD' },
    rating: 'Hold',
    riskLevel: 'Moderate',
    summary: 'Summary',
    contentMarkdown: '## Body',
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('openStockReportSession', () => {
  test('navigates to the linked session', () => {
    const navigateToSession = mock(() => {})
    openStockReportSession(report(), navigateToSession)
    expect(navigateToSession).toHaveBeenCalledWith('session-1')
  })
})

describe('exportStockReportMarkdown', () => {
  test('formats and downloads the selected report', () => {
    const download = mock(() => {})
    exportStockReportMarkdown(report(), download)
    expect(download).toHaveBeenCalledWith(
      'AAPL-aapl-research-report.md',
      expect.stringContaining('# AAPL Research Report'),
    )
  })
})
```

- [ ] **Step 2: Write page state tests**

Create `apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { chooseInitialReportId, shouldLoadReportDetail } from '../report-page-state'

const report = (id: string, createdAt: number): StockResearchReport => ({
  id,
  runId: `run-${id}`,
  sessionId: `session-${id}`,
  title: `${id} report`,
  symbol: { input: id, symbol: id, market: 'US', exchange: 'US', displaySymbol: id, currency: 'USD' },
  rating: null,
  riskLevel: null,
  summary: '',
  contentMarkdown: '',
  createdAt,
  updatedAt: createdAt,
})

describe('chooseInitialReportId', () => {
  test('keeps current selection when it still exists', () => {
    expect(chooseInitialReportId([report('a', 1), report('b', 2)], 'a')).toBe('a')
  })

  test('selects newest visible report when current selection is missing', () => {
    expect(chooseInitialReportId([report('old', 1), report('new', 3)], 'missing')).toBe('new')
  })

  test('returns null for empty lists', () => {
    expect(chooseInitialReportId([], 'missing')).toBeNull()
  })
})

describe('shouldLoadReportDetail', () => {
  test('loads when selected id differs from loaded detail', () => {
    expect(shouldLoadReportDetail('report-1', null)).toBe(true)
    expect(shouldLoadReportDetail('report-1', 'report-2')).toBe(true)
    expect(shouldLoadReportDetail('report-1', 'report-1')).toBe(false)
  })
})
```

- [ ] **Step 3: Run action/state tests to verify they fail**

Run:

```powershell
bun test apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts
```

Expected: FAIL because `report-actions.ts` and `report-page-state.ts` do not exist.

- [ ] **Step 4: Implement report actions**

Create `apps/electron/src/renderer/stock-reports/report-actions.ts`:

```ts
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { buildStockReportFilename, formatStockReportMarkdown } from './report-export'

export type NavigateToSession = (sessionId: string) => void
export type DownloadMarkdown = (filename: string, markdown: string) => void

export function openStockReportSession(
  report: StockResearchReport,
  navigateToSession: NavigateToSession,
): void {
  navigateToSession(report.sessionId)
}

export function exportStockReportMarkdown(
  report: StockResearchReport,
  download: DownloadMarkdown,
): void {
  download(buildStockReportFilename(report), formatStockReportMarkdown(report))
}

export function downloadMarkdownFile(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 5: Implement page state helper**

Create `apps/electron/src/renderer/stock-reports/report-page-state.ts`:

```ts
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { sortStockReportsNewestFirst } from './report-filtering'

export function chooseInitialReportId(
  visibleReports: StockResearchReport[],
  currentReportId: string | null,
): string | null {
  if (currentReportId && visibleReports.some(report => report.id === currentReportId)) {
    return currentReportId
  }
  return sortStockReportsNewestFirst(visibleReports)[0]?.id ?? null
}

export function shouldLoadReportDetail(
  selectedReportId: string | null,
  loadedReportId: string | null,
): boolean {
  return Boolean(selectedReportId) && selectedReportId !== loadedReportId
}
```

- [ ] **Step 6: Run action/state tests to verify they pass**

Run:

```powershell
bun test apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/electron/src/renderer/stock-reports
git commit -m "Add stock report actions"
```

## Task 5: Render Reports Page And Navigation Entry

**Files:**
- Create: `apps/electron/src/renderer/pages/ReportsPage.tsx`
- Modify: `apps/electron/src/renderer/pages/index.ts`
- Modify: `apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx`
- Modify: `apps/electron/src/renderer/components/app-shell/AppShell.tsx`
- Modify: `packages/shared/src/i18n/locales/en.json`
- Modify: `packages/shared/src/i18n/locales/zh-Hans.json`

- [ ] **Step 1: Write a narrow navigation render test**

Because this repo does not have a DOM-focused React test harness, add assertions to the route/parser layer and rely on TypeScript for page wiring. Extend `apps/electron/src/shared/__tests__/route-parser-reports.test.ts` with:

```ts
  it('keeps reports as a top-level view route type', () => {
    const route = routes.view.reports()
    const state = parseRouteToNavigationState(route)
    expect(state).toEqual({ navigator: 'reports', details: null })
  })
```

This test should already pass after Task 3; it exists to keep the route contract explicit while UI wiring is typechecked.

- [ ] **Step 2: Create ReportsPage**

Create `apps/electron/src/renderer/pages/ReportsPage.tsx`:

```tsx
import * as React from 'react'
import { FileText, RefreshCw, Search, Download, MessageSquare, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { useNavigation } from '@/contexts/NavigationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  filterStockReports,
  sortStockReportsNewestFirst,
  type StockReportRiskFilter,
} from '@/stock-reports/report-filtering'
import { chooseInitialReportId, shouldLoadReportDetail } from '@/stock-reports/report-page-state'
import {
  downloadMarkdownFile,
  exportStockReportMarkdown,
  openStockReportSession,
} from '@/stock-reports/report-actions'

export default function ReportsPage() {
  const { navigateToSession } = useNavigation()
  const [reports, setReports] = React.useState<StockResearchReport[]>([])
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<StockResearchReport | null>(null)
  const [query, setQuery] = React.useState('')
  const [riskLevel, setRiskLevel] = React.useState<StockReportRiskFilter>('all')
  const [listState, setListState] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [detailState, setDetailState] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [listError, setListError] = React.useState<string | null>(null)
  const [detailError, setDetailError] = React.useState<string | null>(null)

  const visibleReports = React.useMemo(() => {
    return sortStockReportsNewestFirst(filterStockReports(reports, { query, riskLevel }))
  }, [reports, query, riskLevel])

  const loadReports = React.useCallback(async () => {
    setListState('loading')
    setListError(null)
    try {
      const nextReports = await window.electronAPI.listStockResearchReports()
      setReports(nextReports)
      setListState('ready')
      setSelectedReportId(prev => chooseInitialReportId(nextReports, prev))
    } catch (error) {
      setListState('error')
      setListError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  React.useEffect(() => {
    void loadReports()
  }, [loadReports])

  React.useEffect(() => {
    setSelectedReportId(prev => chooseInitialReportId(visibleReports, prev))
  }, [visibleReports])

  React.useEffect(() => {
    if (!shouldLoadReportDetail(selectedReportId, detail?.id ?? null)) return
    let stale = false
    setDetailState('loading')
    setDetailError(null)
    window.electronAPI.getStockResearchReport(selectedReportId!)
      .then(report => {
        if (!stale) {
          setDetail(report)
          setDetailState('ready')
        }
      })
      .catch(error => {
        if (!stale) {
          setDetailState('error')
          setDetailError(error instanceof Error ? error.message : String(error))
        }
      })
    return () => { stale = true }
  }, [selectedReportId, detail?.id])

  const selectedSummary = visibleReports.find(report => report.id === selectedReportId) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="border-b px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-normal">Reports</h1>
            <p className="text-sm text-muted-foreground">Saved StockCraft research reports</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadReports()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,0.9fr)_minmax(420px,1.4fr)]">
        <section className="flex min-h-0 flex-col border-r">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="pl-8"
                placeholder="Search symbol, title, or summary"
              />
            </div>
            <select
              value={riskLevel}
              onChange={event => setRiskLevel(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All risk levels</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listState === 'loading' && <PanelMessage text="Loading reports..." />}
            {listState === 'error' && (
              <PanelMessage
                icon={<AlertCircle className="h-4 w-4" />}
                text={listError ?? 'Failed to load reports.'}
                action={<Button size="sm" onClick={() => void loadReports()}>Retry</Button>}
              />
            )}
            {listState === 'ready' && visibleReports.length === 0 && (
              <PanelMessage text="No saved reports yet. Start a stock research run to save one." />
            )}
            {listState === 'ready' && visibleReports.map(report => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className={cn(
                  'mb-2 w-full rounded-md border p-3 text-left transition-colors hover:bg-accent',
                  selectedReportId === report.id && 'border-primary bg-accent',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{report.symbol.displaySymbol}</span>
                  <span className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-sm">{report.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{report.summary}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {report.symbol.market} / Risk: {report.riskLevel ?? 'Unspecified'}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto p-5">
          {!selectedReportId && <PanelMessage icon={<FileText className="h-4 w-4" />} text="Select a report to view details." />}
          {selectedReportId && detailState === 'loading' && <PanelMessage text="Loading report detail..." />}
          {selectedReportId && detailState === 'error' && (
            <PanelMessage
              icon={<AlertCircle className="h-4 w-4" />}
              text={detailError ?? 'Failed to load report detail.'}
              action={<Button size="sm" onClick={() => setDetail(null)}>Retry</Button>}
            />
          )}
          {detailState === 'ready' && detail && (
            <article>
              <div className="flex items-start justify-between gap-3 border-b pb-4">
                <div>
                  <div className="text-sm text-muted-foreground">{detail.symbol.displaySymbol} / {detail.symbol.market}</div>
                  <h2 className="mt-1 text-xl font-semibold tracking-normal">{detail.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{detail.summary}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Rating: {detail.rating ?? 'Unrated'} / Risk: {detail.riskLevel ?? 'Unspecified'}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openStockReportSession(detail, navigateToSession)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Session
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        exportStockReportMarkdown(detail, downloadMarkdownFile)
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : String(error))
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export MD
                  </Button>
                </div>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-6">{detail.contentMarkdown}</pre>
              <p className="mt-4 text-xs text-muted-foreground">For research only. Not investment advice.</p>
            </article>
          )}
          {selectedSummary && detailState === 'idle' && <PanelMessage text={`Selected ${selectedSummary.title}`} />}
        </section>
      </div>
    </div>
  )
}

function PanelMessage({
  icon,
  text,
  action,
}: {
  icon?: React.ReactNode
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
      {icon}
      <p>{text}</p>
      {action}
    </div>
  )
}
```

- [ ] **Step 3: Export ReportsPage**

In `apps/electron/src/renderer/pages/index.ts`, add:

```ts
export { default as ReportsPage } from './ReportsPage'
```

- [ ] **Step 4: Render ReportsPage in MainContentPanel**

In `apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx`:

Add `isReportsNavigation` to imports from `NavigationContext`.

Change page import:

```ts
import { SourceInfoPage, ChatPage, ReportsPage } from '@/pages'
```

Before the sessions navigator block, add:

```tsx
  if (isReportsNavigation(navState)) {
    return wrapWithStoplight(
      <Panel variant="grow" className={className}>
        <ReportsPage />
      </Panel>
    )
  }
```

- [ ] **Step 5: Add sidebar navigation**

In `apps/electron/src/renderer/components/app-shell/AppShell.tsx`:

Add `FileText` from `lucide-react` if icons are individually imported, or use the existing icon import pattern.

Add a click handler near the other navigation handlers:

```ts
  const handleReportsClick = useCallback(() => {
    navigate(routes.view.reports())
  }, [])
```

In `listTitle`, before settings/sessions fallback, add:

```ts
    if (isReportsNavigation(navState)) return t("sidebar.reports")
```

In the left sidebar links array, place Reports near the Stock Research / session area or before Sources:

```tsx
                    {
                      id: "nav:reports",
                      title: t("sidebar.reports"),
                      icon: FileText,
                      variant: isReportsNavigation(navState) ? "default" : "ghost",
                      onClick: handleReportsClick,
                    },
```

- [ ] **Step 6: Add i18n labels**

In `packages/shared/src/i18n/locales/en.json`, add near other `sidebar.*` keys:

```json
"sidebar.reports": "Reports"
```

In `packages/shared/src/i18n/locales/zh-Hans.json`, add:

```json
"sidebar.reports": "报告"
```

Run locale sorting afterward if the repo expects sorted locale files:

```powershell
bun run sort-locales
```

- [ ] **Step 7: Run focused route and helper tests**

Run:

```powershell
bun test apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run Electron typecheck**

Run:

```powershell
cd apps/electron; bun run typecheck
```

Expected: PASS. Fix type errors in the new route/page wiring before committing.

- [ ] **Step 9: Commit**

```powershell
git add apps/electron/src/renderer/pages/ReportsPage.tsx apps/electron/src/renderer/pages/index.ts apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx apps/electron/src/renderer/components/app-shell/AppShell.tsx packages/shared/src/i18n/locales/en.json packages/shared/src/i18n/locales/zh-Hans.json
git commit -m "Add stock reports page"
```

## Task 6: Final Verification And Progress Records

**Files:**
- Modify: `feature_list.json`
- Modify: `claude-progress.md`

- [ ] **Step 1: Run full focused stock report verification**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-filtering.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-export.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-actions.test.ts apps/electron/src/renderer/stock-reports/__tests__/report-page-state.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typechecks**

Run:

```powershell
bun run typecheck:shared
cd packages/server-core; bun run typecheck
cd ..\..\apps\electron; bun run typecheck
cd ..\..
```

Expected: all PASS.

- [ ] **Step 3: Run startup and file validation**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
python -m json.tool feature_list.json
git diff --check
```

Expected: `init.ps1` and `json.tool` PASS; `git diff --check` has no errors. Windows LF/CRLF warnings are acceptable only if exit code is 0.

- [ ] **Step 4: Update `feature_list.json`**

Set `stock-003.status` to `passing` only after the verification above passes. Add evidence entries like:

```json
"2026-06-17: 独立 Reports 页面已实现，复用 list/get report RPC；列表展示股票、市场、风险等级、创建时间，详情展示完整 Markdown，并提供 Open Session 与 Export MD。",
"2026-06-17: focused report tests、stock storage/RPC tests、route parser tests、ipc channel stability、shared/server/electron typecheck、init.ps1、json.tool、git diff --check 均通过。"
```

- [ ] **Step 5: Update `claude-progress.md`**

Append a Session 014 entry:

```md
### Session 014

- 日期：2026-06-17
- 本轮目标：实现 `stock-003` 独立 Reports 中心。
- 已完成：
  - 新增 Reports route 和左侧导航入口。
  - 新增 Reports 页面，支持报告列表、本地筛选、详情加载、跳回关联 Craft session、导出 Markdown。
  - `StockResearchReport` DTO 增加 `sessionId`，复用已有 stock storage RPC。
- 验证记录：
  - `...`：通过。
- 当前进度：
  - `stock-003` 已标记为 `passing`。
  - 下一步最高优先级功能为 `stock-004`：轻量 Watchlist。
```

- [ ] **Step 6: Commit progress records**

```powershell
git add feature_list.json claude-progress.md
git commit -m "记录报告中心验收"
```

- [ ] **Step 7: Final status**

Run:

```powershell
git status --short --branch
git log --oneline -5
```

Expected: clean working tree on `codex/stock-003-reports-center`.

## Self-Review

- Spec coverage: the plan covers the standalone page, list/detail loading through ElectronAPI, renderer-local filtering, `Open Session`, Markdown export, empty/error states, and final verification.
- No server-side filtering is included, matching the approved v1 scope.
- `sessionId` is added to the existing report DTO instead of adding a new endpoint.
- Tests are primarily pure Bun tests because the current repo does not expose a DOM-focused React test harness.
- No task asks the implementer to write production code before a failing test.
