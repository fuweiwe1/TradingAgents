import type { StockResearchReport } from '@craft-agent/shared/stock'

export type StockReportRiskFilter = 'all' | string

export interface StockReportFilters {
  query: string
  riskLevel: StockReportRiskFilter
}

export function sortStockReportsNewestFirst(reports: StockResearchReport[]): StockResearchReport[] {
  return [...reports].sort((left, right) => right.createdAt - left.createdAt)
}

export function filterStockReports(
  reports: StockResearchReport[],
  filters: StockReportFilters,
): StockResearchReport[] {
  const query = filters.query.trim().toLowerCase()
  const riskLevel = filters.riskLevel.trim().toLowerCase()

  return reports.filter((report) => {
    const matchesQuery = query.length === 0 || [
      report.title,
      report.summary,
      report.symbol.symbol,
      report.symbol.displaySymbol,
      report.symbol.market,
    ].some((value) => value.toLowerCase().includes(query))

    const matchesRisk = riskLevel === 'all'
      || (report.riskLevel ?? '').trim().toLowerCase() === riskLevel

    return matchesQuery && matchesRisk
  })
}
