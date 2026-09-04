import { createHmac, timingSafeEqual } from 'crypto'

export const LICENSE_PLANS = {
  trial: { maxLots: 1, label: 'Deneme' },
  kasa: { maxLots: 1, label: 'Kasa' },
  isletme: { maxLots: 5, label: 'İşletme' },
} as const

export type LicensePlan = keyof typeof LICENSE_PLANS

export function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase()
}

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 86_400_000)
}

function payload(plan: string, maxLots: number, exp: string, email: string) {
  return `${plan}|${maxLots}|${exp}|${normalizeEmail(email)}`
}

export function issueLicenseKey(input: {
  plan: LicensePlan
  maxLots: number
  expiresAt: Date
  email: string
  secret: string
}) {
  if (!input.secret) throw new Error('LICENSE_SECRET gerekli')
  const email = normalizeEmail(input.email)
  if (!email.includes('@')) throw new Error('Lisans e-postası gerekli')
  const exp = input.expiresAt.toISOString().slice(0, 10)
  const sig = createHmac('sha256', input.secret)
    .update(payload(input.plan, input.maxLots, exp, email))
    .digest('hex')
    .slice(0, 24)
  return `PK1.${input.plan}.${input.maxLots}.${exp}.${sig}`
}

export function parseLicenseKey(key: string, secret: string, email: string) {
  if (!secret) throw new Error('LICENSE_SECRET tanımlı değil')
  const parts = String(key || '').trim().split('.')
  if (parts.length !== 5 || parts[0] !== 'PK1') throw new Error('Geçersiz lisans anahtarı')
  const plan = parts[1] as LicensePlan
  const maxLots = Number(parts[2])
  const exp = parts[3]
  const sig = parts[4]
  if (!LICENSE_PLANS[plan] || !Number.isInteger(maxLots) || maxLots < 1) {
    throw new Error('Geçersiz lisans anahtarı')
  }
  const expected = createHmac('sha256', secret)
    .update(payload(plan, maxLots, exp, email))
    .digest('hex')
    .slice(0, 24)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Geçersiz lisans anahtarı veya e-posta uyuşmuyor')
  }
  const expiresAt = new Date(`${exp}T23:59:59.000Z`)
  if (Number.isNaN(expiresAt.getTime())) throw new Error('Geçersiz lisans tarihi')
  if (expiresAt.getTime() < Date.now()) throw new Error('Lisans süresi dolmuş')
  return { plan, maxLots, expiresAt, email: normalizeEmail(email) }
}
