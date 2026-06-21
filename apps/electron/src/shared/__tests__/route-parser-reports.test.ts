import { describe, expect, it } from 'bun:test'
import {
  buildCompoundRoute,
  buildRouteFromNavigationState,
  parseCompoundRoute,
  parseRouteToNavigationState,
} from '../route-parser'
import { routes } from '../routes'

describe('route-parser: reports routes', () => {
  it('builds the reports route', () => {
    expect(routes.view.reports()).toBe('reports')
  })

  it('parses "reports" as reports navigator', () => {
    const result = parseCompoundRoute('reports')
    expect(result).not.toBeNull()
    expect(result!.navigator).toBe('reports')
    expect(result!.details).toBeNull()
  })

  it('converts reports route to navigation state', () => {
    expect(parseRouteToNavigationState('reports')).toEqual({
      navigator: 'reports',
      details: null,
    })
  })

  it('keeps reports as a top-level view route type', () => {
    const route = routes.view.reports()
    const state = parseRouteToNavigationState(route)
    expect(state).toEqual({ navigator: 'reports', details: null })
  })

  it('roundtrips reports navigation state back to route', () => {
    expect(buildRouteFromNavigationState({ navigator: 'reports', details: null })).toBe('reports')
  })

  it('roundtrips reports compound route', () => {
    expect(buildCompoundRoute(parseCompoundRoute('reports')!)).toBe('reports')
  })
})
