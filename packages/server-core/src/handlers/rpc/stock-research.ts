import { RPC_CHANNELS } from '@craft-agent/shared/protocol'
import type {
  CreateStockResearchRunRequest,
  CreateStockResearchRunResult,
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

      return {
        sessionId: session.id,
        symbol,
        steps: STOCK_RESEARCH_STEPS,
      }
    },
  )
}
