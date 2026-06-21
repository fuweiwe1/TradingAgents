import { describe, expect, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { filterStockReports, sortStockReportsNewestFirst } from '../report-filtering'

function report(overrides: Partial<StockResearchReport>): StockResearchReport {
  return {
    id: 'report-1',
    runId: 'run-1',
    sessionId: 'session-1',
    title: 'AAPL Research Report',
    symbol: {
      input: 'AAPL',
      symbol: 'AAPL',
      market: 'US',
      exchange: 'US',
      displaySymbol: 'AAPL',
      currency: 'USD',
    },
    rating: 'Hold',
    riskLevel: 'Moderate',
    summary: 'Ecosystem strength with valuation risk.',
    contentMarkdown: '# AAPL',
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  }
}

describe('filterStockReports', () => {
  test('matches query against symbol, title, and summary', () => {
    const reports = [
      report({ id: 'a', title: 'Apple deep dive', symbol: { ...report({}).symbol, displaySymbol: 'AAPL', symbol: 'AAPL' } }),
      report({ id: 'b', title: 'Tencent report', symbol: { input: '00700.HK', symbol: '00700', market: 'HK', exchange: 'HK', displaySymbol: '00700.HK', currency: 'HKD' }, summary: 'Gaming and ads.' }),
      report({ id: 'c', title: 'Maotai report', symbol: { input: '600519', symbol: '600519', market: 'CN', exchange: 'SH', displaySymbol: '600519.SH', currency: 'CNY' }, summary: 'Premium baijiu moat.' }),
    ]

    expect(filterStockReports(reports, { query: 'aapl', riskLevel: 'all' }).map(r => r.id)).toEqual(['a'])
    expect(filterStockReports(reports, { query: 'gaming', riskLevel: 'all' }).map(r => r.id)).toEqual(['b'])
    expect(filterStockReports(reports, { query: 'maotai', riskLevel: 'all' }).map(r => r.id)).toEqual(['c'])
  })

  test('filters by risk level when selected', () => {
    const reports = [
      report({ id: 'low', riskLevel: 'Low' }),
      report({ id: 'high', riskLevel: 'High' }),
      report({ id: 'none', riskLevel: null }),
    ]

    expect(filterStockReports(reports, { query: '', riskLevel: 'high' }).map(r => r.id)).toEqual(['high'])
    expect(filterStockReports(reports, { query: '', riskLevel: 'all' }).map(r => r.id)).toEqual(['low', 'high', 'none'])
  })
})

describe('sortStockReportsNewestFirst', () => {
  test('sorts by createdAt descending without mutating input', () => {
    const reports = [
      report({ id: 'old', createdAt: 100 }),
      report({ id: 'new', createdAt: 300 }),
      report({ id: 'mid', createdAt: 200 }),
    ]

    expect(sortStockReportsNewestFirst(reports).map(r => r.id)).toEqual(['new', 'mid', 'old'])
    expect(reports.map(r => r.id)).toEqual(['old', 'new', 'mid'])
  })
})
