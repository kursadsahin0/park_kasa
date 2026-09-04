import { addDays, issueLicenseKey, type LicensePlan } from '../src/license/license'

const plan = (process.argv[2] || 'kasa') as LicensePlan
const days = Number(process.argv[3] || 365)
const email = process.argv[4]
const secret = process.env.LICENSE_SECRET
if (!secret) {
  console.error('LICENSE_SECRET gerekli')
  process.exit(1)
}
if (!email) {
  console.error('Kullanım: npm run license:issue -- kasa 365 musteri@firma.com')
  process.exit(1)
}
const maxLots = plan === 'isletme' ? 5 : 1
const key = issueLicenseKey({
  plan,
  maxLots,
  expiresAt: addDays(new Date(), days),
  email,
  secret,
})
console.log(key)
