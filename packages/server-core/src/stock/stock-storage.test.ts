import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { parseStockSymbol } from '@craft-agent/shared/stock'
import { StockStorageService } from './stock-storage'

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

    service.close()
  })
})
