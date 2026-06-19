import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import type {
  AddStockWatchlistItemRequest,
  CreateStockResearchRunRequest,
  CreateStockResearchRunResult,
  RemoveStockWatchlistItemResult,
  SaveStockResearchReportRequest,
  StockResearchReport,
  StockWatchlistItem,
  UpdateStockWatchlistItemRequest,
} from '@craft-agent/shared/protocol'
import {
  buildResearchSessionName,
  buildStockResearchPrompt,
  parseStockSymbol,
  STOCK_RESEARCH_STEPS,
} from '@craft-agent/shared/stock'
import type { RpcServer } from '@craft-agent/server-core/transport'
import type { HandlerDeps } from '../handler-deps'

export const HANDLED_CHANNELS = [
  RPC_CHANNELS.stockResearch.CREATE_RUN,
  RPC_CHANNELS.stockResearch.ADD_WATCHLIST_ITEM,
  RPC_CHANNELS.stockResearch.LIST_WATCHLIST_ITEMS,
  RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM,
  RPC_CHANNELS.stockResearch.REMOVE_WATCHLIST_ITEM,
  RPC_CHANNELS.stockResearch.SAVE_REPORT,
  RPC_CHANNELS.stockResearch.LIST_REPORTS,
  RPC_CHANNELS.stockResearch.GET_REPORT,
] as const

export function registerStockResearchHandlers(server: RpcServer, deps: HandlerDeps): void {
  server.handle(
    RPC_CHANNELS.stockResearch.CREATE_RUN,
    async (
      _ctx,
      workspaceId: string,
      request: CreateStockResearchRunRequest,
    ): Promise<CreateStockResearchRunResult> => {
      const symbol = parseStockSymbol(request.symbol)
      const session = await deps.sessionManager.createSession(workspaceId, {
        name: buildResearchSessionName(symbol),
      })

      await deps.sessionManager.sendMessage(
        session.id,
        buildStockResearchPrompt(symbol),
      )
      const run = requireStockStorage(deps).createResearchRun({
        sessionId: session.id,
        symbol,
      })

      return {
        runId: run.id,
        sessionId: session.id,
        symbol,
        steps: STOCK_RESEARCH_STEPS,
      }
    },
  )

  server.handle(
    RPC_CHANNELS.stockResearch.ADD_WATCHLIST_ITEM,
    async (
      _ctx,
      _workspaceId: string,
      request: AddStockWatchlistItemRequest,
    ): Promise<StockWatchlistItem> => {
      return requireStockStorage(deps).addWatchlistItem({
        symbol: parseStockSymbol(request.symbol),
        groupName: request.groupName,
        note: request.note,
      })
    },
  )

  server.handle(
    RPC_CHANNELS.stockResearch.LIST_WATCHLIST_ITEMS,
    async (): Promise<StockWatchlistItem[]> => {
      return requireStockStorage(deps).listWatchlistItems()
    },
  )

  server.handle(
    RPC_CHANNELS.stockResearch.UPDATE_WATCHLIST_ITEM,
    async (
      _ctx,
      _workspaceId: string,
      id: string,
      request: UpdateStockWatchlistItemRequest,
    ): Promise<StockWatchlistItem> => {
      return requireStockStorage(deps).updateWatchlistItem(id, request)
    },
  )

  server.handle(
    RPC_CHANNELS.stockResearch.REMOVE_WATCHLIST_ITEM,
    async (
      _ctx,
      _workspaceId: string,
      id: string,
    ): Promise<RemoveStockWatchlistItemResult> => {
      return { success: requireStockStorage(deps).removeWatchlistItem(id) }
    },
  )

  server.handle(
    RPC_CHANNELS.stockResearch.SAVE_REPORT,
    async (
      _ctx,
      _workspaceId: string,
      request: SaveStockResearchReportRequest,
    ): Promise<StockResearchReport> => {
      return requireStockStorage(deps).saveResearchReport(request)
    },
  )

  server.handle(
    RPC_CHANNELS.stockResearch.LIST_REPORTS,
    async (): Promise<StockResearchReport[]> => {
      return requireStockStorage(deps).listResearchReports()
    },
  )

  server.handle(
    RPC_CHANNELS.stockResearch.GET_REPORT,
    async (
      _ctx,
      _workspaceId: string,
      id: string,
    ): Promise<StockResearchReport> => {
      return requireStockStorage(deps).getResearchReport(id)
    },
  )
}

function requireStockStorage(deps: HandlerDeps) {
  if (!deps.stockStorage) {
    throw new Error('Stock storage is not configured')
  }
  return deps.stockStorage
}
