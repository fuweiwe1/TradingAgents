import { describe, expect, it, mock } from 'bun:test'

import { startStockResearch } from '../start-stock-research'

describe('startStockResearch', () => {
  it('creates a stock research run, refreshes sessions, and navigates to the created session', async () => {
    const createStockResearchRun = mock(async () => ({
      sessionId: 'session-stock-1',
      symbol: {
        input: 'aapl',
        symbol: 'AAPL',
        market: 'US' as const,
        exchange: 'US' as const,
        displaySymbol: 'AAPL',
        currency: 'USD' as const,
      },
      steps: [],
    }))
    const refreshSessions = mock(async () => {})
    const navigateToSession = mock(() => {})

    const result = await startStockResearch({
      workspaceId: 'workspace-1',
      symbol: ' aapl ',
      createStockResearchRun,
      refreshSessions,
      navigateToSession,
    })

    expect(createStockResearchRun).toHaveBeenCalledWith('workspace-1', { symbol: 'aapl' })
    expect(refreshSessions).toHaveBeenCalledWith('session-stock-1')
    expect(navigateToSession).toHaveBeenCalledWith('session-stock-1')
    expect(result.sessionId).toBe('session-stock-1')
  })

  it('rejects blank symbols before invoking the backend', async () => {
    const createStockResearchRun = mock(async () => {
      throw new Error('should not be called')
    })

    await expect(startStockResearch({
      workspaceId: 'workspace-1',
      symbol: '   ',
      createStockResearchRun,
      refreshSessions: async () => {},
      navigateToSession: () => {},
    })).rejects.toThrow('请输入股票代码')

    expect(createStockResearchRun).not.toHaveBeenCalled()
  })
})
