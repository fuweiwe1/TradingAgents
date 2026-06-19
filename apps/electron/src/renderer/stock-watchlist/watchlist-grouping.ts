import type { StockWatchlistItem } from '../../shared/types'

export const UNGROUPED_STORAGE_NAME = 'Default'

export interface WatchlistGroup {
  storageName: string
  displayName: string
  items: StockWatchlistItem[]
}

function compareNames(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function toEditableGroupName(groupName: string): string {
  return groupName === UNGROUPED_STORAGE_NAME ? '' : groupName
}

export function getWatchlistGroupOptions(items: StockWatchlistItem[]): string[] {
  return [...new Set(
    items
      .map(item => item.groupName.trim())
      .filter(groupName => groupName && groupName !== UNGROUPED_STORAGE_NAME),
  )].sort(compareNames)
}

export function filterWatchlistItems(
  items: StockWatchlistItem[],
  query: string,
): StockWatchlistItem[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return items
  }

  return items.filter(item => [
    item.symbol.symbol,
    item.symbol.displaySymbol,
    item.symbol.market,
    item.groupName,
    item.note ?? '',
  ].some(value => value.toLowerCase().includes(normalizedQuery)))
}

export function groupWatchlistItems(
  items: StockWatchlistItem[],
  ungroupedLabel: string,
): WatchlistGroup[] {
  const groupedItems = new Map<string, StockWatchlistItem[]>()

  for (const item of items) {
    const groupItems = groupedItems.get(item.groupName) ?? []
    groupItems.push(item)
    groupedItems.set(item.groupName, groupItems)
  }

  return [...groupedItems.entries()]
    .map(([storageName, groupItems]) => ({
      storageName,
      displayName: storageName === UNGROUPED_STORAGE_NAME ? ungroupedLabel : storageName,
      items: [...groupItems].sort((left, right) => right.createdAt - left.createdAt),
    }))
    .sort((left, right) => compareNames(left.displayName, right.displayName))
}
