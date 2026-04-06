import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDuration, setDuration,
  getGridSize, setGridSize,
  getTitle, setTitle,
  GRID_PRESETS,
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
