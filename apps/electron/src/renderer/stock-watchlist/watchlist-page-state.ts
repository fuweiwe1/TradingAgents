import type { StockWatchlistItem } from '../../shared/types'
import { toEditableGroupName, type WatchlistGroup } from './watchlist-grouping'

function flattenWatchlistGroups(groups: WatchlistGroup[]): StockWatchlistItem[] {
  return groups.flatMap(group => group.items)
}

export function chooseInitialWatchlistItemId(
  groups: WatchlistGroup[],
  currentId: string | null,
): string | null {
  const items = flattenWatchlistGroups(groups)
  if (currentId && items.some(item => item.id === currentId)) {
    return currentId
  }

  return items[0]?.id ?? null
}

export function chooseSelectionAfterRemoval(
  groups: WatchlistGroup[],
  removedId: string,
): string | null {
  const removedGroup = groups.find(group => group.items.some(item => item.id === removedId))

  if (removedGroup) {
    const removedIndex = removedGroup.items.findIndex(item => item.id === removedId)
    const remainingGroupItems = removedGroup.items.filter(item => item.id !== removedId)
    if (remainingGroupItems.length > 0) {
      return remainingGroupItems[
        Math.min(removedIndex, remainingGroupItems.length - 1)
      ]?.id ?? null
    }
  }

  const allItems = flattenWatchlistGroups(groups)
  const removedIndex = allItems.findIndex(item => item.id === removedId)
  const remainingItems = allItems.filter(item => item.id !== removedId)
  if (remainingItems.length === 0) {
    return null
  }

  return remainingItems[
    Math.min(Math.max(removedIndex, 0), remainingItems.length - 1)
  ]?.id ?? null
}

export function isWatchlistDraftDirty(
  item: StockWatchlistItem,
  groupName: string,
  note: string,
): boolean {
  return toEditableGroupName(item.groupName) !== groupName.trim()
    || (item.note ?? '') !== note
}
