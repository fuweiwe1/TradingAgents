import { describe, expect, test } from 'bun:test'
import {
  FinalAssistantMessageListenerRegistry,
  getFinalAssistantMessageEvent,
} from './final-assistant-message-listener'

describe('getFinalAssistantMessageEvent', () => {
  const finalMessage = {
    id: 'assistant-final',
    role: 'assistant' as const,
    content: 'final report',
    timestamp: 2,
    isIntermediate: false,
  }

  test('returns a new final assistant message for a completed turn', () => {
    expect(getFinalAssistantMessageEvent({
      reason: 'complete',
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      turnStartFinalMessageId: 'assistant-old',
      messages: [finalMessage],
    })).toEqual({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messageId: 'assistant-final',
      content: 'final report',
    })
  })

  test('ignores unchanged, intermediate, and non-complete turns', () => {
    expect(getFinalAssistantMessageEvent({
      reason: 'complete',
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      turnStartFinalMessageId: 'assistant-final',
      messages: [finalMessage],
    })).toBeNull()
    expect(getFinalAssistantMessageEvent({
      reason: 'complete',
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messages: [{ ...finalMessage, isIntermediate: true }],
    })).toBeNull()
    expect(getFinalAssistantMessageEvent({
      reason: 'interrupted',
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messages: [finalMessage],
    })).toBeNull()
  })
})

describe('FinalAssistantMessageListenerRegistry', () => {
  test('subscribes, unsubscribes, and isolates listener failures', async () => {
    const errors: unknown[] = []
    const events: string[] = []
    const registry = new FinalAssistantMessageListenerRegistry(error => {
      errors.push(error)
    })
    const unsubscribe = registry.subscribe(() => {
      events.push('first')
      throw new Error('listener failed')
    })
    registry.subscribe(() => {
      events.push('second')
    })

    await registry.notify({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messageId: 'assistant-1',
      content: 'report',
    })

    expect(events).toEqual(['first', 'second'])
    expect(errors).toHaveLength(1)

    unsubscribe()
    events.length = 0
    await registry.notify({
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      messageId: 'assistant-2',
      content: 'updated report',
    })
    expect(events).toEqual(['second'])
  })
})
