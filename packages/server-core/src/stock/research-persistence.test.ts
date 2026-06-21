import { describe, expect, test } from 'bun:test'
import { parseStockSymbol } from '@craft-agent/shared/stock'
import { StockResearchPersistenceCoordinator } from './research-persistence'

const VALID_REPORT = `## 数据收集

Data

## 分析师观点

Views

## 牛熊辩论

Debate

## 风险审查

风险等级：中

Risks

## 报告生成

Neutral conclusion.

本内容仅供研究参考，不构成投资建议。`

function createHarness(options?: {
  hasRun?: boolean
  content?: string
  isProcessing?: boolean
  sendError?: Error
  saveError?: Error
}) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const run = {
    id: 'run-1',
    sessionId: 'session-1',
    symbol: parseStockSymbol('AAPL'),
    status: 'failed' as const,
    startedAt: null,
    completedAt: null,
    errorMessage: 'old error',
    createdAt: 1,
    updatedAt: 1,
  }
  let listener: ((event: {
    sessionId: string
    workspaceId: string
    messageId: string
    content: string
  }) => Promise<void> | void) | undefined
  const storage = {
    getResearchRunBySessionId(sessionId: string) {
      calls.push({ method: 'getResearchRunBySessionId', args: [sessionId] })
      return options?.hasRun === false ? null : run
    },
    saveCompletedResearch(input: unknown) {
      calls.push({ method: 'saveCompletedResearch', args: [input] })
      if (options?.saveError) throw options.saveError
      return { id: 'report-1', ...(input as object) }
    },
    markResearchPersistenceFailed(runId: string, message: string) {
      calls.push({
        method: 'markResearchPersistenceFailed',
        args: [runId, message],
      })
      return { ...run, status: 'failed', errorMessage: message }
    },
    markResearchRunRunning(runId: string) {
      calls.push({ method: 'markResearchRunRunning', args: [runId] })
      return { ...run, status: 'running', errorMessage: null }
    },
  }
  const sessionManager = {
    subscribeToFinalAssistantMessage(value: typeof listener) {
      listener = value
      return () => {
        listener = undefined
      }
    },
    async getSession(sessionId: string) {
      calls.push({ method: 'getSession', args: [sessionId] })
      return {
        id: sessionId,
        isProcessing: options?.isProcessing ?? false,
        messages: [{
          id: 'assistant-1',
          role: 'assistant',
          content: options?.content ?? VALID_REPORT,
          timestamp: 2,
          isIntermediate: false,
        }],
      }
    },
    async sendMessage(sessionId: string, message: string) {
      calls.push({ method: 'sendMessage', args: [sessionId, message] })
      if (options?.sendError) throw options.sendError
    },
  }
  const coordinator = new StockResearchPersistenceCoordinator({
    storage: storage as any,
    sessionManager: sessionManager as any,
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    } as any,
  })

  return {
    calls,
    coordinator,
    getListener: () => listener,
  }
}

describe('StockResearchPersistenceCoordinator', () => {
  test('ignores final messages for sessions without a research run', async () => {
    const { coordinator, calls } = createHarness({ hasRun: false })

    await coordinator.handleFinalAssistantMessage({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messageId: 'assistant-1',
      content: VALID_REPORT,
    })

    expect(calls.map(call => call.method)).toEqual([
      'getResearchRunBySessionId',
    ])
  })

  test('automatically saves a valid final research report', async () => {
    const { coordinator, calls } = createHarness()

    await coordinator.handleFinalAssistantMessage({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messageId: 'assistant-1',
      content: VALID_REPORT,
    })

    expect(calls).toContainEqual({
      method: 'saveCompletedResearch',
      args: [expect.objectContaining({
        runId: 'run-1',
        title: 'AAPL 研究报告',
        riskLevel: '中',
        steps: expect.objectContaining({
          report_generation: expect.stringContaining('Neutral conclusion'),
        }),
      })],
    })
  })

  test('records a persistence failure for an invalid final report', async () => {
    const { coordinator, calls } = createHarness()

    await coordinator.handleFinalAssistantMessage({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messageId: 'assistant-1',
      content: 'Incomplete response',
    })

    expect(calls).toContainEqual({
      method: 'markResearchPersistenceFailed',
      args: ['run-1', '缺少章节：数据收集'],
    })
  })

  test('records a persistence failure when transactional report saving fails', async () => {
    const { coordinator, calls } = createHarness({
      saveError: new Error('database locked'),
    })

    await coordinator.handleFinalAssistantMessage({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messageId: 'assistant-1',
      content: VALID_REPORT,
    })

    expect(calls).toContainEqual({
      method: 'markResearchPersistenceFailed',
      args: ['run-1', '报告保存失败：database locked'],
    })
  })

  test('retry reparses the existing final reply before regenerating', async () => {
    const { coordinator, calls } = createHarness()

    await expect(coordinator.retry('session-1')).resolves.toEqual({
      status: 'completed',
    })
    expect(calls.map(call => call.method)).not.toContain('sendMessage')
    expect(calls.map(call => call.method)).toContain('saveCompletedResearch')
  })

  test('retry sends a repair prompt when the existing reply is incomplete', async () => {
    const { coordinator, calls } = createHarness({
      content: 'Incomplete response',
    })

    await expect(coordinator.retry('session-1')).resolves.toEqual({
      status: 'regenerating',
    })
    expect(calls).toContainEqual({
      method: 'markResearchRunRunning',
      args: ['run-1'],
    })
    expect(calls).toContainEqual({
      method: 'sendMessage',
      args: [
        'session-1',
        expect.stringContaining('## 报告生成'),
      ],
    })
  })

  test('retry does not enqueue another repair while processing', async () => {
    const { coordinator, calls } = createHarness({
      content: 'Incomplete response',
      isProcessing: true,
    })

    await expect(coordinator.retry('session-1')).resolves.toEqual({
      status: 'running',
    })
    expect(calls.map(call => call.method)).not.toContain('sendMessage')
  })

  test('retry restores failure state when background repair sending fails', async () => {
    const { coordinator, calls } = createHarness({
      content: 'Incomplete response',
      sendError: new Error('send failed'),
    })

    await expect(coordinator.retry('session-1')).resolves.toEqual({
      status: 'regenerating',
    })
    await Bun.sleep(0)
    expect(calls).toContainEqual({
      method: 'markResearchPersistenceFailed',
      args: ['run-1', '重新生成报告失败：send failed'],
    })
  })

  test('start subscribes the coordinator and returns an unsubscribe function', async () => {
    const { coordinator, getListener } = createHarness()

    const stop = coordinator.start()
    expect(getListener()).toBeFunction()
    stop()
    expect(getListener()).toBeUndefined()
  })
})
