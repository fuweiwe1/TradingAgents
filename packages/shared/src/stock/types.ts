export type StockMarket = 'CN' | 'HK' | 'US'
export type StockExchange = 'SH' | 'SZ' | 'BJ' | 'HK' | 'US'
export type StockCurrency = 'CNY' | 'HKD' | 'USD'

export interface ParsedStockSymbol {
  input: string
  symbol: string
  market: StockMarket
  exchange: StockExchange
  displaySymbol: string
  currency: StockCurrency
}

export type StockResearchStepKey =
  | 'data_collection'
  | 'analyst_views'
  | 'bull_bear_debate'
  | 'risk_review'
  | 'report_generation'

export interface StockResearchStep {
  key: StockResearchStepKey
  title: string
}

export interface CreateStockResearchRunRequest {
  symbol: string
}

export interface CreateStockResearchRunResult {
  runId: string
  sessionId: string
  symbol: ParsedStockSymbol
  steps: StockResearchStep[]
}

export type StockResearchRunStatus = 'created' | 'running' | 'completed' | 'failed' | 'cancelled'
export type StockResearchStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface StockWatchlistItem {
  id: string
  symbol: ParsedStockSymbol
  groupName: string
  note: string | null
  createdAt: number
  updatedAt: number
}

export interface AddStockWatchlistItemRequest {
  symbol: string
  groupName?: string | null
  note?: string | null
}

export interface RemoveStockWatchlistItemResult {
  success: boolean
}

export interface StockResearchRunRecord {
  id: string
  sessionId: string
  symbol: ParsedStockSymbol
  status: StockResearchRunStatus
  startedAt: number | null
  completedAt: number | null
  errorMessage: string | null
  createdAt: number
  updatedAt: number
}

export interface StockResearchStepRecord {
  id: string
  runId: string
  stepKey: StockResearchStepKey
  status: StockResearchStepStatus
  inputJson: string | null
  outputMarkdown: string | null
  outputJson: string | null
  startedAt: number | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface StockResearchReport {
  id: string
  runId: string
  title: string
  symbol: ParsedStockSymbol
  rating: string | null
  riskLevel: string | null
  summary: string
  contentMarkdown: string
  createdAt: number
  updatedAt: number
}

export interface SaveStockResearchReportRequest {
  runId: string
  title: string
  rating?: string | null
  riskLevel?: string | null
  summary: string
  contentMarkdown: string
}
