import { expect, mock, test } from 'bun:test'
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

test('starts research with the selected display symbol, refreshes, and navigates', async () => {
  const createStockResearchRun = mock(async () => ({
    runId: 'run-1',
    sessionId: 'session-1',
    symbol: item.symbol,
    steps: [],
  }))
  const refreshSessions = mock(async () => {})
  const navigateToSession = mock(() => {})

  const result = await startWatchlistResearch({
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
  expect(result.runId).toBe('run-1')
  expect(result.sessionId).toBe('session-1')
})
