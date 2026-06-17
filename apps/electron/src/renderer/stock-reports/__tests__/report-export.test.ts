import { describe, expect, test } from 'bun:test'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { buildStockReportFilename, formatStockReportMarkdown } from '../report-export'

const report: StockResearchReport = {
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
  summary: 'Quality business with valuation risk.',
  contentMarkdown: '## Core thesis\n\nServices and ecosystem remain strong.',
  createdAt: Date.UTC(2026, 5, 17),
  updatedAt: Date.UTC(2026, 5, 17),
}

describe('formatStockReportMarkdown', () => {
  test('includes complete report metadata, content, and disclaimer', () => {
    const markdown = formatStockReportMarkdown(report)

    expect(markdown).toContain('# AAPL Research Report')
    expect(markdown).toContain('- Symbol: AAPL')
    expect(markdown).toContain('- Market: US')
    expect(markdown).toContain('- Rating: Hold')
    expect(markdown).toContain('- Risk level: Moderate')
    expect(markdown).toContain('Quality business with valuation risk.')
    expect(markdown).toContain('## Core thesis')
    expect(markdown).toContain('For research only. Not investment advice.')
  })
})

describe('buildStockReportFilename', () => {
  test('uses symbol and title in a filesystem-friendly markdown filename', () => {
    expect(buildStockReportFilename(report)).toBe('AAPL-aapl-research-report.md')
  })
})
