import type { StockResearchReport } from '@craft-agent/shared/stock'
import { buildStockReportFilename, formatStockReportMarkdown } from './report-export'

export type NavigateToSession = (sessionId: string) => void
export type DownloadMarkdown = (filename: string, markdown: string) => void

export function openStockReportSession(
  report: StockResearchReport,
  navigateToSession: NavigateToSession,
): void {
  navigateToSession(report.sessionId)
}

export function exportStockReportMarkdown(
  report: StockResearchReport,
  download: DownloadMarkdown,
): void {
  download(buildStockReportFilename(report), formatStockReportMarkdown(report))
}

export function downloadMarkdownFile(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  let appended = false
  try {
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    appended = true
    anchor.click()
  } finally {
    if (appended) {
      anchor.remove()
    }
    URL.revokeObjectURL(url)
  }
}
