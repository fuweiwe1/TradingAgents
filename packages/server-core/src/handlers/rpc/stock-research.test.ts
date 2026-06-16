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
  test('creates one Craft session and sends the five-step prompt', async () => {
    const { createRun, calls } = createHarness()
    const result = await createRun({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', { symbol: 'AAPL' })

    expect(result).toMatchObject({
      sessionId: 'session-1',
      symbol: { displaySymbol: 'AAPL', market: 'US' },
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
      args: ['workspace-1', { name: 'Stock Research: AAPL' }],
    })
    expect(calls[1]?.method).toBe('sendMessage')
    expect(String(calls[1]?.args[1])).toContain('报告生成')
  })

  test('rejects invalid stock symbols before creating a session', async () => {
    const { createRun, calls } = createHarness()
    await expect(createRun({ clientId: 'client-1', workspaceId: 'workspace-1', webContentsId: null }, 'workspace-1', { symbol: 'bad input' })).rejects.toThrow('Unsupported stock symbol')
    expect(calls).toEqual([])
  })
})
