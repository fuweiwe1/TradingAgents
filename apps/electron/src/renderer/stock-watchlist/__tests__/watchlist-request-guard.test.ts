import { expect, test } from 'bun:test'
import { createWatchlistRequestGuard } from '../watchlist-request-guard'

test('rejects an old request after an A to B to A workspace cycle', () => {
  const guard = createWatchlistRequestGuard('workspace-a')
  const oldRequest = guard.begin('save')

  guard.syncWorkspace('workspace-b')
  guard.syncWorkspace('workspace-a')

  expect(guard.isCurrent(oldRequest)).toBe(false)
  expect(guard.isCurrent(guard.begin('save'))).toBe(true)
})

test('only the latest generation of an operation remains current', () => {
  const guard = createWatchlistRequestGuard('workspace-a')
  const older = guard.begin('research')
  const newer = guard.begin('research')

  expect(guard.isCurrent(older)).toBe(false)
  expect(guard.isCurrent(newer)).toBe(true)
})

test('tracks save and research generations independently', () => {
  const guard = createWatchlistRequestGuard('workspace-a')
  const save = guard.begin('save')
  const research = guard.begin('research')

  expect(guard.isCurrent(save)).toBe(true)
  expect(guard.isCurrent(research)).toBe(true)
})