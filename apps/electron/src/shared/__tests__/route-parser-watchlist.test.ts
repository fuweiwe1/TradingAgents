import { describe, expect, it } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRouteToNavigationState,
} from '../route-parser'
import { routes } from '../routes'
import {
  getNavigationStateKey,
  parseNavigationStateKey,
} from '../types'

describe('route-parser: watchlist routes', () => {
  it('builds the watchlist route', () => {
    expect(routes.view.watchlist()).toBe('watchlist')
  })

  it('parses "watchlist" as watchlist navigator', () => {
    expect(parseCompoundRoute('watchlist')).toEqual({
      navigator: 'watchlist',
      details: null,
    })
  })

  it('converts watchlist route to navigation state', () => {
    expect(parseRouteToNavigationState('watchlist')).toEqual({
      navigator: 'watchlist',
      details: null,
    })
  })

  it('roundtrips watchlist navigation state back to route', () => {
    expect(buildRouteFromNavigationState({
      navigator: 'watchlist',
      details: null,
    })).toBe('watchlist')
  })

  it('roundtrips watchlist compound route', () => {
    expect(buildCompoundRoute(parseCompoundRoute('watchlist')!)).toBe('watchlist')
  })

  it('builds and parses the watchlist navigation history key', () => {
    const state = { navigator: 'watchlist', details: null } as const

    expect(getNavigationStateKey(state)).toBe('watchlist')
    expect(parseNavigationStateKey('watchlist')).toEqual(state)
  })
})
