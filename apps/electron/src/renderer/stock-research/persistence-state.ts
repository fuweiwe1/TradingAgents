import type { StockResearchRunRecord } from '@craft-agent/shared/protocol'

export type StockResearchPersistenceOperation = 'load' | 'retry'

export interface StockResearchPersistenceRequestToken {
  operation: StockResearchPersistenceOperation
  contextGeneration: number
  operationGeneration: number
}

export interface StockResearchPersistenceRequestGuard {
  syncContext(workspaceId: string, sessionId: string): boolean
  begin(
    operation: StockResearchPersistenceOperation,
  ): StockResearchPersistenceRequestToken
  isCurrent(token: StockResearchPersistenceRequestToken): boolean
}

export interface PersistenceBannerState {
  visible: boolean
  canRetry: boolean
  regenerating: boolean
  message: string | null
}

export function toPersistenceBannerState(
  run: Pick<StockResearchRunRecord, 'status' | 'errorMessage'> | null,
  regenerating = false,
): PersistenceBannerState {
  if (regenerating) {
    return {
      visible: true,
      canRetry: false,
      regenerating: true,
      message: null,
    }
  }
  if (run?.status === 'failed' && run.errorMessage) {
    return {
      visible: true,
      canRetry: true,
      regenerating: false,
      message: run.errorMessage,
    }
  }
  return {
    visible: false,
    canRetry: false,
    regenerating: false,
    message: null,
  }
}

export function createStockResearchPersistenceRequestGuard(
  initialWorkspaceId: string,
  initialSessionId: string,
): StockResearchPersistenceRequestGuard {
  let workspaceId = initialWorkspaceId
  let sessionId = initialSessionId
  let contextGeneration = 0
  const operationGenerations: Record<
    StockResearchPersistenceOperation,
    number
  > = {
    load: 0,
    retry: 0,
  }

  return {
    syncContext(nextWorkspaceId, nextSessionId) {
      if (
        nextWorkspaceId === workspaceId
        && nextSessionId === sessionId
      ) {
        return false
      }
      workspaceId = nextWorkspaceId
      sessionId = nextSessionId
      contextGeneration += 1
      return true
    },
    begin(operation) {
      operationGenerations[operation] += 1
      return {
        operation,
        contextGeneration,
        operationGeneration: operationGenerations[operation],
      }
    },
    isCurrent(token) {
      return token.contextGeneration === contextGeneration
        && token.operationGeneration ===
          operationGenerations[token.operation]
    },
  }
}
