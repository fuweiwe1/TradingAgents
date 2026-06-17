import type { StockResearchReport } from '@craft-agent/shared/stock'
import { sortStockReportsNewestFirst } from './report-filtering'

export function chooseInitialReportId(
  visibleReports: StockResearchReport[],
  currentReportId: string | null,
): string | null {
  if (currentReportId && visibleReports.some(report => report.id === currentReportId)) {
    return currentReportId
  }
  return sortStockReportsNewestFirst(visibleReports)[0]?.id ?? null
}

export function shouldLoadReportDetail(
  selectedReportId: string | null,
  loadedReportId: string | null,
): boolean {
  return Boolean(selectedReportId) && selectedReportId !== loadedReportId
}
