import { createClient } from '@supabase/supabase-js'
import { PaymentMethod, PrismaClient, SubscriberStatus, VisitStatus } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@parkkasa.com'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPark1!'
const DEMO_NAME = 'Demo İşletmeci'

async function ensureAuthUser() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('YOUR_PROJECT') || key.includes('your-service')) {
    throw new Error('Seed için backend/.env içinde SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  }
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: created, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEMO_NAME },
  })
  if (error && !String(error.message).toLowerCase().includes('already')) {
    throw error
  }
  if (created.user?.id) return created.user.id

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listErr) throw listErr
  const existing = list.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL)
  if (!existing) throw new Error('Demo kullanıcısı oluşturulamadı')
  return existing.id
}

async function main() {
  const ownerId = process.env.DEMO_OWNER_ID || (await ensureAuthUser())
  const trialEnd = new Date(Date.now() + 365 * 86_400_000)

  await prisma.user.upsert({
    where: { id: ownerId },
    create: {
      id: ownerId,
      email: DEMO_EMAIL,
      fullName: DEMO_NAME,
      role: 'OWNER',
      licensePlan: 'isletme',
      maxLots: 5,
      licenseExpiresAt: trialEnd,
      onboardingDone: true,
    },
    update: {
      email: DEMO_EMAIL,
      fullName: DEMO_NAME,
      licensePlan: 'isletme',
      maxLots: 5,
      licenseExpiresAt: trialEnd,
      onboardingDone: true,
    },
  })

  const existing = await prisma.parkingLot.findFirst({
    where: { ownerId, name: 'ParkKasa Demo Otopark' },
  })
  if (existing) {
    console.log(`Seed: demo tesis zaten var (${existing.id}). Giriş: ${DEMO_EMAIL}`)
    return
  }

  const lot = await prisma.parkingLot.create({
    data: {
      ownerId,
      name: 'ParkKasa Demo Otopark',
      address: 'Atatürk Cad. No:1',
      city: 'İstanbul',
      district: 'Kadıköy',
      totalSpots: 40,
      spotPrefix: 'A-',
      hourlyRate: 50,
      monthlyRate: 3500,
      timeZone: 'Europe/Istanbul',
      nightStartHour: 22,
      nightEndHour: 7,
      nightHourlyRate: 70,
      freeMinutes: 10,
      maxDailyCap: 250,
      lostTicketFee: 200,
    },
  })

  const startDate = new Date()
  startDate.setUTCHours(0, 0, 0, 0)
  const subscriber = await prisma.subscriber.create({
    data: {
      parkingLotId: lot.id,
      fullName: 'Ayşe Abone',
      phone: '05320000000',
      plate: '34 PK 100',
      spotCode: 'A-1',
      startDate,
      monthlyFee: 3500,
      status: SubscriberStatus.ACTIVE,
    },
  })
  await prisma.payment.create({
    data: {
      subscriberId: subscriber.id,
      amount: 3500,
      cycleNumber: 1,
      periodStart: startDate,
      periodEnd: new Date(startDate.getTime() + 32 * 86_400_000),
      method: PaymentMethod.CASH,
    },
  })

  const twoHoursAgo = new Date(Date.now() - 2 * 36e5)
  const oneHourAgo = new Date(Date.now() - 1 * 36e5)
  await prisma.visit.create({
    data: {
      parkingLotId: lot.id,
      plate: '34 PK 200',
      fullName: 'Günlük Müşteri',
      spotCode: 'A-2',
      startedAt: twoHoursAgo,
      endedAt: oneHourAgo,
      billedHours: 2,
      hourlyRate: 50,
      totalPrice: 100,
      method: PaymentMethod.CASH,
      status: VisitStatus.CLOSED,
    },
  })
  await prisma.visit.create({
    data: {
      parkingLotId: lot.id,
      plate: '34 PK 300',
      fullName: 'İçerideki Araç',
      spotCode: 'A-3',
      status: VisitStatus.OPEN,
    },
  })

  console.log(`Seed tamam. Panel girişi: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
