import { describe, expect, it } from 'vitest'
import { SubscriberStatus } from '@prisma/client'
import { resolvedSubscriberStatus } from './subscriber-status'

describe('resolvedSubscriberStatus', () => {
  it('iptal ve dondurmayı korur', () => {
    const startDate = new Date('2020-01-01')
    expect(
      resolvedSubscriberStatus({
        status: SubscriberStatus.CANCELLED,
        startDate,
        payments: [],
      }),
    ).toBe(SubscriberStatus.CANCELLED)
    expect(
      resolvedSubscriberStatus({
        status: SubscriberStatus.SUSPENDED,
        startDate,
        payments: [],
      }),
    ).toBe(SubscriberStatus.SUSPENDED)
  })

  it('gelecek başlangıcı beklemede bırakır', () => {
    expect(
      resolvedSubscriberStatus({
        status: SubscriberStatus.ACTIVE,
        startDate: new Date('2099-01-01'),
        payments: [],
        now: new Date('2026-01-01'),
      }),
    ).toBe(SubscriberStatus.PENDING)
  })

  it('ödenmemiş dönemi süresi doldu yapar', () => {
    expect(
      resolvedSubscriberStatus({
        status: SubscriberStatus.ACTIVE,
        startDate: new Date('2026-01-01'),
        payments: [],
        now: new Date('2026-02-01'),
      }),
    ).toBe(SubscriberStatus.EXPIRED)
  })

  it('ödenmiş dönemi aktif tutar', () => {
    expect(
      resolvedSubscriberStatus({
        status: SubscriberStatus.EXPIRED,
        startDate: new Date('2026-01-01'),
        payments: [{ cycleNumber: 1 }],
        now: new Date('2026-01-10'),
      }),
    ).toBe(SubscriberStatus.ACTIVE)
  })
})
