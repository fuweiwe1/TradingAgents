export interface FinalAssistantMessageEvent {
  sessionId: string
  workspaceId: string
  messageId: string
  content: string
}

export type FinalAssistantMessageListener = (
  event: FinalAssistantMessageEvent,
) => Promise<void> | void

type ProcessingStopReason = 'complete' | 'interrupted' | 'error' | 'timeout'

interface FinalMessageCandidate {
  id: string
  role: string
  content: string
  isIntermediate?: boolean
}

export function getFinalAssistantMessageEvent(input: {
  reason: ProcessingStopReason
  sessionId: string
  workspaceId: string
  turnStartFinalMessageId?: string
  messages: FinalMessageCandidate[]
}): FinalAssistantMessageEvent | null {
  if (input.reason !== 'complete') return null

  const message = [...input.messages].reverse().find(candidate =>
    candidate.role === 'assistant' && !candidate.isIntermediate
  )
  if (!message || message.id === input.turnStartFinalMessageId) return null

  return {
    sessionId: input.sessionId,
    workspaceId: input.workspaceId,
    messageId: message.id,
    content: message.content,
  }
}

export class FinalAssistantMessageListenerRegistry {
  private readonly listeners = new Set<FinalAssistantMessageListener>()

  constructor(
    private readonly onError: (error: unknown) => void = () => {},
  ) {}

  subscribe(listener: FinalAssistantMessageListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async notify(event: FinalAssistantMessageEvent): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(event)
      } catch (error) {
        this.onError(error)
      }
    }
  }
}
