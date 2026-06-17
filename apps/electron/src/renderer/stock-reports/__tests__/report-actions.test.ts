import { describe, expect, mock, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { exportStockReportMarkdown, openStockReportSession } from '../report-actions'

function report(): StockResearchReport {
  return {
    id: 'report-1',
    runId: 'run-1',
    sessionId: 'session-1',
    title: 'AAPL Research Report',
    symbol: { input: 'AAPL', symbol: 'AAPL', market: 'US', exchange: 'US', displaySymbol: 'AAPL', currency: 'USD' },
    rating: 'Hold',
    riskLevel: 'Moderate',
    summary: 'Summary',
    contentMarkdown: '## Body',
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('openStockReportSession', () => {
  test('navigates to the linked session', () => {
    const navigateToSession = mock(() => {})
    openStockReportSession(report(), navigateToSession)
    expect(navigateToSession).toHaveBeenCalledWith('session-1')
  })
})

describe('exportStockReportMarkdown', () => {
  test('formats and downloads the selected report', () => {
    const download = mock(() => {})
    exportStockReportMarkdown(report(), download)
    expect(download).toHaveBeenCalledWith(
      'AAPL-aapl-research-report.md',
      expect.stringContaining('# AAPL Research Report'),
    )
  })
})
