import { describe, expect, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { chooseInitialReportId, shouldLoadReportDetail } from '../report-page-state'

const report = (id: string, createdAt: number): StockResearchReport => ({
  id,
  runId: `run-${id}`,
  sessionId: `session-${id}`,
  title: `${id} report`,
  symbol: { input: id, symbol: id, market: 'US', exchange: 'US', displaySymbol: id, currency: 'USD' },
  rating: null,
  riskLevel: null,
  summary: '',
  contentMarkdown: '',
  createdAt,
  updatedAt: createdAt,
})

describe('chooseInitialReportId', () => {
  test('keeps current selection when it still exists', () => {
    expect(chooseInitialReportId([report('a', 1), report('b', 2)], 'a')).toBe('a')
  })

  test('selects newest visible report when current selection is missing', () => {
    expect(chooseInitialReportId([report('old', 1), report('new', 3)], 'missing')).toBe('new')
  })

  test('returns null for empty lists', () => {
    expect(chooseInitialReportId([], 'missing')).toBeNull()
  })
})

describe('shouldLoadReportDetail', () => {
  test('loads when selected id differs from loaded detail', () => {
    expect(shouldLoadReportDetail('report-1', null)).toBe(true)
    expect(shouldLoadReportDetail('report-1', 'report-2')).toBe(true)
    expect(shouldLoadReportDetail('report-1', 'report-1')).toBe(false)
  })
})
