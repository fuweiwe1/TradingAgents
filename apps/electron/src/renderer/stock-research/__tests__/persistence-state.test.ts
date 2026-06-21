import { expect, test } from 'bun:test'
import {
  createStockResearchPersistenceRequestGuard,
  toPersistenceBannerState,
} from '../persistence-state'

test('maps a failed research run to a retryable persistence banner', () => {
  expect(toPersistenceBannerState({
    status: 'failed',
    errorMessage: '缺少章节：报告生成',
  })).toEqual({
    visible: true,
    canRetry: true,
    regenerating: false,
    message: '缺少章节：报告生成',
  })
})

test('hides persistence failure UI for completed, running, and unknown runs', () => {
  expect(toPersistenceBannerState(null).visible).toBe(false)
  expect(toPersistenceBannerState({
    status: 'completed',
    errorMessage: null,
  }).visible).toBe(false)
  expect(toPersistenceBannerState({
    status: 'running',
    errorMessage: null,
  }).visible).toBe(false)
})

test('shows a non-retryable regenerating state', () => {
  expect(toPersistenceBannerState({
    status: 'running',
    errorMessage: null,
  }, true)).toEqual({
    visible: true,
    canRetry: false,
    regenerating: true,
    message: null,
  })
})

test('rejects old requests after workspace and session changes', () => {
  const guard = createStockResearchPersistenceRequestGuard(
    'workspace-a',
    'session-a',
  )
  const oldLoad = guard.begin('load')

  guard.syncContext('workspace-b', 'session-b')
  guard.syncContext('workspace-a', 'session-a')

  expect(guard.isCurrent(oldLoad)).toBe(false)
  expect(guard.isCurrent(guard.begin('load'))).toBe(true)
})

test('tracks load and retry generations independently', () => {
  const guard = createStockResearchPersistenceRequestGuard(
    'workspace-a',
    'session-a',
  )
  const load = guard.begin('load')
  const retry = guard.begin('retry')

  expect(guard.isCurrent(load)).toBe(true)
  expect(guard.isCurrent(retry)).toBe(true)
  expect(guard.isCurrent(guard.begin('retry'))).toBe(true)
  expect(guard.isCurrent(retry)).toBe(false)
})
