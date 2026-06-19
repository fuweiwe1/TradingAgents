import type {
  CreateStockResearchRunRequest,
  CreateStockResearchRunResult,
  StockWatchlistItem,
} from '../../shared/types'
import { startStockResearch } from '../stock-research/start-stock-research'

interface StartWatchlistResearchOptions {
  workspaceId: string
  item: StockWatchlistItem
  createStockResearchRun: (
    workspaceId: string,
    request: CreateStockResearchRunRequest,
  ) => Promise<CreateStockResearchRunResult>
  refreshSessions: (sessionId: string) => Promise<void>
  navigateToSession: (sessionId: string) => void
}

export function startWatchlistResearch(
  options: StartWatchlistResearchOptions,
): Promise<CreateStockResearchRunResult> {
  return startStockResearch({
    workspaceId: options.workspaceId,
    symbol: options.item.symbol.displaySymbol,
    createStockResearchRun: options.createStockResearchRun,
    refreshSessions: options.refreshSessions,
    navigateToSession: options.navigateToSession,
  })
}
