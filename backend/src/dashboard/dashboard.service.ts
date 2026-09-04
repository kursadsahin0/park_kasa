import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PaymentMethod, VisitStatus } from '@prisma/client'
import { cycleFor } from '../billing/cycle'
import { dayRange, isSameCalendarDay, rangeBetween } from '../billing/day'
import { assertLotDayOpen, toBusinessDate } from '../billing/day-lock'
import { resolvedSubscriberStatus } from '../billing/subscriber-status'
import { PrismaService } from '../prisma/prisma.service'
import { SpotsService } from '../spots/spots.service'

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spots: SpotsService,
  ) {}

  async stats(ownerId: string) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true, totalSpots: true, timeZone: true },
    })
    const lotIds = lots.map((l) => l.id)

    if (!lotIds.length) {
      return {
        lots: 0,
        totalSpots: 0,
        activeSubscribers: 0,
        renewingSoon: 0,
        unpaidThisPeriod: 0,
        expiredCount: 0,
        collectedThisPeriod: 0,
        occupancy: 0,
        parkedNow: 0,
        emptySpots: 0,
        todayHourlyRevenue: 0,
      }
    }

    const { start: startOfDay, end: endOfDay } = dayRange(undefined, lots[0]?.timeZone)

    const [subscribers, openVisits, todayClosed] = await Promise.all([
      this.prisma.subscriber.findMany({
        where: {
          parkingLotId: { in: lotIds },
          status: { in: ['ACTIVE', 'EXPIRED', 'PENDING'] },
        },
        include: {
          payments: { select: { cycleNumber: true, amount: true } },
          parkingLot: { select: { timeZone: true } },
        },
      }),
      this.prisma.visit.count({
        where: { parkingLotId: { in: lotIds }, status: 'OPEN' },
      }),
      this.prisma.visit.aggregate({
        where: {
          parkingLotId: { in: lotIds },
          status: VisitStatus.CLOSED,
          endedAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { totalPrice: true },
      }),
    ])

    let unpaidThisPeriod = 0
    let renewingSoon = 0
    let collectedThisPeriod = 0
    let expiredCount = 0

    for (const subscriber of subscribers) {
      const status = resolvedSubscriberStatus(subscriber)
      const cycle = cycleFor(subscriber.startDate, new Date(), subscriber.parkingLot?.timeZone)
      const payment = subscriber.payments.find((p) => p.cycleNumber === cycle.cycleNumber)
      if (payment) collectedThisPeriod += Number(payment.amount)
      else if (status !== 'PENDING') unpaidThisPeriod += 1
      if (status === 'EXPIRED') expiredCount += 1
      if (cycle.daysLeft <= 7 && status !== 'PENDING' && status !== 'CANCELLED') renewingSoon += 1
      if (status !== subscriber.status) {
        void this.prisma.subscriber.update({ where: { id: subscriber.id }, data: { status } })
      }
    }

    const totalSpots = lots.reduce((sum, l) => sum + l.totalSpots, 0)
    const activeSubscribers = subscribers.filter((s) => resolvedSubscriberStatus(s) === 'ACTIVE').length
    const parkedNow = openVisits
    const occupancy = totalSpots ? Math.round((parkedNow / totalSpots) * 100) : 0
    const maps = await Promise.all(lots.map((lot) => this.spots.occupancy(ownerId, lot.id)))
    const emptySpots = maps.reduce((sum, map) => sum + map.emptyCount, 0)

    return {
      lots: lots.length,
      totalSpots,
      activeSubscribers,
      renewingSoon,
      unpaidThisPeriod,
      expiredCount,
      collectedThisPeriod,
      occupancy,
      parkedNow,
      emptySpots,
      todayHourlyRevenue: Number(todayClosed._sum.totalPrice ?? 0),
    }
  }

  occupancy(ownerId: string, parkingLotId?: string) {
    return this.spots.occupancy(ownerId, parkingLotId)
  }

  async dayClose(ownerId: string, query: { date?: string; parkingLotId?: string }) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true, name: true, timeZone: true },
    })
    const lotIds = lots.map((l) => l.id)
    if (query.parkingLotId && !lotIds.includes(query.parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }

    const tz =
      lots.find((l) => l.id === query.parkingLotId)?.timeZone || lots[0]?.timeZone
    const { start, end, date } = dayRange(query.date, tz)
    const parkingLotId = query.parkingLotId
    const lotFilter = parkingLotId ?? { in: lotIds }

    const emptyByMethod = () =>
      Object.fromEntries(Object.values(PaymentMethod).map((m) => [m, 0])) as Record<
        PaymentMethod,
        number
      >

    if (!lotIds.length) {
      return {
        date,
        parkingLotId: parkingLotId ?? null,
        lots: [],
        visits: [],
        payments: [],
        adjustments: [],
        closes: [],
        closed: false,
        summary: {
          checkoutCount: 0,
          paidCheckouts: 0,
          subscriberCheckouts: 0,
          hourlyRevenue: 0,
          subscriberRevenue: 0,
          adjustmentTotal: 0,
          totalRevenue: 0,
          byMethod: emptyByMethod(),
          stillInside: isSameCalendarDay(start) ? 0 : null,
        },
      }
    }

    const [visits, payments, stillInside, closes, adjustments] = await Promise.all([
      this.prisma.visit.findMany({
        where: {
          status: VisitStatus.CLOSED,
          parkingLotId: lotFilter,
          endedAt: { gte: start, lt: end },
        },
        include: { parkingLot: { select: { id: true, name: true } } },
        orderBy: { endedAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: {
          paidAt: { gte: start, lt: end },
          subscriber: { parkingLotId: lotFilter },
        },
        include: {
          subscriber: {
            select: {
              plate: true,
              fullName: true,
              parkingLot: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { paidAt: 'asc' },
      }),
      isSameCalendarDay(start, new Date(), tz)
        ? this.prisma.visit.count({
            where: { status: VisitStatus.OPEN, parkingLotId: lotFilter },
          })
        : Promise.resolve(null),
      this.prisma.dayClose.findMany({
        where: {
          businessDate: toBusinessDate(date),
          parkingLotId: lotFilter,
        },
        include: {
          parkingLot: { select: { id: true, name: true } },
          closedBy: { select: { fullName: true, email: true } },
        },
      }),
      lotIds.length
        ? this.prisma.cashAdjustment.findMany({
            where: { createdAt: { gte: start, lt: end }, parkingLotId: lotFilter },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
    ])

    const byMethod = emptyByMethod()
    let hourlyRevenue = 0
    let paidCheckouts = 0
    let subscriberCheckouts = 0

    for (const visit of visits) {
      if (visit.isSubscriber) {
        subscriberCheckouts += 1
        continue
      }
      paidCheckouts += 1
      const amount = Number(visit.totalPrice || 0)
      hourlyRevenue += amount
      if (visit.method) byMethod[visit.method] += amount
    }

    let subscriberRevenue = 0
    for (const payment of payments) {
      const amount = Number(payment.amount)
      subscriberRevenue += amount
      byMethod[payment.method] += amount
    }

    let adjustmentTotal = 0
    for (const row of adjustments) {
      const amount = Number(row.amount)
      adjustmentTotal += amount
      byMethod[row.method] += amount
    }

    const scopedLots = parkingLotId ? lots.filter((l) => l.id === parkingLotId) : lots
    const closed = scopedLots.length > 0 && scopedLots.every((lot) => closes.some((c) => c.parkingLotId === lot.id))

    return {
      date,
      parkingLotId: parkingLotId ?? null,
      lots,
      visits,
      payments,
      adjustments,
      closes,
      closed,
      summary: {
        checkoutCount: visits.length,
        paidCheckouts,
        subscriberCheckouts,
        hourlyRevenue,
        subscriberRevenue,
        adjustmentTotal,
        totalRevenue: hourlyRevenue + subscriberRevenue + adjustmentTotal,
        byMethod,
        stillInside,
      },
    }
  }

  async closeDay(
    ownerId: string,
    userId: string,
    query: { date?: string; parkingLotId?: string; notes?: string },
  ) {
    const report = await this.dayClose(ownerId, query)
    const { start, date } = dayRange(query.date)
    if (start.getTime() > Date.now()) {
      throw new BadRequestException('İleri tarih kapatılamaz')
    }

    const targetLots = query.parkingLotId
      ? report.lots.filter((l) => l.id === query.parkingLotId)
      : report.lots
    if (!targetLots.length) throw new BadRequestException('Kapatılacak tesis yok')

    const already = report.closes.filter((c) => targetLots.some((l) => l.id === c.parkingLotId))
    if (already.length === targetLots.length) {
      throw new BadRequestException('Bu gün zaten kapatılmış')
    }

    const businessDate = toBusinessDate(date)
    for (const lot of targetLots) {
      if (already.some((c) => c.parkingLotId === lot.id)) continue
      const lotReport = query.parkingLotId ? report : await this.dayClose(ownerId, { date, parkingLotId: lot.id })
      const s = lotReport.summary
      await this.prisma.dayClose.create({
          data: {
            parkingLotId: lot.id,
            businessDate,
            closedById: userId,
            checkoutCount: s.checkoutCount,
            paidCheckouts: s.paidCheckouts,
            subscriberCheckouts: s.subscriberCheckouts,
            hourlyRevenue: s.hourlyRevenue,
            subscriberRevenue: s.subscriberRevenue,
            totalRevenue: s.totalRevenue,
            cashTotal: s.byMethod.CASH,
            cardTotal: s.byMethod.CARD,
            transferTotal: s.byMethod.TRANSFER,
            stillInside: s.stillInside ?? 0,
            notes: query.notes,
          },
        })
    }
    return this.dayClose(ownerId, query)
  }

  async reopenDay(ownerId: string, query: { date?: string; parkingLotId?: string }) {
    const report = await this.dayClose(ownerId, query)
    if (!report.closes.length) {
      throw new BadRequestException('Bu gün zaten açık')
    }
    const ids = report.closes.map((c) => c.id)
    await this.prisma.dayClose.deleteMany({ where: { id: { in: ids } } })
    return this.dayClose(ownerId, query)
  }

  async rangeReport(
    ownerId: string,
    query: { from: string; to: string; parkingLotId?: string },
  ) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true, name: true, timeZone: true },
    })
    const lotIds = lots.map((l) => l.id)
    if (query.parkingLotId && !lotIds.includes(query.parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }
    const tz = lots.find((l) => l.id === query.parkingLotId)?.timeZone || lots[0]?.timeZone
    const emptySummary = {
      checkoutCount: 0,
      hourlyRevenue: 0,
      subscriberRevenue: 0,
      adjustmentTotal: 0,
      totalRevenue: 0,
    }
    if (!lotIds.length) {
      return { from: query.from, to: query.to, visits: [], payments: [], adjustments: [], summary: emptySummary }
    }
    const { start, end } = rangeBetween(query.from, query.to, tz)
    const lotFilter = query.parkingLotId ?? { in: lotIds }

    const [visits, payments, adjustments] = await Promise.all([
      this.prisma.visit.findMany({
        where: { status: VisitStatus.CLOSED, parkingLotId: lotFilter, endedAt: { gte: start, lt: end } },
        include: { parkingLot: { select: { name: true } } },
        orderBy: { endedAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { paidAt: { gte: start, lt: end }, subscriber: { parkingLotId: lotFilter } },
        include: { subscriber: { select: { plate: true, fullName: true, parkingLot: { select: { name: true } } } } },
        orderBy: { paidAt: 'asc' },
      }),
      this.prisma.cashAdjustment.findMany({
        where: { createdAt: { gte: start, lt: end }, parkingLotId: lotFilter },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const hourlyRevenue = visits.filter((v) => !v.isSubscriber).reduce((s, v) => s + Number(v.totalPrice || 0), 0)
    const subscriberRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)
    const adjustmentTotal = adjustments.reduce((s, a) => s + Number(a.amount), 0)
    return {
      from: query.from,
      to: query.to,
      visits,
      payments,
      adjustments,
      summary: {
        checkoutCount: visits.length,
        hourlyRevenue,
        subscriberRevenue,
        adjustmentTotal,
        totalRevenue: hourlyRevenue + subscriberRevenue + adjustmentTotal,
      },
    }
  }

  async alerts(ownerId: string) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true, name: true, timeZone: true, notifyEmail: true, totalSpots: true },
    })
    const lotIds = lots.map((l) => l.id)
    if (!lotIds.length) return []
    const items: { type: string; title: string; body: string; email?: string | null }[] = []
    const subscribers = await this.prisma.subscriber.findMany({
      where: { parkingLotId: { in: lotIds }, status: { in: ['ACTIVE', 'EXPIRED', 'PENDING'] } },
      include: {
        payments: { select: { cycleNumber: true } },
        parkingLot: { select: { name: true, timeZone: true, notifyEmail: true } },
      },
    })
    for (const subscriber of subscribers) {
      const status = resolvedSubscriberStatus({
        ...subscriber,
        now: new Date(),
      })
      const cycle = cycleFor(subscriber.startDate, new Date(), subscriber.parkingLot.timeZone)
      const paid = subscriber.payments.some((p) => p.cycleNumber === cycle.cycleNumber)
      const email = subscriber.parkingLot.notifyEmail
      if (status === 'EXPIRED' || !paid) {
        items.push({
          type: 'UNPAID',
          title: `${subscriber.plate} ödenmedi`,
          body: `${subscriber.parkingLot.name} · dönem ${cycle.cycleNumber}`,
          email,
        })
      } else if (cycle.daysLeft <= 7) {
        items.push({
          type: 'RENEW',
          title: `${subscriber.plate} yenileme`,
          body: `${cycle.daysLeft} gün kaldı · ${subscriber.parkingLot.name}`,
          email,
        })
      }
    }
    const maps = await Promise.all(lots.map((lot) => this.spots.occupancy(ownerId, lot.id)))
    maps.forEach((map, i) => {
      const lot = lots[i]
      const occ = lot.totalSpots ? map.occupiedCount / lot.totalSpots : 0
      if (occ >= 0.9) {
        items.push({
          type: 'FULL',
          title: `${lot.name} doluluk`,
          body: `%${Math.round(occ * 100)} dolu`,
          email: lot.notifyEmail,
        })
      }
    })
    return items.slice(0, 40)
  }

  async addCashAdjustment(
    ownerId: string,
    userId: string,
    data: { parkingLotId: string; amount: number; method?: PaymentMethod; reason: string },
  ) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id: data.parkingLotId, ownerId },
    })
    if (!lot) throw new NotFoundException('Tesis bulunamadı')
    await assertLotDayOpen(this.prisma, data.parkingLotId)
    if (!data.reason?.trim()) throw new BadRequestException('Gerekçe gerekli')
    return this.prisma.cashAdjustment.create({
      data: {
        parkingLotId: data.parkingLotId,
        amount: data.amount,
        method: data.method ?? PaymentMethod.CASH,
        reason: data.reason,
        createdById: userId,
      },
    })
  }
}
