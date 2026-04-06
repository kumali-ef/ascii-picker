import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getDuration, setDuration,
  getGridSize, setGridSize,
  getTitle, setTitle,
  getPreferredChars, setPreferredChars,
  GRID_PRESETS,
  hydrateSettings, onSettingsChange,
  _resetForTest
} from './settings.js'

beforeEach(() => {
  _resetForTest()
})

describe('duration', () => {
  it('returns default of 5 seconds', () => {
    expect(getDuration()).toBe(5)
  })

  it('sets and gets duration', () => {
    setDuration(10)
    expect(getDuration()).toBe(10)
  })

  it('clamps duration to min 2', () => {
    setDuration(1)
    expect(getDuration()).toBe(2)
  })

  it('clamps duration to max 15', () => {
    setDuration(20)
    expect(getDuration()).toBe(15)
  })
})

describe('gridSize', () => {
  it('returns large preset by default', () => {
    expect(getGridSize()).toEqual({ cols: 70, rows: 40, label: 'large' })
  })

  it('sets to small preset', () => {
    setGridSize('small')
    expect(getGridSize()).toEqual({ cols: 30, rows: 16, label: 'small' })
  })

  it('sets to large preset', () => {
    setGridSize('large')
    expect(getGridSize()).toEqual({ cols: 70, rows: 40, label: 'large' })
  })

  it('ignores invalid preset', () => {
    setGridSize('huge')
    expect(getGridSize()).toEqual({ cols: 70, rows: 40, label: 'large' })
  })
})

describe('GRID_PRESETS', () => {
  it('exports three presets', () => {
    expect(Object.keys(GRID_PRESETS)).toEqual(['small', 'medium', 'large'])
  })
})

describe('title', () => {
  it('returns default title', () => {
    expect(getTitle()).toBe('ASCII PICKER')
  })

  it('sets and gets custom title', () => {
    setTitle('Daily Standup')
    expect(getTitle()).toBe('Daily Standup')
  })

  it('falls back to default when set to empty string', () => {
    setTitle('')
    expect(getTitle()).toBe('ASCII PICKER')
  })

  it('falls back to default when set to whitespace only', () => {
    setTitle('   ')
    expect(getTitle()).toBe('ASCII PICKER')
  })

  it('trims whitespace', () => {
    setTitle('  My Title  ')
    expect(getTitle()).toBe('My Title')
  })
})

describe('preferredChars', () => {
  it('returns default EFEKTA', () => {
    expect(getPreferredChars()).toBe('EFEKTA')
  })

  it('sets and gets custom chars', () => {
    setPreferredChars('XYZ')
    expect(getPreferredChars()).toBe('XYZ')
  })

  it('allows empty string to fall back to full charset', () => {
    setPreferredChars('')
    expect(getPreferredChars()).toBe('')
  })

  it('trims whitespace', () => {
    setPreferredChars('  ABC  ')
    expect(getPreferredChars()).toBe('ABC')
  })
})

describe('hydrateSettings', () => {
  it('sets all shared fields at once', () => {
    hydrateSettings({ title: 'Room Title', duration: 8, preferredChars: 'XYZ' })
    expect(getTitle()).toBe('Room Title')
    expect(getDuration()).toBe(8)
    expect(getPreferredChars()).toBe('XYZ')
  })

  it('handles partial data', () => {
    hydrateSettings({ title: 'Only Title' })
    expect(getTitle()).toBe('Only Title')
    expect(getDuration()).toBe(5)
    expect(getPreferredChars()).toBe('EFEKTA')
  })
})

describe('onSettingsChange', () => {
  it('fires on setTitle', () => {
    const cb = vi.fn()
    onSettingsChange(cb)
    setTitle('New Title')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('fires on setDuration', () => {
    const cb = vi.fn()
    onSettingsChange(cb)
    setDuration(10)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('fires on setPreferredChars', () => {
    const cb = vi.fn()
    onSettingsChange(cb)
    setPreferredChars('ABC')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire on hydrateSettings', () => {
    const cb = vi.fn()
    onSettingsChange(cb)
    hydrateSettings({ title: 'Room', duration: 7, preferredChars: 'QQ' })
    expect(cb).not.toHaveBeenCalled()
  })

  it('unsub stops callbacks', () => {
    const cb = vi.fn()
    const unsub = onSettingsChange(cb)
    unsub()
    setTitle('Ignored')
    expect(cb).not.toHaveBeenCalled()
  })
})
