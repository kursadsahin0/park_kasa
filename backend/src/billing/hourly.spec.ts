import { describe, expect, it } from 'vitest'
import { billedHours, computeVisitCharge, visitTotal } from './hourly'

describe('billedHours', () => {
  it('ücretsiz dakikadan kısa kalırsa 0', () => {
    const start = new Date('2026-01-01T10:00:00')
    const end = new Date('2026-01-01T10:05:00')
    expect(billedHours(start, end, 15)).toBe(0)
  })

  it('süreyi yukarı yuvarlar', () => {
    const start = new Date('2026-01-01T10:00:00')
    const end = new Date('2026-01-01T11:01:00')
    expect(billedHours(start, end)).toBe(2)
  })
})

describe('visitTotal', () => {
  it('aboneye 0 yazar', () => {
    expect(visitTotal(3, 50, true)).toBe(0)
  })

  it('saat x tarife hesaplar', () => {
    expect(visitTotal(2, 50, false)).toBe(100)
  })
})

describe('computeVisitCharge', () => {
  const lot = { hourlyRate: 50, freeMinutes: 0, timeZone: 'UTC' }

  it('kayıp bilet ücretini kullanır', () => {
    const start = new Date('2026-01-01T10:00:00Z')
    const end = new Date('2026-01-01T12:00:00Z')
    const charge = computeVisitCharge(start, end, { ...lot, lostTicketFee: 200 }, { lostTicket: true })
    expect(charge.totalPrice).toBe(200)
  })

  it('günlük tavan uygular', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const end = new Date('2026-01-01T10:00:00Z')
    const charge = computeVisitCharge(start, end, { ...lot, maxDailyCap: 120 })
    expect(charge.totalPrice).toBe(120)
  })
})
