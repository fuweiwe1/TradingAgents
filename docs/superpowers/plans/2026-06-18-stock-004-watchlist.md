# StockCraft Lightweight Watchlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Watchlist page where users can group stocks, edit notes and group membership, remove entries safely, and launch Stock Research directly.

**Architecture:** Extend the existing stock storage/RPC boundary with one atomic watchlist update operation, then keep grouping, filtering, selection, and research-launch behavior in focused renderer helpers. Add a top-level `watchlist` route parallel to Reports and render a workspace-safe `WatchlistPage` through the existing ElectronAPI boundary.

**Tech Stack:** Bun tests, TypeScript, `bun:sqlite`, shared RPC protocol, React 18, Electron renderer, Tailwind/shadcn UI, i18next.

---

## File Structure

- Modify `packages/shared/src/stock/types.ts`: add `UpdateStockWatchlistItemRequest`.
- Modify `packages/shared/src/protocol/dto.ts`: re-export the update request.
- Modify `packages/shared/src/protocol/channels.ts`: add the update channel.
- Modify `packages/shared/src/protocol/routing.ts`: classify the update channel as remote eligible.
- Modify `packages/server-core/src/stock/stock-storage.ts`: implement atomic watchlist updates.
- Modify `packages/server-core/src/stock/stock-storage.test.ts`: cover update semantics and conflicts.
- Modify `packages/server-core/src/handlers/rpc/stock-research.ts`: register the update handler.
- Modify `packages/server-core/src/handlers/rpc/stock-research.test.ts`: verify update forwarding.
- Modify `apps/electron/src/shared/types.ts`: expose the Electron API method.
- Modify `apps/electron/src/transport/channel-map.ts`: map the update method.
- Modify IPC/routing/registration tests for the new channel.
- Create `apps/electron/src/renderer/stock-watchlist/watchlist-grouping.ts`: filtering/grouping/sorting helpers.
- Create `apps/electron/src/renderer/stock-watchlist/watchlist-page-state.ts`: selection and dirty-state helpers.
- Create `apps/electron/src/renderer/stock-watchlist/watchlist-actions.ts`: reuse the research launch flow.
- Create focused tests under `apps/electron/src/renderer/stock-watchlist/__tests__/`.
- Modify route/navigation files to add a top-level `watchlist` navigator.
- Create `apps/electron/src/shared/__tests__/route-parser-watchlist.test.ts`.
- Create `apps/electron/src/renderer/pages/WatchlistPage.tsx`.
- Create `apps/electron/src/renderer/stock-watchlist/AddWatchlistItemDialog.tsx`.
- Create `apps/electron/src/renderer/stock-watchlist/RemoveWatchlistItemDialog.tsx`.
- Modify `AppShellContext`, `AppShell`, `MainContentPanel`, and the pages barrel for page wiring and session refresh.
- Modify all locale files for visible Watchlist strings.
- Modify `feature_list.json` and `claude-progress.md` only after final verification.

## Task 1: Add Atomic Watchlist Update Storage

**Files:**
- Modify: `packages/shared/src/stock/types.ts`
- Modify: `packages/server-core/src/stock/stock-storage.ts`
- Test: `packages/server-core/src/stock/stock-storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Extend `packages/server-core/src/stock/stock-storage.test.ts` with:

```ts
  test('updates watchlist group and note with patch semantics', () => {
    const service = createService()
    const item = service.addWatchlistItem({
      symbol: parseStockSymbol('AAPL'),
      groupName: 'Core',
      note: 'Original note',
    })

    const noteOnly = service.updateWatchlistItem(item.id, {
      note: 'Updated note',
    })
    expect(noteOnly).toMatchObject({
      id: item.id,
      groupName: 'Core',
      note: 'Updated note',
    })

    const moved = service.updateWatchlistItem(item.id, {
      groupName: '  ',
      note: null,
    })
    expect(moved).toMatchObject({
      id: item.id,
      groupName: 'Default',
      note: null,
    })

    service.close()
  })

  test('rejects duplicate symbol and target group without changing either item', () => {
    const service = createService()
    const symbol = parseStockSymbol('AAPL')
    const core = service.addWatchlistItem({
      symbol,
      groupName: 'Core',
      note: 'Core note',
    })
    const growth = service.addWatchlistItem({
      symbol,
      groupName: 'Growth',
      note: 'Growth note',
    })

    expect(() => service.updateWatchlistItem(growth.id, {
      groupName: 'Core',
    })).toThrow('already exists in group Core')

    expect(service.listWatchlistItems()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: growth.id, groupName: 'Growth', note: 'Growth note' }),
      expect.objectContaining({ id: core.id, groupName: 'Core', note: 'Core note' }),
    ]))

    service.close()
  })

  test('rejects updating an unknown watchlist item', () => {
    const service = createService()

    expect(() => service.updateWatchlistItem('missing', {
      note: 'No-op',
    })).toThrow('Watchlist item not found: missing')

    service.close()
  })
```

- [ ] **Step 2: Run the storage test and verify red**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts
```

Expected: FAIL because `updateWatchlistItem` does not exist.

- [ ] **Step 3: Add the shared update request**

Add to `packages/shared/src/stock/types.ts` after `AddStockWatchlistItemRequest`:

```ts
export interface UpdateStockWatchlistItemRequest {
  groupName?: string | null
  note?: string | null
}
```

- [ ] **Step 4: Extend the storage interface**

Add the request type import and method to `packages/server-core/src/stock/stock-storage.ts`:

```ts
import {
  STOCK_RESEARCH_STEPS,
  type ParsedStockSymbol,
  type StockResearchReport,
  type StockResearchRunRecord,
  type StockResearchRunStatus,
  type StockResearchStepKey,
  type StockResearchStepRecord,
  type StockResearchStepStatus,
  type StockWatchlistItem,
  type UpdateStockWatchlistItemRequest,
} from '@craft-agent/shared/stock'
```

```ts
  updateWatchlistItem(
    id: string,
    input: UpdateStockWatchlistItemRequest,
  ): StockWatchlistItem
```

- [ ] **Step 5: Implement the atomic update**

Add after `listWatchlistItems()`:

```ts
  updateWatchlistItem(
    id: string,
    input: UpdateStockWatchlistItemRequest,
  ): StockWatchlistItem {
    const update = this.db.transaction(() => {
      const current = this.db.query<{
        symbol_id: string
        group_name: string
        note: string | null
      }, [string]>(`
        SELECT symbol_id, group_name, note
        FROM watchlist_items
        WHERE id = ?
      `).get(id)

      if (!current) {
        throw new Error(`Watchlist item not found: ${id}`)
      }

      const groupName = input.groupName === undefined
        ? current.group_name
        : normalizeGroupName(input.groupName)
      const note = input.note === undefined ? current.note : input.note

      const conflict = this.db.query<{ id: string }, [string, string, string]>(`
        SELECT id
        FROM watchlist_items
        WHERE symbol_id = ?
          AND group_name = ?
          AND id <> ?
      `).get(current.symbol_id, groupName, id)

      if (conflict) {
        throw new Error(`Watchlist item already exists in group ${groupName}`)
      }

      this.db.query(`
        UPDATE watchlist_items
        SET group_name = ?, note = ?, updated_at = ?
        WHERE id = ?
      `).run(groupName, note, Date.now(), id)
    })

    update()
    return this.getWatchlistItem(id)
  }
```

Keep the existing canonical normalization:

```ts
function normalizeGroupName(groupName: string | null | undefined): string {
  const normalized = groupName?.trim()
  return normalized || 'Default'
}
```

- [ ] **Step 6: Run storage tests and verify green**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add packages/shared/src/stock/types.ts packages/server-core/src/stock/stock-storage.ts packages/server-core/src/stock/stock-storage.test.ts
git commit -m "Add watchlist item updates"
```

## Task 2: Wire the Update RPC and Electron API

**Files:**
- Modify: `packages/shared/src/protocol/dto.ts`
- Modify: `packages/shared/src/protocol/channels.ts`
- Modify: `packages/shared/src/protocol/routing.ts`
- Modify: `packages/shared/src/protocol/__tests__/routing.test.ts`
- Modify: `packages/server-core/src/handlers/rpc/stock-research.ts`
- Modify: `packages/server-core/src/handlers/rpc/stock-research.test.ts`
- Modify: `apps/electron/src/shared/types.ts`
- Modify: `apps/electron/src/transport/channel-map.ts`
- Modify: `apps/electron/src/shared/__tests__/ipc-channels.test.ts`
- Modify: `apps/electron/src/main/handlers/__tests__/registration.test.ts`
- Modify: `apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts`

- [ ] **Step 1: Extend the RPC test harness first**

In `packages/server-core/src/handlers/rpc/stock-research.test.ts`, add:

```ts
    updateWatchlistItem(id: string, input: unknown) {
      calls.push({ method: 'updateWatchlistItem', args: [id, input] })
      return {
        ...storageState.watchlist[0],
        id,
        ...(input as object),
      }
    },
```

Capture and return the handler:

```ts
  const updateWatchlistItem = handlers.get(RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM)
```

```ts
    updateWatchlistItem,
```

In the storage handler test, assert:

```ts
    expect(updateWatchlistItem).toBeFunction()

    await expect(updateWatchlistItem!(
      { clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null },
      'workspace-1',
      'watchlist-1',
      { groupName: 'Core', note: 'Updated note' },
    )).resolves.toMatchObject({
      id: 'watchlist-1',
      groupName: 'Core',
      note: 'Updated note',
    })

    expect(calls).toContainEqual({
      method: 'updateWatchlistItem',
      args: ['watchlist-1', { groupName: 'Core', note: 'Updated note' }],
    })
```

- [ ] **Step 2: Add the expected IPC wire string**

Add `'stockResearch:updateWatchlistItem'` to the sorted expected array in:

`apps/electron/src/shared/__tests__/ipc-channels.test.ts`.

- [ ] **Step 3: Run red protocol tests**

Run:

```powershell
bun test packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts
```

Expected: FAIL because the update channel and handler do not exist.

- [ ] **Step 4: Export the DTO**

Add `UpdateStockWatchlistItemRequest` to the stock exports in:

`packages/shared/src/protocol/dto.ts`.

- [ ] **Step 5: Add and classify the channel**

In `packages/shared/src/protocol/channels.ts`:

```ts
    UPDATE_WATCHLIST_ITEM: 'stockResearch:updateWatchlistItem',
```

Place it between list and remove.

In `packages/shared/src/protocol/routing.ts`, add:

```ts
  RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM,
```

to the remote-eligible stock research block.

- [ ] **Step 6: Register the server handler**

Import `UpdateStockWatchlistItemRequest` in:

`packages/server-core/src/handlers/rpc/stock-research.ts`.

Add the channel to `HANDLED_CHANNELS`:

```ts
  RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM,
```

Register:

```ts
  server.handle(
    RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM,
    async (
      _ctx,
      _workspaceId: string,
      id: string,
      request: UpdateStockWatchlistItemRequest,
    ): Promise<StockWatchlistItem> => {
      return requireStockStorage(deps).updateWatchlistItem(id, request)
    },
  )
```

- [ ] **Step 7: Expose the Electron API**

Import `UpdateStockWatchlistItemRequest` in:

`apps/electron/src/shared/types.ts`.

Add:

```ts
  updateStockWatchlistItem(
    workspaceId: string,
    id: string,
    request: UpdateStockWatchlistItemRequest,
  ): Promise<StockWatchlistItem>
```

In `apps/electron/src/transport/channel-map.ts`, add:

```ts
  updateStockWatchlistItem: invoke(RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM),
```

- [ ] **Step 8: Run protocol, routing, and registration tests**

Run:

```powershell
bun test packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts
```

Expected: PASS. Registration tests should pick up the new handler through `HANDLED_CHANNELS` without manual expected-list edits.

- [ ] **Step 9: Run typechecks**

Run:

```powershell
bun run typecheck:shared
cd packages/server-core; bun run typecheck
cd ..\..\apps\electron; bun run typecheck
cd ..\..
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add packages/shared/src/protocol packages/server-core/src/handlers/rpc/stock-research.ts packages/server-core/src/handlers/rpc/stock-research.test.ts apps/electron/src/shared/types.ts apps/electron/src/transport/channel-map.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__
git commit -m "Wire watchlist update RPC"
```

## Task 3: Add Pure Watchlist Helpers

**Files:**
- Create: `apps/electron/src/renderer/stock-watchlist/watchlist-grouping.ts`
- Create: `apps/electron/src/renderer/stock-watchlist/watchlist-page-state.ts`
- Create: `apps/electron/src/renderer/stock-watchlist/watchlist-actions.ts`
- Create: `apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-grouping.test.ts`
- Create: `apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-page-state.test.ts`
- Create: `apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-actions.test.ts`

- [ ] **Step 1: Write grouping tests**

Create `watchlist-grouping.test.ts` with:

```ts
import { describe, expect, test } from 'bun:test'
import type { StockWatchlistItem } from '@craft-agent/shared/stock'
import {
  filterWatchlistItems,
  getWatchlistGroupOptions,
  groupWatchlistItems,
  toEditableGroupName,
} from '../watchlist-grouping'

function item(overrides: Partial<StockWatchlistItem>): StockWatchlistItem {
  return {
    id: 'item-1',
    symbol: {
      input: 'AAPL',
      symbol: 'AAPL',
      market: 'US',
      exchange: 'US',
      displaySymbol: 'AAPL',
      currency: 'USD',
    },
    groupName: 'Core',
    note: null,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  }
}

describe('watchlist grouping', () => {
  test('groups by display name and sorts entries newest first', () => {
    const groups = groupWatchlistItems([
      item({ id: 'core-old', groupName: 'Core', createdAt: 100 }),
      item({ id: 'ungrouped', groupName: 'Default', createdAt: 300 }),
      item({ id: 'core-new', groupName: 'Core', createdAt: 200 }),
      item({ id: 'observe', groupName: 'Observe', createdAt: 400 }),
    ], '未分组')

    expect(groups.map(group => group.displayName)).toEqual(['Core', 'Observe', '未分组'])
    expect(groups[0]?.items.map(entry => entry.id)).toEqual(['core-new', 'core-old'])
  })

  test('derives group choices without exposing Default', () => {
    expect(getWatchlistGroupOptions([
      item({ groupName: 'Core' }),
      item({ id: '2', groupName: 'Default' }),
      item({ id: '3', groupName: 'Core' }),
      item({ id: '4', groupName: 'Observe' }),
    ])).toEqual(['Core', 'Observe'])
    expect(toEditableGroupName('Default')).toBe('')
  })

  test('searches symbol, market, group, and note', () => {
    const items = [
      item({ id: 'a', groupName: 'Core', note: 'Services growth' }),
      item({
        id: 'b',
        groupName: 'Observe',
        symbol: {
          input: '00700.HK',
          symbol: '00700',
          market: 'HK',
          exchange: 'HK',
          displaySymbol: '00700.HK',
          currency: 'HKD',
        },
        note: 'Gaming recovery',
      }),
    ]

    expect(filterWatchlistItems(items, 'services').map(entry => entry.id)).toEqual(['a'])
    expect(filterWatchlistItems(items, 'hk').map(entry => entry.id)).toEqual(['b'])
    expect(filterWatchlistItems(items, 'observe').map(entry => entry.id)).toEqual(['b'])
  })
})
```

- [ ] **Step 2: Write page-state tests**

Create `watchlist-page-state.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import type { StockWatchlistItem } from '@craft-agent/shared/stock'
import {
  chooseInitialWatchlistItemId,
  chooseSelectionAfterRemoval,
  isWatchlistDraftDirty,
} from '../watchlist-page-state'
import type { WatchlistGroup } from '../watchlist-grouping'

function entry(id: string, groupName: string): StockWatchlistItem {
  return {
    id,
    symbol: {
      input: id,
      symbol: id,
      market: 'US',
      exchange: 'US',
      displaySymbol: id,
      currency: 'USD',
    },
    groupName,
    note: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

const groups: WatchlistGroup[] = [
  { storageName: 'Core', displayName: 'Core', items: [entry('a', 'Core'), entry('b', 'Core')] },
  { storageName: 'Observe', displayName: 'Observe', items: [entry('c', 'Observe')] },
]

test('preserves a visible current selection', () => {
  expect(chooseInitialWatchlistItemId(groups, 'b')).toBe('b')
})

test('selects the first visible item when current selection is missing', () => {
  expect(chooseInitialWatchlistItemId(groups, 'missing')).toBe('a')
})

test('selects the next same-group item after removal', () => {
  expect(chooseSelectionAfterRemoval(groups, 'a')).toBe('b')
})

test('falls back to the next globally visible item', () => {
  expect(chooseSelectionAfterRemoval(groups, 'b')).toBe('a')
  expect(chooseSelectionAfterRemoval(groups, 'c')).toBe('b')
})

test('detects normalized draft changes', () => {
  const current = entry('a', 'Default')
  expect(isWatchlistDraftDirty(current, '', '')).toBe(false)
  expect(isWatchlistDraftDirty(current, 'Core', '')).toBe(true)
  expect(isWatchlistDraftDirty({ ...current, note: 'A' }, '', 'B')).toBe(true)
})
```

- [ ] **Step 3: Write research action tests**

Create `watchlist-actions.test.ts`:

```ts
import { describe, expect, mock, test } from 'bun:test'
import type { StockWatchlistItem } from '@craft-agent/shared/stock'
import { startWatchlistResearch } from '../watchlist-actions'

const item: StockWatchlistItem = {
  id: 'watch-1',
  symbol: {
    input: '00700.HK',
    symbol: '00700',
    market: 'HK',
    exchange: 'HK',
    displaySymbol: '00700.HK',
    currency: 'HKD',
  },
  groupName: 'Observe',
  note: null,
  createdAt: 1,
  updatedAt: 1,
}

test('starts research with the selected display symbol', async () => {
  const createStockResearchRun = mock(async () => ({
    runId: 'run-1',
    sessionId: 'session-1',
    symbol: item.symbol,
    steps: [],
  }))
  const refreshSessions = mock(async () => {})
  const navigateToSession = mock(() => {})

  await startWatchlistResearch({
    workspaceId: 'workspace-1',
    item,
    createStockResearchRun,
    refreshSessions,
    navigateToSession,
  })

  expect(createStockResearchRun).toHaveBeenCalledWith('workspace-1', {
    symbol: '00700.HK',
  })
  expect(refreshSessions).toHaveBeenCalledWith('session-1')
  expect(navigateToSession).toHaveBeenCalledWith('session-1')
})
```

- [ ] **Step 4: Run helper tests and verify red**

Run:

```powershell
bun test apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-grouping.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-page-state.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-actions.test.ts
```

Expected: FAIL with missing module errors.

- [ ] **Step 5: Implement grouping helpers**

Create `watchlist-grouping.ts`:

```ts
import type { StockWatchlistItem } from '@craft-agent/shared/stock'

export const UNGROUPED_STORAGE_NAME = 'Default'

export interface WatchlistGroup {
  storageName: string
  displayName: string
  items: StockWatchlistItem[]
}

export function toEditableGroupName(groupName: string): string {
  return groupName === UNGROUPED_STORAGE_NAME ? '' : groupName
}

export function getWatchlistGroupOptions(items: StockWatchlistItem[]): string[] {
  return [...new Set(
    items
      .map(item => item.groupName.trim())
      .filter(groupName => groupName && groupName !== UNGROUPED_STORAGE_NAME),
  )].sort((left, right) => left.localeCompare(right))
}

export function filterWatchlistItems(
  items: StockWatchlistItem[],
  query: string,
): StockWatchlistItem[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return items

  return items.filter(item => [
    item.symbol.symbol,
    item.symbol.displaySymbol,
    item.symbol.market,
    item.groupName,
    item.note ?? '',
  ].some(value => value.toLowerCase().includes(normalized)))
}

export function groupWatchlistItems(
  items: StockWatchlistItem[],
  ungroupedLabel: string,
): WatchlistGroup[] {
  const groups = new Map<string, StockWatchlistItem[]>()
  for (const item of items) {
    const groupItems = groups.get(item.groupName) ?? []
    groupItems.push(item)
    groups.set(item.groupName, groupItems)
  }

  return [...groups.entries()]
    .map(([storageName, groupItems]) => ({
      storageName,
      displayName: storageName === UNGROUPED_STORAGE_NAME ? ungroupedLabel : storageName,
      items: [...groupItems].sort((left, right) => right.createdAt - left.createdAt),
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
}
```

- [ ] **Step 6: Implement page-state helpers**

Create `watchlist-page-state.ts`:

```ts
import type { StockWatchlistItem } from '@craft-agent/shared/stock'
import { toEditableGroupName, type WatchlistGroup } from './watchlist-grouping'

function flatten(groups: WatchlistGroup[]): StockWatchlistItem[] {
  return groups.flatMap(group => group.items)
}

export function chooseInitialWatchlistItemId(
  groups: WatchlistGroup[],
  currentId: string | null,
): string | null {
  const items = flatten(groups)
  if (currentId && items.some(item => item.id === currentId)) return currentId
  return items[0]?.id ?? null
}

export function chooseSelectionAfterRemoval(
  groups: WatchlistGroup[],
  removedId: string,
): string | null {
  const group = groups.find(candidate => candidate.items.some(item => item.id === removedId))
  if (group) {
    const index = group.items.findIndex(item => item.id === removedId)
    const sameGroup = group.items.filter(item => item.id !== removedId)
    if (sameGroup.length > 0) {
      return sameGroup[Math.min(index, sameGroup.length - 1)]?.id ?? null
    }
  }

  const all = flatten(groups)
  const index = all.findIndex(item => item.id === removedId)
  const remaining = all.filter(item => item.id !== removedId)
  if (remaining.length === 0) return null
  return remaining[Math.min(Math.max(index, 0), remaining.length - 1)]?.id ?? null
}

export function isWatchlistDraftDirty(
  item: StockWatchlistItem,
  groupName: string,
  note: string,
): boolean {
  return toEditableGroupName(item.groupName) !== groupName.trim()
    || (item.note ?? '') !== note
}
```

- [ ] **Step 7: Implement the research action wrapper**

Create `watchlist-actions.ts`:

```ts
import type {
  CreateStockResearchRunRequest,
  CreateStockResearchRunResult,
  StockWatchlistItem,
} from '../../shared/types'
import { startStockResearch } from '@/stock-research/start-stock-research'

interface StartWatchlistResearchOptions {
  workspaceId: string
  item: StockWatchlistItem
  createStockResearchRun: (
    workspaceId: string,
    request: CreateStockResearchRunRequest,
  ) => Promise<CreateStockResearchRunResult>
  refreshSessions: (sessionId: string) => Promise<void>
  navigateToSession: (sessionId: string) => void
}

export function startWatchlistResearch(
  options: StartWatchlistResearchOptions,
): Promise<CreateStockResearchRunResult> {
  return startStockResearch({
    workspaceId: options.workspaceId,
    symbol: options.item.symbol.displaySymbol,
    createStockResearchRun: options.createStockResearchRun,
    refreshSessions: options.refreshSessions,
    navigateToSession: options.navigateToSession,
  })
}
```

- [ ] **Step 8: Run helper tests and typecheck**

Run:

```powershell
bun test apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-grouping.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-page-state.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-actions.test.ts
cd apps/electron; bun run typecheck
cd ..\..
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add apps/electron/src/renderer/stock-watchlist
git commit -m "Add watchlist renderer helpers"
```

## Task 4: Add the Watchlist Route and Navigation State

**Files:**
- Modify: `apps/electron/src/shared/routes.ts`
- Modify: `apps/electron/src/shared/types.ts`
- Modify: `apps/electron/src/shared/route-parser.ts`
- Modify: `apps/electron/src/renderer/contexts/NavigationContext.tsx`
- Modify: `apps/electron/src/renderer/lib/nav-helpers.ts`
- Test: `apps/electron/src/shared/__tests__/route-parser-watchlist.test.ts`
- Test: `apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts`

- [ ] **Step 1: Write watchlist route tests**

Create `route-parser-watchlist.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRouteToNavigationState,
} from '../route-parser'
import { routes } from '../routes'

describe('route-parser: watchlist routes', () => {
  it('builds the watchlist route', () => {
    expect(routes.view.watchlist()).toBe('watchlist')
  })

  it('parses watchlist as a navigator-only route', () => {
    expect(parseCompoundRoute('watchlist')).toEqual({
      navigator: 'watchlist',
      details: null,
    })
  })

  it('converts watchlist route to navigation state', () => {
    expect(parseRouteToNavigationState('watchlist')).toEqual({
      navigator: 'watchlist',
      details: null,
    })
  })

  it('roundtrips watchlist navigation state', () => {
    expect(buildRouteFromNavigationState({
      navigator: 'watchlist',
      details: null,
    })).toBe('watchlist')
  })

  it('roundtrips the compound route', () => {
    expect(buildCompoundRoute(parseCompoundRoute('watchlist')!)).toBe('watchlist')
  })
})
```

Add to `nav-helpers.test.ts`:

```ts
  it('treats watchlist as navigator-only', () => {
    expect(isDetailNavState({ navigator: 'watchlist', details: null })).toBe(false)
  })
```

- [ ] **Step 2: Run route tests and verify red**

Run:

```powershell
bun test apps/electron/src/shared/__tests__/route-parser-watchlist.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts
```

Expected: FAIL because watchlist navigation support is missing.

- [ ] **Step 3: Add the route builder**

In `apps/electron/src/shared/routes.ts` under `routes.view`:

```ts
    /** StockCraft watchlist */
    watchlist: () => 'watchlist' as const,
```

- [ ] **Step 4: Add the navigation state**

In `apps/electron/src/shared/types.ts`:

```ts
export interface WatchlistNavigationState {
  navigator: 'watchlist'
  details: null
  rightSidebar?: RightSidebarPanel
}
```

Add it to `NavigationState`, then add:

```ts
export const isWatchlistNavigation = (
  state: NavigationState
): state is WatchlistNavigationState => state.navigator === 'watchlist'
```

Add history key handling:

```ts
  if (state.navigator === 'watchlist') return 'watchlist'
```

```ts
  if (key === 'watchlist') return { navigator: 'watchlist', details: null }
```

- [ ] **Step 5: Teach the route parser**

In `apps/electron/src/shared/route-parser.ts`:

```ts
export type NavigatorType =
  | 'sessions'
  | 'sources'
  | 'skills'
  | 'automations'
  | 'settings'
  | 'reports'
  | 'watchlist'
```

Add `'watchlist'` to `COMPOUND_ROUTE_PREFIXES`.

Add the same navigator-only branches used for Reports to:

- `parseCompoundRoute`
- `buildCompoundRoute`
- `convertCompoundToViewRoute`
- `convertCompoundToNavigationState`
- `convertParsedRouteToNavigationState`
- `navigationStateToCompoundRoute`

Each branch returns:

```ts
{ navigator: 'watchlist', details: null }
```

and the parsed view form:

```ts
{ type: 'view', name: 'watchlist', params: {} }
```

- [ ] **Step 6: Export the type guard and handle detail mode**

Re-export `isWatchlistNavigation` from:

`apps/electron/src/renderer/contexts/NavigationContext.tsx`.

In `apps/electron/src/renderer/lib/nav-helpers.ts`, return `false` for watchlist just as Reports does.

- [ ] **Step 7: Run route regression tests and typecheck**

Run:

```powershell
bun test apps/electron/src/shared/__tests__/route-parser-watchlist.test.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-history-key.test.ts apps/electron/src/renderer/contexts/__tests__/navigation-reconcile.test.ts
cd apps/electron; bun run typecheck
cd ..\..
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/electron/src/shared apps/electron/src/renderer/contexts/NavigationContext.tsx apps/electron/src/renderer/lib/nav-helpers.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts
git commit -m "Add watchlist route"
```

## Task 5: Build the Add and Remove Dialogs

**Files:**
- Create: `apps/electron/src/renderer/stock-watchlist/AddWatchlistItemDialog.tsx`
- Create: `apps/electron/src/renderer/stock-watchlist/RemoveWatchlistItemDialog.tsx`

- [ ] **Step 1: Create the Add dialog**

Create `AddWatchlistItemDialog.tsx` with this public contract:

```ts
interface AddWatchlistItemDialogProps {
  open: boolean
  workspaceId: string
  groupOptions: string[]
  onOpenChange: (open: boolean) => void
  onAdded: (item: StockWatchlistItem) => void
}
```

Implement these exact behaviors:

- Local state: `symbol`, `groupName`, `note`, `submitting`, `error`.
- Reset state only when the dialog closes.
- Render `Input` for symbol.
- Render `Input list="watchlist-group-options"` for group and a `<datalist>` from `groupOptions`.
- Render `Textarea` for optional note.
- On submit:

```ts
const item = await window.electronAPI.addStockWatchlistItem(workspaceId, {
  symbol: symbol.trim(),
  groupName: groupName.trim() || null,
  note: note.trim() || null,
})
onAdded(item)
onOpenChange(false)
```

- Preserve values and show `error instanceof Error ? error.message : t('watchlist.addError')` on failure.
- Disable submit when `symbol.trim()` is empty or while submitting.

- [ ] **Step 2: Create the Remove confirmation dialog**

Create `RemoveWatchlistItemDialog.tsx` with:

```ts
interface RemoveWatchlistItemDialogProps {
  open: boolean
  workspaceId: string
  item: StockWatchlistItem | null
  onOpenChange: (open: boolean) => void
  onRemoved: (id: string) => void
}
```

Use the existing `Dialog` components. On confirmation:

```ts
const result = await window.electronAPI.removeStockWatchlistItem(
  workspaceId,
  item.id,
)
if (!result.success) {
  throw new Error(t('watchlist.removeError'))
}
onRemoved(item.id)
onOpenChange(false)
```

Keep the dialog open and display the error when removal fails.

- [ ] **Step 3: Typecheck**

Run:

```powershell
cd apps/electron; bun run typecheck
cd ..\..
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add apps/electron/src/renderer/stock-watchlist/AddWatchlistItemDialog.tsx apps/electron/src/renderer/stock-watchlist/RemoveWatchlistItemDialog.tsx
git commit -m "Add watchlist dialogs"
```

## Task 6: Render the Watchlist Page and Sidebar Entry

**Files:**
- Create: `apps/electron/src/renderer/pages/WatchlistPage.tsx`
- Modify: `apps/electron/src/renderer/pages/index.ts`
- Modify: `apps/electron/src/renderer/context/AppShellContext.tsx`
- Modify: `apps/electron/src/renderer/components/app-shell/AppShell.tsx`
- Modify: `apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx`
- Modify: all files under `packages/shared/src/i18n/locales/*.json`

- [ ] **Step 1: Expose the session refresh callback through context**

Add to `AppShellContextType`:

```ts
  refreshStockResearchSession?: (sessionId: string) => Promise<void>
```

Add it to `appShellContextValue` in `AppShell.tsx`:

```ts
    refreshStockResearchSession,
```

and include the callback in the memo dependency list.

- [ ] **Step 2: Create `WatchlistPage` state and loading**

Create `WatchlistPage.tsx` with:

```ts
interface WatchlistPageProps {
  workspaceId: string
}
```

Use:

```ts
const { navigateToSession } = useNavigation()
const { refreshStockResearchSession } = useAppShellContext()
```

State must include:

```ts
const [items, setItems] = React.useState<StockWatchlistItem[]>([])
const [itemsWorkspaceId, setItemsWorkspaceId] = React.useState<string | null>(null)
const [selectedId, setSelectedId] = React.useState<string | null>(null)
const [query, setQuery] = React.useState('')
const [draftGroup, setDraftGroup] = React.useState('')
const [draftNote, setDraftNote] = React.useState('')
const [listLoading, setListLoading] = React.useState(false)
const [listError, setListError] = React.useState<string | null>(null)
const [saving, setSaving] = React.useState(false)
const [researching, setResearching] = React.useState(false)
const [addOpen, setAddOpen] = React.useState(false)
const [removeOpen, setRemoveOpen] = React.useState(false)
const [refreshKey, setRefreshKey] = React.useState(0)
```

On `workspaceId` change, clear list/selection/drafts/errors before loading.

Load with:

```ts
window.electronAPI.listStockWatchlistItems(workspaceId)
```

and ignore stale results in the effect cleanup.

- [ ] **Step 3: Derive groups and selection**

Derive:

```ts
const currentItems = itemsWorkspaceId === workspaceId ? items : []
const filteredItems = filterWatchlistItems(currentItems, query)
const groups = groupWatchlistItems(filteredItems, t('watchlist.ungrouped'))
const groupOptions = getWatchlistGroupOptions(currentItems)
const selectedItem = currentItems.find(item => item.id === selectedId) ?? null
```

Use `chooseInitialWatchlistItemId(groups, selectedId)` whenever groups change.

When `selectedItem` changes, reset drafts:

```ts
setDraftGroup(toEditableGroupName(selectedItem.groupName))
setDraftNote(selectedItem.note ?? '')
```

- [ ] **Step 4: Implement add, edit, remove, and research handlers**

Add:

```ts
const handleAdded = React.useCallback((item: StockWatchlistItem) => {
  setItems(current => {
    const remaining = current.filter(candidate => candidate.id !== item.id)
    return [item, ...remaining]
  })
  setSelectedId(item.id)
}, [])
```

Save:

```ts
const handleSave = async () => {
  if (!selectedItem || saving) return
  setSaving(true)
  try {
    const updated = await window.electronAPI.updateStockWatchlistItem(
      workspaceId,
      selectedItem.id,
      {
        groupName: draftGroup.trim() || null,
        note: draftNote.trim() || null,
      },
    )
    setItems(current => current.map(item => item.id === updated.id ? updated : item))
    toast.success(t('watchlist.saved'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('watchlist.saveError'))
  } finally {
    setSaving(false)
  }
}
```

Remove:

```ts
const handleRemoved = (removedId: string) => {
  const nextId = chooseSelectionAfterRemoval(
    groupWatchlistItems(currentItems, t('watchlist.ungrouped')),
    removedId,
  )
  setItems(current => current.filter(item => item.id !== removedId))
  setSelectedId(nextId)
}
```

Research:

```ts
const handleStartResearch = async () => {
  if (!selectedItem || !refreshStockResearchSession || researching) return
  setResearching(true)
  try {
    await startWatchlistResearch({
      workspaceId,
      item: selectedItem,
      createStockResearchRun: window.electronAPI.createStockResearchRun,
      refreshSessions: refreshStockResearchSession,
      navigateToSession,
    })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('watchlist.researchError'))
  } finally {
    setResearching(false)
  }
}
```

- [ ] **Step 5: Render the approved two-pane layout**

The page must render:

- Left fixed-width pane:
  - title/count
  - Add button
  - Search input
  - loading/error/retry/empty states
  - group headings and entry buttons
- Right flexible pane:
  - no-selection state
  - symbol metadata
  - Start Research and Remove buttons
  - group `Input` with the same datalist
  - note `Textarea`
  - Cancel and Save changes buttons

Use:

```ts
const dirty = selectedItem
  ? isWatchlistDraftDirty(selectedItem, draftGroup, draftNote)
  : false
```

Disable Save when `!dirty || saving`.

Render the dialogs at the page root:

```tsx
<AddWatchlistItemDialog
  open={addOpen}
  workspaceId={workspaceId}
  groupOptions={groupOptions}
  onOpenChange={setAddOpen}
  onAdded={handleAdded}
/>
<RemoveWatchlistItemDialog
  open={removeOpen}
  workspaceId={workspaceId}
  item={selectedItem}
  onOpenChange={setRemoveOpen}
  onRemoved={handleRemoved}
/>
```

- [ ] **Step 6: Wire the page into navigation**

Export from `apps/electron/src/renderer/pages/index.ts`:

```ts
export { default as WatchlistPage } from './WatchlistPage'
```

In `MainContentPanel.tsx`, import `isWatchlistNavigation` and `WatchlistPage`, then add before Reports:

```tsx
  if (isWatchlistNavigation(navState)) {
    return wrapWithStoplight(
      <Panel variant="grow" className={className}>
        <WatchlistPage workspaceId={activeWorkspaceId || ''} />
      </Panel>
    )
  }
```

In `AppShell.tsx`:

- Import `Star` or `ListStar` from `lucide-react`.
- Import `isWatchlistNavigation`.
- Add:

```ts
const handleWatchlistClick = useCallback(() => {
  navigate(routes.view.watchlist())
}, [navigate])
```

- Add `nav:watchlist` to keyboard/navigation actions.
- Return `t('sidebar.watchlist')` from `listTitle`.
- Place Watchlist immediately before Reports in the sidebar items.

- [ ] **Step 7: Add locale keys**

Add these keys to every locale file with appropriate translations:

```json
"sidebar.watchlist": "Watchlist",
"watchlist.add": "Add",
"watchlist.addDescription": "Add an A-share, Hong Kong, or US stock.",
"watchlist.addError": "Failed to add watchlist item.",
"watchlist.cancel": "Cancel",
"watchlist.confirmRemove": "Remove this watchlist item?",
"watchlist.empty": "No watchlist items yet.",
"watchlist.group": "Group",
"watchlist.groupPlaceholder": "Select or type a group",
"watchlist.loadError": "Failed to load watchlist.",
"watchlist.note": "Note",
"watchlist.notePlaceholder": "Optional research note",
"watchlist.remove": "Remove",
"watchlist.removeError": "Failed to remove watchlist item.",
"watchlist.researchError": "Failed to start stock research.",
"watchlist.retry": "Retry",
"watchlist.save": "Save changes",
"watchlist.saveError": "Failed to save watchlist item.",
"watchlist.saved": "Watchlist item saved.",
"watchlist.search": "Search symbol, group, or note",
"watchlist.startResearch": "Start Research",
"watchlist.symbol": "Stock symbol",
"watchlist.ungrouped": "Ungrouped"
```

Use natural translations for all locales; do not leave English fallback strings in non-English locale files.

- [ ] **Step 8: Run focused tests, typecheck, and i18n checks**

Run:

```powershell
bun test apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-grouping.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-page-state.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-actions.test.ts apps/electron/src/shared/__tests__/route-parser-watchlist.test.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts
cd apps/electron; bun run typecheck
cd ..\..
bun run sort-locales
bun run lint:i18n:sorted
bun run lint:i18n:parity
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add apps/electron/src/renderer/pages/WatchlistPage.tsx apps/electron/src/renderer/pages/index.ts apps/electron/src/renderer/stock-watchlist apps/electron/src/renderer/context/AppShellContext.tsx apps/electron/src/renderer/components/app-shell/AppShell.tsx apps/electron/src/renderer/components/app-shell/MainContentPanel.tsx packages/shared/src/i18n/locales
git commit -m "Add stock watchlist page"
```

## Task 7: Final Verification and Persistent Records

**Files:**
- Modify: `feature_list.json`
- Modify: `claude-progress.md`

- [ ] **Step 1: Run the complete focused Watchlist suite**

Run:

```powershell
bun test packages/server-core/src/stock/stock-storage.test.ts packages/server-core/src/handlers/rpc/stock-research.test.ts packages/shared/src/protocol/__tests__/routing.test.ts apps/electron/src/shared/__tests__/ipc-channels.test.ts apps/electron/src/main/handlers/__tests__/registration.test.ts apps/electron/src/main/handlers/__tests__/registration-profiles.test.ts apps/electron/src/shared/__tests__/route-parser-watchlist.test.ts apps/electron/src/shared/__tests__/route-parser-reports.test.ts apps/electron/src/shared/__tests__/route-parser-automations.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-grouping.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-page-state.test.ts apps/electron/src/renderer/stock-watchlist/__tests__/watchlist-actions.test.ts apps/electron/src/renderer/stock-research/__tests__/start-stock-research.test.ts apps/electron/src/renderer/lib/__tests__/nav-helpers.test.ts
```

Expected: PASS with zero failures.

- [ ] **Step 2: Run typechecks**

Run:

```powershell
bun run typecheck:shared
cd packages/server-core; bun run typecheck
cd ..\..\apps\electron; bun run typecheck
cd ..\..
```

Expected: all PASS.

- [ ] **Step 3: Run startup, i18n, JSON, and diff validation**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
bun run lint:i18n:sorted
bun run lint:i18n:parity
python -m json.tool feature_list.json
git diff --check
```

Expected: all exit with code 0.

- [ ] **Step 4: Update `feature_list.json`**

Set `stock-004.status` to `passing` only after all verification succeeds.

Add evidence recording:

- Atomic update RPC and conflict protection.
- Independent Watchlist route and sidebar entry.
- Grouping, filtering, sorting, add/edit/remove behavior.
- Direct Stock Research launch.
- Exact focused test counts and typecheck/i18n/startup results.

- [ ] **Step 5: Update `claude-progress.md`**

Append a session entry containing:

- Completed behavior.
- Exact commands and results.
- Remaining blockers.
- Next highest-priority feature, if any.
- Current branch and whether it has been pushed.

- [ ] **Step 6: Re-run record validation**

Run:

```powershell
python -m json.tool feature_list.json
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\init.ps1
```

Expected: PASS.

- [ ] **Step 7: Commit records**

```powershell
git add feature_list.json claude-progress.md
git commit -m "记录 Watchlist 验收"
```

- [ ] **Step 8: Confirm clean state**

Run:

```powershell
git status --short --branch
git log --oneline -5
```

Expected: clean worktree on `codex/stock-004-watchlist`.

## Plan Self-Review

- Spec coverage: includes standalone navigation, grouped list, Add with existing/new group, optional notes, canonical `Default` compatibility, atomic editing, duplicate conflicts, confirmed removal, direct research launch, workspace isolation, and full verification.
- TDD ordering: storage, RPC, helpers, and route behavior all begin with failing tests.
- Type consistency: `UpdateStockWatchlistItemRequest`, `updateWatchlistItem`, `updateStockWatchlistItem`, and `UPDATE_WATCHLIST_ITEM` are used consistently.
- Scope discipline: no group table, live prices, drag ordering, bulk actions, import/export, or new React DOM harness.
- No placeholders remain.
