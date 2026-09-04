import { describe, expect, it } from 'vitest'
import { addDays, issueLicenseKey, parseLicenseKey } from './license'

describe('lisans anahtarı', () => {
  const secret = 'test-secret'
  const email = 'Sahip@ParkKasa.com'

  it('üretilen anahtarı e-posta ile doğrular', () => {
    const expiresAt = addDays(new Date(), 30)
    const key = issueLicenseKey({ plan: 'kasa', maxLots: 1, expiresAt, secret, email })
    const parsed = parseLicenseKey(key, secret, email)
    expect(parsed.plan).toBe('kasa')
    expect(parsed.maxLots).toBe(1)
    expect(parsed.email).toBe('sahip@parkkasa.com')
  })

  it('başka e-postayı reddeder', () => {
    const key = issueLicenseKey({
      plan: 'kasa',
      maxLots: 1,
      expiresAt: addDays(new Date(), 30),
      secret,
      email,
    })
    expect(() => parseLicenseKey(key, secret, 'baska@parkkasa.com')).toThrow(/e-posta/)
  })

  it('bozuk imzayı reddeder', () => {
    const key = issueLicenseKey({
      plan: 'kasa',
      maxLots: 1,
      expiresAt: addDays(new Date(), 30),
      secret,
      email,
    })
    expect(() => parseLicenseKey(key.slice(0, -1) + '0', secret, email)).toThrow(/Geçersiz/)
  })

  it('e-postasız üretim reddedilir', () => {
    expect(() =>
      issueLicenseKey({
        plan: 'kasa',
        maxLots: 1,
        expiresAt: addDays(new Date(), 30),
        secret,
        email: '',
      }),
    ).toThrow(/e-posta/)
  })
})
