import { describe, expect, it } from 'vitest'
import { cycleFor } from './cycle'

describe('cycleFor (takvim ayı)', () => {
  it('aynı ayda 1. dönemdir', () => {
    const cycle = cycleFor('2026-01-15', new Date('2026-01-20T12:00:00+03:00'), 'Europe/Istanbul')
    expect(cycle.cycleNumber).toBe(1)
  })

  it('sonraki takvim ayında 2. döneme geçer', () => {
    const cycle = cycleFor('2026-01-15', new Date('2026-02-16T12:00:00+03:00'), 'Europe/Istanbul')
    expect(cycle.cycleNumber).toBe(2)
  })
})
