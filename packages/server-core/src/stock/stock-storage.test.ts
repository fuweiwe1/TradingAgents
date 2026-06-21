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

    service.close()
  })
})
