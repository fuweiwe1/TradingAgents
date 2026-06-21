import { expect, test } from 'bun:test'
import { classifyWatchlistError } from '../watchlist-errors'

test('classifies duplicate target group storage errors', () => {
  expect(classifyWatchlistError(
    new Error('Watchlist item already exists in group Core'),
  )).toBe('conflict')
})

test('classifies missing watchlist item storage errors', () => {
  expect(classifyWatchlistError(
    new Error('Watchlist item not found: watchlist-1'),
  )).toBe('not-found')
})

test('leaves unrelated and non-error values unclassified', () => {
  expect(classifyWatchlistError(new Error('Network unavailable'))).toBeNull()
  expect(classifyWatchlistError('Watchlist item not found: watchlist-1')).toBeNull()
})