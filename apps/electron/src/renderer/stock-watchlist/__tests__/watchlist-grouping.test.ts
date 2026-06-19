import { describe, expect, test } from 'bun:test'
import type { StockWatchlistItem } from '@craft-agent/shared/stock'

import {
  filterWatchlistItems,
  getWatchlistGroupOptions,
  groupWatchlistItems,
  toEditableGroupName,
} from '../watchlist-grouping'

function item(overrides: Partial<StockWatchlistItem> = {}): StockWatchlistItem {
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
  test('groups by storage name and displays Default with the caller label', () => {
    const groups = groupWatchlistItems([
      item({ id: 'core', groupName: 'Core' }),
      item({ id: 'ungrouped', groupName: 'Default' }),
    ], '未分组')

    expect(groups).toEqual([
      expect.objectContaining({
        storageName: 'Core',
        displayName: 'Core',
      }),
      expect.objectContaining({
        storageName: 'Default',
        displayName: '未分组',
      }),
    ])
  })

  test('sorts groups by display name and group items by createdAt descending', () => {
    const groups = groupWatchlistItems([
      item({ id: 'core-old', groupName: 'Core', createdAt: 100 }),
      item({ id: 'ungrouped', groupName: 'Default', createdAt: 300 }),
      item({ id: 'core-new', groupName: 'Core', createdAt: 200 }),
      item({ id: 'observe', groupName: 'Observe', createdAt: 400 }),
    ], '未分组')

    expect(groups.map(group => group.displayName)).toEqual(['Core', 'Observe', '未分组'])
    expect(groups[0]?.items.map(entry => entry.id)).toEqual(['core-new', 'core-old'])
  })

  test('de-duplicates and sorts group options without exposing Default', () => {
    expect(getWatchlistGroupOptions([
      item({ groupName: 'Observe' }),
      item({ id: '2', groupName: 'Default' }),
      item({ id: '3', groupName: 'Core' }),
      item({ id: '4', groupName: 'Observe' }),
      item({ id: '5', groupName: '  Core  ' }),
      item({ id: '6', groupName: '   ' }),
    ])).toEqual(['Core', 'Observe'])
  })

  test('represents the Default storage group as an empty editable group', () => {
    expect(toEditableGroupName('Default')).toBe('')
    expect(toEditableGroupName('Core')).toBe('Core')
  })

  test('searches symbol, display symbol, market, group, and note case-insensitively', () => {
    const items = [
      item({
        id: 'apple',
        groupName: 'Core Holdings',
        note: 'Services Growth',
      }),
      item({
        id: 'tencent',
        groupName: 'Observe',
        symbol: {
          input: '00700.HK',
          symbol: '00700',
          market: 'HK',
          exchange: 'HK',
          displaySymbol: '00700.HK',
          currency: 'HKD',
        },
        note: 'Gaming Recovery',
      }),
    ]

    expect(filterWatchlistItems(items, 'aApL').map(entry => entry.id)).toEqual(['apple'])
    expect(filterWatchlistItems(items, '00700.hK').map(entry => entry.id)).toEqual(['tencent'])
    expect(filterWatchlistItems(items, 'hk').map(entry => entry.id)).toEqual(['tencent'])
    expect(filterWatchlistItems(items, 'CORE HOLDINGS').map(entry => entry.id)).toEqual(['apple'])
    expect(filterWatchlistItems(items, 'gaming recovery').map(entry => entry.id)).toEqual(['tencent'])
  })
})
