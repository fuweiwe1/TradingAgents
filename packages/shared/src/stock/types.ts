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
  sessionId: string
  symbol: ParsedStockSymbol
  steps: StockResearchStep[]
}
