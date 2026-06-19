import { describe, expect, test } from 'bun:test'
import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import type { HandlerFn, RpcServer } from '../../transport/types'
import { registerStockResearchHandlers } from './stock-research'

function createHarness() {
  const handlers = new Map<string, HandlerFn>()
  const calls: Array<{ method: string; args: unknown[] }> = []
  const storageState = {
    watchlist: [
      {
        id: 'watchlist-1',
        symbol: { displaySymbol: 'AAPL', market: 'US' },
        groupName: 'Default',
        note: null,
      },
    ],
    reports: [
      {
        id: 'report-1',
        runId: 'run-1',
        title: 'AAPL Research Report',
        symbol: { displaySymbol: 'AAPL', market: 'US' },
        rating: 'neutral',
        riskLevel: 'medium',
        summary: 'Balanced setup.',
        contentMarkdown: '# AAPL',
      },
    ],
  }
  const sessionManager = {
    async createSession(workspaceId: string, options: unknown) {
      calls.push({ method: 'createSession', args: [workspaceId, options] })
      return { id: 'session-1', workspaceId, name: (options as { name?: string }).name }
    },
    async sendMessage(sessionId: string, message: string) {
      calls.push({ method: 'sendMessage', args: [sessionId, message] })
    },
  }
  const stockStorage = {
    createResearchRun(input: unknown) {
      calls.push({ method: 'createResearchRun', args: [input] })
      return {
        id: 'run-1',
        sessionId: (input as { sessionId: string }).sessionId,
        symbol: (input as { symbol: unknown }).symbol,
        status: 'created',
      }
    },
    addWatchlistItem(input: unknown) {
      calls.push({ method: 'addWatchlistItem', args: [input] })
      return { id: 'watchlist-2', ...(input as object) }
    },
    listWatchlistItems() {
      calls.push({ method: 'listWatchlistItems', args: [] })
      return storageState.watchlist
    },
    updateWatchlistItem(id: string, input: unknown) {
      calls.push({ method: 'updateWatchlistItem', args: [id, input] })
      return { ...storageState.watchlist[0], ...(input as object) }
    },
    removeWatchlistItem(id: string) {
      calls.push({ method: 'removeWatchlistItem', args: [id] })
      return true
    },
    listResearchReports() {
      calls.push({ method: 'listResearchReports', args: [] })
      return storageState.reports
    },
    getResearchReport(id: string) {
      calls.push({ method: 'getResearchReport', args: [id] })
      return storageState.reports[0]
    },
  }
  const server: RpcServer = {
    handle(channel, handler) { handlers.set(channel, handler) },
    push() {},
    async invokeClient() { return undefined },
    hasClientCapability() { return false },
    findClientsWithCapability() { return [] },
  }

  registerStockResearchHandlers(server, {
    sessionManager,
    stockStorage,
    platform: { logger: console },
  } as any)

  const createRun = handlers.get(RPC_CHANNELS.stockResearch.CREATE_RUN)
  if (!createRun) throw new Error('stock research handler not registered')
  const addWatchlistItem = handlers.get(RPC_CHANNELS.stockResearch.ADD_WATCHLIST_ITEM)
  const listWatchlistItems = handlers.get(RPC_CHANNELS.stockResearch.LIST_WATCHLIST_ITEMS)
  const updateWatchlistItem = handlers.get(RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM)
  const removeWatchlistItem = handlers.get(RPC_CHANNELS.stockResearch.REMOVE_WATCHLIST_ITEM)
  const listReports = handlers.get(RPC_CHANNELS.stockResearch.LIST_REPORTS)
  const getReport = handlers.get(RPC_CHANNELS.stockResearch.GET_REPORT)
  return {
    createRun,
    addWatchlistItem,
    listWatchlistItems,
    updateWatchlistItem,
    removeWatchlistItem,
    listReports,
    getReport,
    calls,
  }
}

describe('stock research RPC handlers', () => {
  const acceptedSymbols = [
    {
      input: '600519',
      expectedSymbol: { displaySymbol: '600519.SH', market: 'CN' },
      expectedSessionName: 'Stock Research: 600519.SH',
    },
    {
      input: '00700.HK',
      expectedSymbol: { displaySymbol: '00700.HK', market: 'HK' },
      expectedSessionName: 'Stock Research: 00700.HK',
    },
    {
      input: 'AAPL',
      expectedSymbol: { displaySymbol: 'AAPL', market: 'US' },
      expectedSessionName: 'Stock Research: AAPL',
    },
  ] as const

  for (const { input, expectedSymbol, expectedSessionName } of acceptedSymbols) {
    test(`creates one Craft session and sends the five-step prompt for ${input}`, async () => {
      const { createRun, calls } = createHarness()
      const result = await createRun({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', { symbol: input })

      expect(result).toMatchObject({
        runId: 'run-1',
        sessionId: 'session-1',
        symbol: expectedSymbol,
        steps: [
          { key: 'data_collection' },
          { key: 'analyst_views' },
          { key: 'bull_bear_debate' },
          { key: 'risk_review' },
          { key: 'report_generation' },
        ],
      })
      expect(calls[0]).toEqual({
        method: 'createSession',
        args: ['workspace-1', { name: expectedSessionName }],
      })
      expect(calls[1]?.method).toBe('sendMessage')
      expect(calls[1]?.args[0]).toBe('session-1')
      expect(String(calls[1]?.args[1])).toContain(expectedSymbol.displaySymbol)
      expect(String(calls[1]?.args[1])).toContain('报告生成')
      expect(calls[2]).toEqual({
        method: 'createResearchRun',
        args: [{ sessionId: 'session-1', symbol: expect.objectContaining(expectedSymbol) }],
      })
    })
  }

  test('rejects invalid stock symbols before creating a session', async () => {
    const { createRun, calls } = createHarness()
    await expect(createRun({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', { symbol: 'bad input' })).rejects.toThrow('Unsupported stock symbol')
    expect(calls).toEqual([])
  })

  test('registers watchlist and report storage handlers', async () => {
    const {
      addWatchlistItem,
      listWatchlistItems,
      updateWatchlistItem,
      removeWatchlistItem,
      listReports,
      getReport,
      calls,
    } = createHarness()

    expect(addWatchlistItem).toBeFunction()
    expect(listWatchlistItems).toBeFunction()
    expect(updateWatchlistItem).toBeFunction()
    expect(removeWatchlistItem).toBeFunction()
    expect(listReports).toBeFunction()
    expect(getReport).toBeFunction()

    await expect(addWatchlistItem!({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', {
      symbol: 'AAPL',
      groupName: 'Default',
      note: 'Track earnings',
    })).resolves.toMatchObject({
      id: 'watchlist-2',
      symbol: { displaySymbol: 'AAPL' },
      groupName: 'Default',
      note: 'Track earnings',
    })
    await expect(listWatchlistItems!({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1')).resolves.toMatchObject([
      { id: 'watchlist-1', symbol: { displaySymbol: 'AAPL' } },
    ])
    const updateRequest = {
      groupName: 'Growth',
      note: 'Updated thesis',
    }
    await expect(updateWatchlistItem!({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', 'watchlist-1', updateRequest)).resolves.toMatchObject({
      id: 'watchlist-1',
      symbol: { displaySymbol: 'AAPL' },
      groupName: 'Growth',
      note: 'Updated thesis',
    })
    await expect(removeWatchlistItem!({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', 'watchlist-1')).resolves.toEqual({ success: true })
    await expect(listReports!({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1')).resolves.toMatchObject([
      { id: 'report-1', title: 'AAPL Research Report' },
    ])
    await expect(getReport!({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', 'report-1')).resolves.toMatchObject({
      id: 'report-1',
      contentMarkdown: '# AAPL',
    })

    expect(calls.map((call) => call.method)).toContain('addWatchlistItem')
    expect(calls.map((call) => call.method)).toContain('listWatchlistItems')
    expect(calls).toContainEqual({
      method: 'updateWatchlistItem',
      args: ['watchlist-1', updateRequest],
    })
    expect(calls.map((call) => call.method)).toContain('removeWatchlistItem')
    expect(calls.map((call) => call.method)).toContain('listResearchReports')
    expect(calls.map((call) => call.method)).toContain('getResearchReport')
  })
})
