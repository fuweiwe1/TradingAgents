import type { CreateStockResearchRunRequest, CreateStockResearchRunResult } from '../../shared/types'

interface StartStockResearchOptions {
  workspaceId: string
  symbol: string
  createStockResearchRun: (
    workspaceId: string,
    request: CreateStockResearchRunRequest,
  ) => Promise<CreateStockResearchRunResult>
  refreshSessions: (sessionId: string) => Promise<void>
  navigateToSession: (sessionId: string) => void
}

export async function startStockResearch({
  workspaceId,
  symbol,
  createStockResearchRun,
  refreshSessions,
  navigateToSession,
}: StartStockResearchOptions): Promise<CreateStockResearchRunResult> {
  const normalizedSymbol = symbol.trim()
  if (!normalizedSymbol) {
    throw new Error('请输入股票代码')
  }

  const result = await createStockResearchRun(workspaceId, { symbol: normalizedSymbol })
  await refreshSessions(result.sessionId)
  navigateToSession(result.sessionId)
  return result
}
