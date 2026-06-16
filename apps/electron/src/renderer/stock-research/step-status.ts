import { STOCK_RESEARCH_STEPS } from '@craft-agent/shared/stock'
import type { Message } from '../../shared/types'
import type { StockResearchStepKey } from '@craft-agent/shared/stock'

export type StockResearchStepStatus = 'pending' | 'in_progress' | 'completed'

export interface StockResearchStepStatusItem {
  key: StockResearchStepKey
  title: string
  status: StockResearchStepStatus
}

export function isStockResearchSession(session: { name?: string | null } | null | undefined): boolean {
  return !!session?.name?.startsWith('Stock Research: ')
}

export function deriveStockResearchStepStatuses(
  messages: Pick<Message, 'role' | 'content' | 'isStreaming'>[],
): StockResearchStepStatusItem[] {
  const completedTitles = new Set<string>()
  let streamingTitle: string | null = null

  for (const message of messages) {
    if (message.role !== 'assistant' && message.role !== 'plan') continue

    for (const step of STOCK_RESEARCH_STEPS) {
      if (!message.content.includes(step.title)) continue

      completedTitles.add(step.title)
      if (message.isStreaming) {
        streamingTitle = step.title
      }
    }
  }

  return STOCK_RESEARCH_STEPS.map(step => {
    const completed = completedTitles.has(step.title)
    return {
      ...step,
      status: streamingTitle === step.title
        ? 'in_progress'
        : completed
          ? 'completed'
          : 'pending',
    }
  })
}
