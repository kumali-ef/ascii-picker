import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getPickedNames, getAvailableNames, markPicked,
  shouldResetCycle, resetCycle, syncWithRoster, setPicked, onCycleChange, setKeyPrefix, _resetForTest
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

describe('setPicked', () => {
  it('replaces picked list', () => {
    markPicked('Alice')
    setPicked(['X', 'Y'])
    expect(getPickedNames()).toEqual(['X', 'Y'])
  })
})

describe('onCycleChange', () => {
  it('fires on markPicked', () => {
    const cb = vi.fn()
    onCycleChange(cb)
    markPicked('Alice')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('fires on resetCycle', () => {
    markPicked('Alice')
    const cb = vi.fn()
    onCycleChange(cb)
    resetCycle()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('fires on syncWithRoster when picked list changes', () => {
    markPicked('Alice')
    markPicked('Bob')
    const cb = vi.fn()
    onCycleChange(cb)
    syncWithRoster(['Alice'])
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire on setPicked', () => {
    const cb = vi.fn()
    onCycleChange(cb)
    setPicked(['Alice', 'Bob'])
    expect(cb).not.toHaveBeenCalled()
  })

  it('unsub stops callbacks', () => {
    const cb = vi.fn()
    const unsub = onCycleChange(cb)
    unsub()
    markPicked('Alice')
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('setKeyPrefix', () => {
  const store = {}
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k])
    globalThis.localStorage = {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
    }
    _resetForTest()
  })

  afterEach(() => {
    delete globalThis.localStorage
    _resetForTest()
  })

  it('isolates picked storage by prefix', () => {
    markPicked('Alice')
    expect(getPickedNames()).toEqual(['Alice'])

    setKeyPrefix('room1-')
    expect(getPickedNames()).toEqual([])

    markPicked('Bob')
    expect(getPickedNames()).toEqual(['Bob'])

    setKeyPrefix('')
    expect(getPickedNames()).toEqual(['Alice'])
  })

  it('resets for test clears prefix too', () => {
    setKeyPrefix('room1-')
    markPicked('Alice')
    _resetForTest()
    expect(getPickedNames()).toEqual([])
  })
})
