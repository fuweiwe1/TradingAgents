import { expect, test } from 'bun:test'
import type { StockWatchlistItem } from '@craft-agent/shared/stock'

import {
  chooseInitialWatchlistItemId,
  chooseSelectionAfterRemoval,
  isWatchlistDraftDirty,
} from '../watchlist-page-state'
import type { WatchlistGroup } from '../watchlist-grouping'

function entry(
  id: string,
  groupName: string,
  note: string | null = null,
): StockWatchlistItem {
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
    note,
    createdAt: 1,
    updatedAt: 1,
  }
}

const groups: WatchlistGroup[] = [
  {
    storageName: 'Core',
    displayName: 'Core',
    items: [entry('a', 'Core'), entry('b', 'Core')],
  },
  {
    storageName: 'Observe',
    displayName: 'Observe',
    items: [entry('c', 'Observe')],
  },
]

test('preserves the current selection when it is visible', () => {
  expect(chooseInitialWatchlistItemId(groups, 'b')).toBe('b')
})

test('chooses the first visible item when the current selection is missing', () => {
  expect(chooseInitialWatchlistItemId(groups, 'missing')).toBe('a')
  expect(chooseInitialWatchlistItemId([], 'missing')).toBeNull()
})

test('chooses a deterministic same-group selection after removal', () => {
  expect(chooseSelectionAfterRemoval(groups, 'a')).toBe('b')
  expect(chooseSelectionAfterRemoval(groups, 'b')).toBe('a')
})

test('falls back deterministically across visible groups after removal', () => {
  expect(chooseSelectionAfterRemoval(groups, 'c')).toBe('b')
  expect(chooseSelectionAfterRemoval([
    {
      storageName: 'Only',
      displayName: 'Only',
      items: [entry('only', 'Only')],
    },
  ], 'only')).toBeNull()
})

test('compares trimmed editable groups and exact note values', () => {
  const ungrouped = entry('a', 'Default')
  expect(isWatchlistDraftDirty(ungrouped, '', '')).toBe(false)
  expect(isWatchlistDraftDirty(ungrouped, '   ', '')).toBe(false)
  expect(isWatchlistDraftDirty(entry('a', 'Core'), '  Core  ', '')).toBe(false)
  expect(isWatchlistDraftDirty(ungrouped, 'Core', '')).toBe(true)
  expect(isWatchlistDraftDirty(entry('a', 'Default', 'A'), '', 'A')).toBe(false)
  expect(isWatchlistDraftDirty(entry('a', 'Default', 'A'), '', ' A ')).toBe(true)
})
