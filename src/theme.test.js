import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, setTheme, resolveEffectiveTheme, _resetForTest } from './theme.js'

beforeEach(() => {
  _resetForTest()
})

describe('getTheme', () => {
  it('returns "system" by default', () => {
    expect(getTheme()).toBe('system')
  })
})

describe('setTheme', () => {
  it('sets to dark', () => {
    setTheme('dark')
    expect(getTheme()).toBe('dark')
  })

  it('sets to light', () => {
    setTheme('light')
    expect(getTheme()).toBe('light')
  })

  it('sets to system', () => {
    setTheme('dark')
    setTheme('system')
    expect(getTheme()).toBe('system')
  })

  it('ignores invalid values', () => {
    setTheme('neon')
    expect(getTheme()).toBe('system')
  })
})

describe('resolveEffectiveTheme', () => {
  it('returns the preference directly when not system', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark')
    expect(resolveEffectiveTheme('light', true)).toBe('light')
  })

  it('returns dark when system prefers dark', () => {
    expect(resolveEffectiveTheme('system', true)).toBe('dark')
  })

  it('returns light when system prefers light', () => {
    expect(resolveEffectiveTheme('system', false)).toBe('light')
  })
})
