import * as React from 'react'
import { Download, ExternalLink, RefreshCw, Search } from 'lucide-react'
import type { StockResearchReport } from '@craft-agent/shared/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Markdown } from '@/components/markdown'
import { useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'
import {
  filterStockReports,
  sortStockReportsNewestFirst,
  type StockReportFilters,
} from '@/stock-reports/report-filtering'
import { downloadMarkdownFile, exportStockReportMarkdown, openStockReportSession } from '@/stock-reports/report-actions'
import { chooseInitialReportId, shouldLoadReportDetail } from '@/stock-reports/report-page-state'
import { toast } from 'sonner'

interface ReportsPageProps {
  workspaceId: string
}

const reportDisclaimer = 'For research only. Not investment advice.'

function formatReportDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function reportRiskOptions(reports: StockResearchReport[]): string[] {
  return [...new Set(reports.map(report => report.riskLevel?.trim()).filter(Boolean) as string[])]
    .sort((left, right) => left.localeCompare(right))
}

function ReportMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 px-3 py-2">
      <div className="text-[11px] uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm text-foreground">{value}</div>
    </div>
  )
}

export default function ReportsPage({ workspaceId }: ReportsPageProps) {
  const { navigateToSession } = useNavigation()
  const [reports, setReports] = React.useState<StockResearchReport[]>([])
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<StockResearchReport | null>(null)
  const [loadedReportId, setLoadedReportId] = React.useState<string | null>(null)
  const [listLoading, setListLoading] = React.useState(false)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [listError, setListError] = React.useState<string | null>(null)
  const [detailError, setDetailError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<StockReportFilters>({ query: '', riskLevel: 'all' })
  const [refreshKey, setRefreshKey] = React.useState(0)

  React.useEffect(() => {
    if (!workspaceId) {
      setReports([])
      setSelectedReportId(null)
      setDetail(null)
      setLoadedReportId(null)
      setListLoading(false)
      setListError(null)
      return
    }

    let stale = false
    setListLoading(true)
    setListError(null)

    window.electronAPI.listStockResearchReports(workspaceId)
      .then((items) => {
        if (stale) return
        setReports(items)
      })
      .catch((error) => {
        if (stale) return
        setReports([])
        setListError(error instanceof Error ? error.message : 'Failed to load reports.')
      })
      .finally(() => {
        if (!stale) setListLoading(false)
      })

    return () => {
      stale = true
    }
  }, [workspaceId, refreshKey])

  const visibleReports = React.useMemo(() => {
    return sortStockReportsNewestFirst(filterStockReports(reports, filters))
  }, [reports, filters])

  const riskOptions = React.useMemo(() => reportRiskOptions(reports), [reports])

  React.useEffect(() => {
    const nextReportId = chooseInitialReportId(visibleReports, selectedReportId)
    if (nextReportId !== selectedReportId) {
      setSelectedReportId(nextReportId)
    }
  }, [visibleReports, selectedReportId])

  React.useEffect(() => {
    if (!selectedReportId) {
      setDetail(null)
      setLoadedReportId(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }

    if (!workspaceId || !shouldLoadReportDetail(selectedReportId, loadedReportId)) {
      return
    }

    let stale = false
    setDetailLoading(true)
    setDetailError(null)

    window.electronAPI.getStockResearchReport(workspaceId, selectedReportId)
      .then((report) => {
        if (stale) return
        setDetail(report)
        setLoadedReportId(report.id)
      })
      .catch((error) => {
        if (stale) return
        setDetail(null)
        setLoadedReportId(null)
        setDetailError(error instanceof Error ? error.message : 'Failed to load report detail.')
      })
      .finally(() => {
        if (!stale) setDetailLoading(false)
      })

    return () => {
      stale = true
    }
  }, [workspaceId, selectedReportId, loadedReportId])

  const handleOpenSession = React.useCallback(() => {
    if (!detail) return
    openStockReportSession(detail, navigateToSession)
  }, [detail, navigateToSession])

  const handleExportMarkdown = React.useCallback(() => {
    if (!detail) return
    try {
      exportStockReportMarkdown(detail, downloadMarkdownFile)
    } catch (error) {
      toast.error('Failed to export report.', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }, [detail])

  const listEmpty = !listLoading && !listError && reports.length === 0
  const filterEmpty = !listLoading && !listError && reports.length > 0 && visibleReports.length === 0
  const detailEmpty = !detailLoading && !detailError && !detail

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <section className="flex w-[340px] min-w-[280px] max-w-[420px] flex-col border-r border-border/70">
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">Reports</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {visibleReports.length} of {reports.length}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRefreshKey(key => key + 1)}
              disabled={!workspaceId || listLoading}
              aria-label="Refresh reports"
            >
              <RefreshCw className={cn('h-4 w-4', listLoading && 'animate-spin')} />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.query}
                onChange={(event) => setFilters(current => ({ ...current, query: event.target.value }))}
                placeholder="Search reports"
                className="h-8 pl-8 text-sm"
              />
            </div>
            <select
              value={filters.riskLevel}
              onChange={(event) => setFilters(current => ({ ...current, riskLevel: event.target.value }))}
              className="h-8 rounded-md border border-foreground/15 bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
              aria-label="Risk filter"
            >
              <option value="all">All risk</option>
              {riskOptions.map((risk) => (
                <option key={risk} value={risk}>{risk}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!workspaceId && (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Select a workspace to view reports.
            </div>
          )}
          {workspaceId && listLoading && (
            <div className="px-4 py-6 text-sm text-muted-foreground">Loading reports...</div>
          )}
          {workspaceId && listError && (
            <div className="px-4 py-6 text-sm text-destructive">{listError}</div>
          )}
          {workspaceId && listEmpty && (
            <div className="px-4 py-6 text-sm text-muted-foreground">No stock research reports yet.</div>
          )}
          {workspaceId && filterEmpty && (
            <div className="px-4 py-6 text-sm text-muted-foreground">No reports match the current filters.</div>
          )}
          {workspaceId && visibleReports.map((report) => {
            const selected = report.id === selectedReportId
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className={cn(
                  'block w-full border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/30',
                  selected && 'bg-foreground/[0.05]',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{report.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{report.symbol.displaySymbol}</span>
                      <span>{report.symbol.market}</span>
                      <span>{formatReportDate(report.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {report.riskLevel ?? 'Risk n/a'}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{report.summary}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="min-w-0 flex-1 overflow-y-auto">
        {detailLoading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading report detail...
          </div>
        )}
        {detailError && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
            {detailError}
          </div>
        )}
        {detailEmpty && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Select a report to view details.
          </div>
        )}
        {detail && !detailLoading && !detailError && (
          <article className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-7">
            <header className="border-b border-border/70 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    {detail.symbol.displaySymbol} / {detail.symbol.market}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">{detail.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{formatReportDate(detail.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenSession}>
                    <ExternalLink className="h-4 w-4" />
                    Open Session
                  </Button>
                  <Button type="button" size="sm" onClick={handleExportMarkdown}>
                    <Download className="h-4 w-4" />
                    Export MD
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <ReportMetaPill label="Symbol" value={detail.symbol.displaySymbol} />
                <ReportMetaPill label="Market" value={detail.symbol.market} />
                <ReportMetaPill label="Rating" value={detail.rating ?? 'Unrated'} />
                <ReportMetaPill label="Risk" value={detail.riskLevel ?? 'Unspecified'} />
              </div>
            </header>

            <section>
              <h3 className="text-sm font-semibold">Summary</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{detail.summary}</p>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Full Markdown</h3>
              <div className="mt-3 border-t border-border/70 pt-4">
                <Markdown className="max-w-none text-sm leading-6">
                  {detail.contentMarkdown}
                </Markdown>
              </div>
            </section>

            <footer className="border-t border-border/70 pt-4 text-xs text-muted-foreground">
              {reportDisclaimer}
            </footer>
          </article>
        )}
      </section>
    </div>
  )
}
