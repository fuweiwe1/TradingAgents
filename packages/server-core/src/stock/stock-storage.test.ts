import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { parseStockSymbol } from '@craft-agent/shared/stock'
import { StockStorageService } from './stock-storage-bun'

function createService() {
  const dir = mkdtempSync(join(tmpdir(), 'stock-storage-'))
  return new StockStorageService({ databasePath: join(dir, 'stockcraft.sqlite') })
}

describe('StockStorageService', () => {
  test('initializes the stock schema on first open', () => {
    const service = createService()

    expect(service.listTables()).toEqual([
      'research_reports',
      'research_runs',
      'research_steps',
      'stock_symbols',
      'watchlist_items',
    ])

    service.close()
  })

  test('adds, lists, and removes watchlist items without duplicating symbols', () => {
    const service = createService()
    const symbol = parseStockSymbol('600519')

    const item = service.addWatchlistItem({
      symbol,
      groupName: 'Core',
      note: 'Initial note',
    })
    const duplicate = service.addWatchlistItem({
      symbol,
      groupName: 'Core',
      note: 'Updated note',
    })

    expect(duplicate.id).toBe(item.id)
    expect(service.listWatchlistItems()).toMatchObject([
      {
        id: item.id,
        groupName: 'Core',
        note: 'Updated note',
        symbol: { displaySymbol: '600519.SH' },
      },
    ])

    expect(service.removeWatchlistItem(item.id)).toBe(true)
    expect(service.listWatchlistItems()).toEqual([])

    service.close()
  })

  test('updates a watchlist note without changing its group', () => {
    const service = createService()
    const item = service.addWatchlistItem({
      symbol: parseStockSymbol('AAPL'),
      groupName: 'Core',
      note: 'Original note',
    })

    expect(service.updateWatchlistItem(item.id, {
      note: 'Updated note',
    })).toMatchObject({
      id: item.id,
      groupName: 'Core',
      note: 'Updated note',
    })

    service.close()
  })

  test('moves a watchlist item between named groups without changing its note', () => {
    const service = createService()
    const item = service.addWatchlistItem({
      symbol: parseStockSymbol('AAPL'),
      groupName: 'Core',
      note: 'Original note',
    })

    expect(service.updateWatchlistItem(item.id, {
      groupName: 'Observe',
    })).toMatchObject({
      id: item.id,
      groupName: 'Observe',
      note: 'Original note',
    })

    service.close()
  })

  test('normalizes a blank watchlist group and clears a null note', () => {
    const service = createService()
    const item = service.addWatchlistItem({
      symbol: parseStockSymbol('AAPL'),
      groupName: 'Core',
      note: 'Original note',
    })

    expect(service.updateWatchlistItem(item.id, {
      groupName: '  ',
      note: null,
    })).toMatchObject({
      id: item.id,
      groupName: 'Default',
      note: null,
    })

    service.close()
  })

  test('rejects a duplicate symbol and target group without changing either item', () => {
    const service = createService()
    const symbol = parseStockSymbol('AAPL')
    const core = service.addWatchlistItem({
      symbol,
      groupName: 'Core',
      note: 'Core note',
    })
    const growth = service.addWatchlistItem({
      symbol,
      groupName: 'Growth',
      note: 'Growth note',
    })

    expect(() => service.updateWatchlistItem(growth.id, {
      groupName: 'Core',
      note: 'Should not persist',
    })).toThrow('Watchlist item already exists in group Core')

    expect(service.listWatchlistItems()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: growth.id,
        groupName: 'Growth',
        note: 'Growth note',
      }),
      expect.objectContaining({
        id: core.id,
        groupName: 'Core',
        note: 'Core note',
      }),
    ]))

    service.close()
  })

  test('rejects updating an unknown watchlist item', () => {
    const service = createService()

    expect(() => service.updateWatchlistItem('missing', {
      note: 'No-op',
    })).toThrow('Watchlist item not found: missing')

    service.close()
  })

  test('creates research runs with five pending steps and stores reports', () => {
    const service = createService()
    const symbol = parseStockSymbol('AAPL')

    const run = service.createResearchRun({ sessionId: 'session-1', symbol })
    const steps = service.listResearchSteps(run.id)

    expect(run).toMatchObject({
      sessionId: 'session-1',
      status: 'created',
      symbol: { displaySymbol: 'AAPL' },
    })
    expect(steps.map((step) => step.status)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
    ])

    const report = service.saveResearchReport({
      runId: run.id,
      title: 'AAPL Research Report',
      rating: 'neutral',
      riskLevel: 'medium',
      summary: 'Balanced setup.',
      contentMarkdown: '# AAPL\n\nFor research only. Not investment advice.',
    })

    expect(service.listResearchReports()).toMatchObject([
      {
        id: report.id,
        runId: run.id,
        sessionId: 'session-1',
        title: 'AAPL Research Report',
        symbol: { displaySymbol: 'AAPL' },
      },
    ])
    expect(service.getResearchReport(report.id)).toMatchObject({
      sessionId: 'session-1',
      contentMarkdown: expect.stringContaining('Not investment advice'),
    })

    const updatedReport = service.saveResearchReport({
      runId: run.id,
      title: 'AAPL Updated Research Report',
      rating: 'buy',
      riskLevel: 'low',
      summary: 'Updated setup.',
      contentMarkdown: '# Updated AAPL',
    })
    expect(updatedReport.id).toBe(report.id)
    expect(service.listResearchReports()).toHaveLength(1)
    expect(service.getResearchReport(report.id)).toMatchObject({
      title: 'AAPL Updated Research Report',
      summary: 'Updated setup.',
    })

    service.close()
  })

  test('finds research runs by session and persists failure/running transitions', () => {
    const service = createService()
    const run = service.createResearchRun({
      sessionId: 'session-status',
      symbol: parseStockSymbol('AAPL'),
    })

    expect(service.getResearchRunBySessionId('session-status')).toMatchObject({
      id: run.id,
      status: 'created',
    })
    expect(service.getResearchRunBySessionId('missing')).toBeNull()

    expect(service.markResearchRunRunning(run.id)).toMatchObject({
      status: 'running',
      errorMessage: null,
      startedAt: expect.any(Number),
    })
    expect(service.markResearchPersistenceFailed(
      run.id,
      '缺少章节：报告生成',
    )).toMatchObject({
      status: 'failed',
      errorMessage: '缺少章节：报告生成',
    })
    expect(service.markResearchRunRunning(run.id)).toMatchObject({
      status: 'running',
      errorMessage: null,
    })

    service.close()
  })

  test('atomically completes steps and upserts one report per research run', () => {
    const service = createService()
    const run = service.createResearchRun({
      sessionId: 'session-complete',
      symbol: parseStockSymbol('AAPL'),
    })
    const steps = {
      data_collection: 'Data output',
      analyst_views: 'Analyst output',
      bull_bear_debate: 'Debate output',
      risk_review: 'Risk output',
      report_generation: 'Final output',
    } as const

    const firstReport = service.saveCompletedResearch({
      runId: run.id,
      title: 'AAPL 研究报告',
      rating: null,
      riskLevel: '中',
      summary: 'First summary',
      contentMarkdown: '# First',
      steps,
    })

    expect(service.getResearchRunBySessionId('session-complete')).toMatchObject({
      id: run.id,
      status: 'completed',
      completedAt: expect.any(Number),
      errorMessage: null,
    })
    expect(service.listResearchSteps(run.id)).toMatchObject([
      { stepKey: 'data_collection', status: 'completed', outputMarkdown: 'Data output' },
      { stepKey: 'analyst_views', status: 'completed', outputMarkdown: 'Analyst output' },
      { stepKey: 'bull_bear_debate', status: 'completed', outputMarkdown: 'Debate output' },
      { stepKey: 'risk_review', status: 'completed', outputMarkdown: 'Risk output' },
      { stepKey: 'report_generation', status: 'completed', outputMarkdown: 'Final output' },
    ])

    const updatedReport = service.saveCompletedResearch({
      runId: run.id,
      title: 'AAPL 研究报告',
      rating: 'neutral',
      riskLevel: '低',
      summary: 'Updated summary',
      contentMarkdown: '# Updated',
      steps: {
        ...steps,
        report_generation: 'Updated final output',
      },
    })

    expect(updatedReport.id).toBe(firstReport.id)
    expect(service.listResearchReports()).toHaveLength(1)
    expect(service.getResearchReport(firstReport.id)).toMatchObject({
      rating: 'neutral',
      riskLevel: '低',
      summary: 'Updated summary',
      contentMarkdown: '# Updated',
    })
    expect(service.listResearchSteps(run.id).at(-1)).toMatchObject({
      outputMarkdown: 'Updated final output',
    })

    service.close()
  })
})
