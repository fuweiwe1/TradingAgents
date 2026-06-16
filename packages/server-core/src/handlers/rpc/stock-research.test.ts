import { describe, expect, test } from 'bun:test'
import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import type { HandlerFn, RpcServer } from '../../transport/types'
import { registerStockResearchHandlers } from './stock-research'

function createHarness() {
  const handlers = new Map<string, HandlerFn>()
  const calls: Array<{ method: string; args: unknown[] }> = []
  const sessionManager = {
    async createSession(workspaceId: string, options: unknown) {
      calls.push({ method: 'createSession', args: [workspaceId, options] })
      return { id: 'session-1', workspaceId, name: (options as { name?: string }).name }
    },
    async sendMessage(sessionId: string, message: string) {
      calls.push({ method: 'sendMessage', args: [sessionId, message] })
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
    platform: { logger: console },
  } as any)

  const createRun = handlers.get(RPC_CHANNELS.stockResearch.CREATE_RUN)
  if (!createRun) throw new Error('stock research handler not registered')
  return { createRun, calls }
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
    })
  }

  test('rejects invalid stock symbols before creating a session', async () => {
    const { createRun, calls } = createHarness()
    await expect(createRun({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', { symbol: 'bad input' })).rejects.toThrow('Unsupported stock symbol')
    expect(calls).toEqual([])
  })
})
