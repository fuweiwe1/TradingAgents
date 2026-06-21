import {
  buildStockResearchRepairPrompt,
  parseStockResearchReport,
  type RetryStockResearchPersistenceResult,
} from '@craft-agent/shared/stock'
import type { Session } from '@craft-agent/shared/protocol'
import type { Logger } from '../runtime/platform'
import type { FinalAssistantMessageEvent } from '../sessions/final-assistant-message-listener'
import type { StockStorage } from './stock-storage'

interface PersistenceSessionManager {
  getSession(sessionId: string): Promise<Session | null>
  sendMessage(sessionId: string, message: string): Promise<void>
  subscribeToFinalAssistantMessage(
    listener: (event: FinalAssistantMessageEvent) => Promise<void> | void,
  ): () => void
}

export interface StockResearchPersistenceCoordinatorOptions {
  storage: StockStorage
  sessionManager: PersistenceSessionManager
  logger: Logger
}

export class StockResearchPersistenceCoordinator {
  private unsubscribe?: () => void

  constructor(
    private readonly options: StockResearchPersistenceCoordinatorOptions,
  ) {}

  start(): () => void {
    if (!this.unsubscribe) {
      this.unsubscribe =
        this.options.sessionManager.subscribeToFinalAssistantMessage(event =>
          this.handleFinalAssistantMessage(event)
        )
    }
    return () => {
      this.unsubscribe?.()
      this.unsubscribe = undefined
    }
  }

  async handleFinalAssistantMessage(
    event: FinalAssistantMessageEvent,
  ): Promise<void> {
    const run = this.options.storage.getResearchRunBySessionId(event.sessionId)
    if (!run) {
      this.options.logger.debug(
        `[stock-persistence] Ignoring non-research session ${event.sessionId}`,
      )
      return
    }

    const parsed = parseStockResearchReport({
      symbol: run.symbol,
      contentMarkdown: event.content,
    })
    if (!parsed.ok) {
      this.options.storage.markResearchPersistenceFailed(run.id, parsed.error)
      this.options.logger.warn(
        `[stock-persistence] Could not parse report for run ${run.id}: ${parsed.error}`,
      )
      return
    }

    try {
      this.options.storage.saveCompletedResearch({
        runId: run.id,
        ...parsed.value,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.options.storage.markResearchPersistenceFailed(
        run.id,
        `报告保存失败：${message}`,
      )
      this.options.logger.error(
        `[stock-persistence] Failed to save report for run ${run.id}: ${message}`,
      )
      return
    }
    this.options.logger.info(
      `[stock-persistence] Saved completed report for run ${run.id}`,
    )
  }

  async retry(
    sessionId: string,
  ): Promise<RetryStockResearchPersistenceResult> {
    const run = this.options.storage.getResearchRunBySessionId(sessionId)
    if (!run) {
      throw new Error(`Research run not found for session: ${sessionId}`)
    }

    const session = await this.options.sessionManager.getSession(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    if (session.isProcessing) {
      return { status: 'running' }
    }

    const latestFinalMessage = [...session.messages].reverse().find(message =>
      message.role === 'assistant' && !message.isIntermediate
    )
    if (latestFinalMessage) {
      const parsed = parseStockResearchReport({
        symbol: run.symbol,
        contentMarkdown: latestFinalMessage.content,
      })
      if (parsed.ok) {
        try {
          this.options.storage.saveCompletedResearch({
            runId: run.id,
            ...parsed.value,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          this.options.storage.markResearchPersistenceFailed(
            run.id,
            `报告保存失败：${message}`,
          )
          throw error
        }
        return { status: 'completed' }
      }
    }

    this.options.storage.markResearchRunRunning(run.id)
    void this.options.sessionManager.sendMessage(
      sessionId,
      buildStockResearchRepairPrompt(run.symbol),
    ).catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      this.options.storage.markResearchPersistenceFailed(
        run.id,
        `重新生成报告失败：${message}`,
      )
      this.options.logger.error(
        `[stock-persistence] Failed to regenerate report for run ${run.id}: ${message}`,
      )
    })

    return { status: 'regenerating' }
  }
}
