import { describe, it, expect } from 'vitest'
import { computeEasing, buildNameSequence } from './animation.js'

describe('computeEasing', () => {
  it('returns 0 at the start', () => {
    expect(computeEasing(0)).toBeCloseTo(0, 2)
  })

  it('returns 1 at the end', () => {
    expect(computeEasing(1)).toBeCloseTo(1, 2)
  })

  it('is monotonically increasing', () => {
    let prev = 0
    for (let t = 0.1; t <= 1; t += 0.1) {
      const val = computeEasing(t)
      expect(val).toBeGreaterThan(prev)
      prev = val
    }
  })

  it('starts fast (steep slope at start)', () => {
    expect(computeEasing(0.2)).toBeGreaterThan(0.3)
  })
})

describe('buildNameSequence', () => {
  it('returns array ending with the winner', () => {
    const names = ['Alice', 'Bob', 'Carol']
    const seq = buildNameSequence(names, 'Bob', 30)
    expect(seq[seq.length - 1]).toBe('Bob')
    expect(seq.length).toBe(30)
  })

  it('contains only names from the input list', () => {
    const names = ['Alice', 'Bob', 'Carol']
    const seq = buildNameSequence(names, 'Alice', 20)
    for (const name of seq) {
      expect(names).toContain(name)
    }
  })

  it('works with single name', () => {
    const seq = buildNameSequence(['Alice'], 'Alice', 10)
    expect(seq.every(n => n === 'Alice')).toBe(true)
  })
})
