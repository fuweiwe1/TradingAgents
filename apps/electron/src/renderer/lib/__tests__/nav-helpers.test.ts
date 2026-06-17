import { describe, expect, it } from 'bun:test'
import { isDetailNavState } from '../nav-helpers'

describe('isDetailNavState', () => {
  it('treats reports as navigator-only', () => {
    expect(isDetailNavState({ navigator: 'reports', details: null })).toBe(false)
  })
})
