import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getNames, addNames, editName, deleteName, setNames, onNamesChange, setKeyPrefix, _resetForTest } from './names.js'

beforeEach(() => {
  _resetForTest()
})

describe('getNames', () => {
  it('returns empty array initially', () => {
    expect(getNames()).toEqual([])
  })
})

describe('addNames', () => {
  it('adds a single name', () => {
    addNames('Alice')
    expect(getNames()).toEqual(['Alice'])
  })

  it('adds multiple names separated by newline', () => {
    addNames('Alice\nBob\nCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('adds multiple names separated by tab', () => {
    addNames('Alice\tBob\tCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('trims whitespace from names', () => {
    addNames('  Alice  \n  Bob  ')
    expect(getNames()).toEqual(['Alice', 'Bob'])
  })

  it('skips empty entries', () => {
    addNames('Alice\n\n\nBob\n')
    expect(getNames()).toEqual(['Alice', 'Bob'])
  })

  it('skips duplicate names', () => {
    addNames('Alice\nBob')
    addNames('Bob\nCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('handles mixed tab and newline separators', () => {
    addNames('Alice\tBob\nCarol')
    expect(getNames()).toEqual(['Alice', 'Bob', 'Carol'])
  })
})

describe('editName', () => {
  it('edits a name at index', () => {
    addNames('Alice\nBob\nCarol')
    editName(1, 'Robert')
    expect(getNames()).toEqual(['Alice', 'Robert', 'Carol'])
  })

  it('trims the edited name', () => {
    addNames('Alice')
    editName(0, '  Bob  ')
    expect(getNames()).toEqual(['Bob'])
  })

  it('ignores edit if index out of range', () => {
    addNames('Alice')
    editName(5, 'Bob')
    expect(getNames()).toEqual(['Alice'])
  })

  it('ignores edit if new name is empty', () => {
    addNames('Alice')
    editName(0, '   ')
    expect(getNames()).toEqual(['Alice'])
  })

  it('ignores edit if new name is duplicate', () => {
    addNames('Alice\nBob')
    editName(0, 'Bob')
    expect(getNames()).toEqual(['Alice', 'Bob'])
  })
})

describe('deleteName', () => {
  it('deletes a name at index', () => {
    addNames('Alice\nBob\nCarol')
    deleteName(1)
    expect(getNames()).toEqual(['Alice', 'Carol'])
  })

  it('ignores delete if index out of range', () => {
    addNames('Alice')
    deleteName(5)
    expect(getNames()).toEqual(['Alice'])
  })
})

describe('setNames', () => {
  it('replaces entire list', () => {
    addNames('Alice\nBob')
    setNames(['X', 'Y', 'Z'])
    expect(getNames()).toEqual(['X', 'Y', 'Z'])
  })

  it('empties list with empty array', () => {
    addNames('Alice\nBob')
    setNames([])
    expect(getNames()).toEqual([])
  })
})

describe('onNamesChange', () => {
  it('fires on addNames', () => {
    const cb = vi.fn()
    onNamesChange(cb)
    addNames('Alice')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not fire on addNames when no new names added', () => {
    addNames('Alice')
    const cb = vi.fn()
    onNamesChange(cb)
    addNames('Alice')
    expect(cb).not.toHaveBeenCalled()
  })

  it('fires on editName', () => {
    addNames('Alice')
    const cb = vi.fn()
    onNamesChange(cb)
    editName(0, 'Bob')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('fires on deleteName', () => {
    addNames('Alice')
    const cb = vi.fn()
    onNamesChange(cb)
    deleteName(0)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire on setNames', () => {
    const cb = vi.fn()
    onNamesChange(cb)
    setNames(['Alice', 'Bob'])
    expect(cb).not.toHaveBeenCalled()
  })

  it('unsub stops callbacks', () => {
    const cb = vi.fn()
    const unsub = onNamesChange(cb)
    unsub()
    addNames('Alice')
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

  it('isolates storage by prefix', () => {
    addNames('Alice')
    expect(getNames()).toEqual(['Alice'])

    setKeyPrefix('room1-')
    expect(getNames()).toEqual([])

    addNames('Bob')
    expect(getNames()).toEqual(['Bob'])

    setKeyPrefix('')
    expect(getNames()).toEqual(['Alice'])
  })

  it('resets for test clears prefix too', () => {
    setKeyPrefix('room1-')
    addNames('Alice')
    _resetForTest()
    expect(getNames()).toEqual([])
  })
})
