# Stock 002 SQLite Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local SQLite persistence for StockCraft symbols, watchlist items, research runs, steps, and reports without letting renderer code access SQLite directly.

**Architecture:** Add a focused `StockStorageService` in `packages/server-core/src/stock` backed by `better-sqlite3`. Inject the service through `HandlerDeps`, expose typed stock research RPCs from `server-core`, and keep renderer access on `window.electronAPI`/RPC only.

**Tech Stack:** Bun, TypeScript, `better-sqlite3`, existing Craft RPC transport, existing StockCraft symbol parser and research run helpers.

---

### Task 1: SQLite Service And Schema

**Files:**
- Create: `packages/server-core/src/stock/stock-storage.ts`
- Create: `packages/server-core/src/stock/index.ts`
- Test: `packages/server-core/src/stock/stock-storage.test.ts`
- Modify: `packages/server-core/package.json`
- Modify: `package.json`

- [ ] **Step 1: Write the failing service tests**

```ts
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, test } from 'bun:test'
import { parseStockSymbol } from '@craft-agent/shared/stock'
import { StockStorageService } from './stock-storage'

function createService() {
  const dir = mkdtempSync(join(tmpdir(), 'stock-storage-'))
  return new StockStorageService({ databasePath: join(dir, 'stockcraft.sqlite') })
}

describe('StockStorageService', () => {
  test('initializes the stock schema on first open', () => {
    const service = createService()
    const tables = service.listTables()
    expect(tables).toEqual([
      'research_reports',
      'research_runs',
      'research_steps',
      'stock_symbols',
      'watchlist_items',
    ])
    service.close()
  })

  test('adds, lists, and removes watchlist items without duplicating symbols', () => {
    const service = createService()
    const symbol = parseStockSymbol('600519')
    const item = service.addWatchlistItem({ symbol, groupName: 'Core', note: 'Kweichow Moutai' })
    const duplicate = service.addWatchlistItem({ symbol, groupName: 'Core', note: 'Updated note' })

    expect(duplicate.id).toBe(item.id)
    expect(service.listWatchlistItems()).toMatchObject([
      { id: item.id, groupName: 'Core', note: 'Updated note', symbol: { displaySymbol: '600519.SH' } },
    ])

    service.removeWatchlistItem(item.id)
    expect(service.listWatchlistItems()).toEqual([])
    service.close()
  })

  test('creates research runs with five pending steps and stores reports', () => {
    const service = createService()
    const symbol = parseStockSymbol('AAPL')
    const run = service.createResearchRun({ sessionId: 'session-1', symbol })
    const steps = service.listResearchSteps(run.id)

    expect(run).toMatchObject({ sessionId: 'session-1', status: 'created', symbol: { displaySymbol: 'AAPL' } })
    expect(steps.map((step) => step.status)).toEqual(['pending', 'pending', 'pending', 'pending', 'pending'])

    const report = service.saveResearchReport({
      runId: run.id,
      title: 'AAPL Research Report',
      rating: 'neutral',
      riskLevel: 'medium',
      summary: 'Balanced setup.',
      contentMarkdown: '# AAPL\n\n仅供研究，不构成投资建议。',
    })

    expect(service.listResearchReports()).toMatchObject([
      { id: report.id, runId: run.id, title: 'AAPL Research Report', symbol: { displaySymbol: 'AAPL' } },
    ])
    expect(service.getResearchReport(report.id)).toMatchObject({ contentMarkdown: expect.stringContaining('不构成投资建议') })
    service.close()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/server-core/src/stock/stock-storage.test.ts`
Expected: FAIL because `./stock-storage` does not exist.

- [ ] **Step 3: Implement the minimal service**

Create a `StockStorageService` that opens a `better-sqlite3` database, runs `CREATE TABLE IF NOT EXISTS` schema for the five stock tables, and exposes the methods used in the tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/server-core/src/stock/stock-storage.test.ts`
Expected: PASS.

### Task 2: RPC Contracts And Handler Persistence

**Files:**
- Modify: `packages/shared/src/stock/types.ts`
- Modify: `packages/shared/src/protocol/channels.ts`
- Modify: `packages/shared/src/protocol/routing.ts`
- Modify: `packages/server-core/src/handlers/handler-deps.ts`
- Modify: `packages/server-core/src/handlers/rpc/stock-research.ts`
- Test: `packages/server-core/src/handlers/rpc/stock-research.test.ts`
- Test: `packages/shared/src/protocol/__tests__/routing.test.ts`

- [ ] **Step 1: Write failing RPC tests**

Extend `stock-research.test.ts` so `stockResearch:createRun` asserts `stockStorage.createResearchRun` is called with the parsed symbol and returned `runId` is included in the RPC result. Add tests for `watchlist:add`, `watchlist:list`, `watchlist:remove`, `stockResearch:listReports`, and `stockResearch:getReport`.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts`
Expected: FAIL because new channels/results are not implemented.

- [ ] **Step 3: Implement typed channels and handler methods**

Add stock DTOs to shared types, add channels under `RPC_CHANNELS.stockResearch`, classify them as `REMOTE_ELIGIBLE`, and register handlers that delegate to `deps.stockStorage`.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun test packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts`
Expected: PASS.

### Task 3: Host Wiring

**Files:**
- Modify: `apps/electron/src/main/index.ts`
- Modify: `packages/server/src/index.ts`
- Modify: `apps/electron/src/shared/types.ts`
- Modify: `apps/electron/src/preload/bootstrap.ts`
- Test: `apps/electron/src/shared/__tests__/ipc-channels.test.ts`
- Test: `apps/electron/src/main/handlers/__tests__/registration.test.ts`

- [ ] **Step 1: Write failing integration wiring tests**

Update the IPC channel test to include the new stock methods and ensure registration still covers the core handler set.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts`
Expected: FAIL until preload/API and dependency wiring expose the new methods.

- [ ] **Step 3: Wire storage into Electron and headless server**

Instantiate `StockStorageService` in each host with `~/.craft-agent/workspaces/<workspaceId>/stockcraft.sqlite` style workspace-scoped paths, pass it in `HandlerDeps`, and expose renderer methods through preload.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun test apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts`
Expected: PASS.

### Task 4: Verification And Handoff

**Files:**
- Modify: `feature_list.json`
- Modify: `claude-progress.md`
- Modify: `session-handoff.md` if the session is getting long or context is about to compact.

- [ ] **Step 1: Run focused verification**

Run:
`bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts`

- [ ] **Step 2: Run typechecks**

Run:
`bun run typecheck:shared`
`cd packages/server-core && bun run typecheck`
`cd apps/electron && bun run typecheck`

- [ ] **Step 3: Run standard startup check**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1`

- [ ] **Step 4: Update persistent progress files**

Record passing commands, any remaining blocker, and the exact next step.

- [ ] **Step 5: Commit**

Run:
`git add package.json bun.lock packages apps docs feature_list.json claude-progress.md session-handoff.md`
`git commit -m "实现股票模块 SQLite 存储"`
