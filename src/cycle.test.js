import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPickedNames, getAvailableNames, markPicked,
  shouldResetCycle, resetCycle, syncWithRoster, _resetForTest
} from './cycle.js'

beforeEach(() => {
  _resetForTest()
})

describe('getAvailableNames', () => {
  it('returns all names when none picked', () => {
    expect(getAvailableNames(['Alice', 'Bob', 'Carol'])).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('excludes picked names', () => {
    markPicked('Bob')
    expect(getAvailableNames(['Alice', 'Bob', 'Carol'])).toEqual(['Alice', 'Carol'])
  })

  it('returns empty when all picked', () => {
    markPicked('Alice')
    markPicked('Bob')
    expect(getAvailableNames(['Alice', 'Bob'])).toEqual([])
  })
})

describe('markPicked', () => {
  it('adds name to picked list', () => {
    markPicked('Alice')
    expect(getPickedNames()).toEqual(['Alice'])
  })

  it('does not add duplicate', () => {
    markPicked('Alice')
    markPicked('Alice')
    expect(getPickedNames()).toEqual(['Alice'])
  })
})

describe('shouldResetCycle', () => {
  it('returns false when names remain', () => {
    markPicked('Alice')
    expect(shouldResetCycle(['Alice', 'Bob'])).toBe(false)
  })

  it('returns true when all picked', () => {
    markPicked('Alice')
    markPicked('Bob')
    expect(shouldResetCycle(['Alice', 'Bob'])).toBe(true)
  })

  it('returns false for empty roster', () => {
    expect(shouldResetCycle([])).toBe(false)
  })
})

describe('resetCycle', () => {
  it('clears picked list', () => {
    markPicked('Alice')
    markPicked('Bob')
    resetCycle()
    expect(getPickedNames()).toEqual([])
    expect(getAvailableNames(['Alice', 'Bob'])).toEqual(['Alice', 'Bob'])
  })
})

describe('syncWithRoster', () => {
  it('removes picked names no longer in roster', () => {
    markPicked('Alice')
    markPicked('Bob')
    markPicked('Carol')
    syncWithRoster(['Alice', 'Carol'])
    expect(getPickedNames()).toEqual(['Alice', 'Carol'])
  })

  it('does nothing if all picked names still exist', () => {
    markPicked('Alice')
    syncWithRoster(['Alice', 'Bob'])
    expect(getPickedNames()).toEqual(['Alice'])
  })
})
