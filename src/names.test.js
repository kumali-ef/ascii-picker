import { describe, it, expect, beforeEach } from 'vitest'
import { getNames, addNames, editName, deleteName, _resetForTest } from './names.js'

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
