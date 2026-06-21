export type WatchlistDomainError = 'conflict' | 'not-found'

const WATCHLIST_CONFLICT_PREFIX = 'Watchlist item already exists in group '
const WATCHLIST_NOT_FOUND_PREFIX = 'Watchlist item not found: '

export function classifyWatchlistError(error: unknown): WatchlistDomainError | null {
  if (!(error instanceof Error)) return null
  if (error.message.startsWith(WATCHLIST_CONFLICT_PREFIX)) return 'conflict'
  if (error.message.startsWith(WATCHLIST_NOT_FOUND_PREFIX)) return 'not-found'
  return null
}