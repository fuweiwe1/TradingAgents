export type WatchlistAsyncOperation = 'save' | 'research'

export interface WatchlistRequestToken {
  operation: WatchlistAsyncOperation
  workspaceGeneration: number
  operationGeneration: number
}

export interface WatchlistRequestGuard {
  syncWorkspace(workspaceId: string): boolean
  begin(operation: WatchlistAsyncOperation): WatchlistRequestToken
  isCurrent(token: WatchlistRequestToken): boolean
}

export function createWatchlistRequestGuard(
  initialWorkspaceId: string,
): WatchlistRequestGuard {
  let workspaceId = initialWorkspaceId
  let workspaceGeneration = 0
  const operationGenerations: Record<WatchlistAsyncOperation, number> = {
    save: 0,
    research: 0,
  }

  return {
    syncWorkspace(nextWorkspaceId) {
      if (nextWorkspaceId === workspaceId) return false
      workspaceId = nextWorkspaceId
      workspaceGeneration += 1
      return true
    },
    begin(operation) {
      operationGenerations[operation] += 1
      return {
        operation,
        workspaceGeneration,
        operationGeneration: operationGenerations[operation],
      }
    },
    isCurrent(token) {
      return token.workspaceGeneration === workspaceGeneration
        && token.operationGeneration === operationGenerations[token.operation]
    },
  }
}