import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDuration, setDuration,
  getGridSize, setGridSize,
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
  it('returns medium preset by default', () => {
    expect(getGridSize()).toEqual({ cols: 50, rows: 28, label: 'medium' })
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
    expect(getGridSize()).toEqual({ cols: 50, rows: 28, label: 'medium' })
  })
})

describe('GRID_PRESETS', () => {
  it('exports three presets', () => {
    expect(Object.keys(GRID_PRESETS)).toEqual(['small', 'medium', 'large'])
  })
})
