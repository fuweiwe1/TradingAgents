import type { StockResearchReport } from '@craft-agent/shared/stock'

const DISCLAIMER = 'For research only. Not investment advice.'

export function formatStockReportMarkdown(report: StockResearchReport): string {
  const metadata = [
    `- Symbol: ${report.symbol.displaySymbol}`,
    `- Market: ${report.symbol.market}`,
    `- Currency: ${report.symbol.currency}`,
    `- Rating: ${report.rating ?? 'Unrated'}`,
    `- Risk level: ${report.riskLevel ?? 'Unspecified'}`,
    `- Created: ${new Date(report.createdAt).toISOString()}`,
  ].join('\n')

  return [
    `# ${report.title}`,
    '',
    '## Stock',
    '',
    metadata,
    '',
    '## Summary',
    '',
    report.summary,
    '',
    report.contentMarkdown.trim(),
    '',
    '## Disclaimer',
    '',
    DISCLAIMER,
    '',
  ].join('\n')
}

export function buildStockReportFilename(report: StockResearchReport): string {
  const titleSlug = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  const symbolSlug = report.symbol.displaySymbol
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${symbolSlug}-${titleSlug || 'report'}.md`
}
