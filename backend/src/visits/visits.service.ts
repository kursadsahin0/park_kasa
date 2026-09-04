import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PaymentMethod, SubscriberStatus, VisitStatus } from '@prisma/client'
import { assertLotDayOpen } from '../billing/day-lock'
import { computeVisitCharge } from '../billing/hourly'
import { dayRange } from '../billing/day'
import { visitReceipt } from '../billing/receipt'
import { formatPlate, normalizePlate, platesEqual } from '../plates'
import { PrismaService } from '../prisma/prisma.service'
import { SpotsService } from '../spots/spots.service'
import { pickAssignedSpot, SpotConflictError } from '../spots/spot-map'
import { LicenseService } from '../license/license.service'

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spots: SpotsService,
    private readonly license: LicenseService,
  ) {}

  async listOpen(ownerId: string, parkingLotId?: string) {
    const lotIds = await this.ownerLotIds(ownerId)
    if (parkingLotId && !lotIds.includes(parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }
    return this.prisma.visit.findMany({
      where: {
        status: VisitStatus.OPEN,
        parkingLotId: parkingLotId ?? { in: lotIds },
      },
      include: { parkingLot: { select: { id: true, name: true, hourlyRate: true } } },
      orderBy: { startedAt: 'asc' },
    })
  }

  async listClosedToday(ownerId: string, parkingLotId?: string) {
    const lotIds = await this.ownerLotIds(ownerId)
    if (parkingLotId && !lotIds.includes(parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }
    const lot = parkingLotId
      ? await this.prisma.parkingLot.findFirst({ where: { id: parkingLotId, ownerId }, select: { timeZone: true } })
      : await this.prisma.parkingLot.findFirst({ where: { ownerId }, select: { timeZone: true } })
    const { start } = dayRange(undefined, lot?.timeZone)
    return this.prisma.visit.findMany({
      where: {
        status: { in: [VisitStatus.CLOSED, VisitStatus.CANCELLED] },
        parkingLotId: parkingLotId ?? { in: lotIds },
        endedAt: { gte: start },
      },
      include: { parkingLot: { select: { id: true, name: true } } },
      orderBy: { endedAt: 'desc' },
    })
  }

  async listToday(ownerId: string, parkingLotId?: string) {
    const lotIds = await this.ownerLotIds(ownerId)
    if (parkingLotId && !lotIds.includes(parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }
    const lot = parkingLotId
      ? await this.prisma.parkingLot.findFirst({ where: { id: parkingLotId, ownerId }, select: { timeZone: true } })
      : await this.prisma.parkingLot.findFirst({ where: { ownerId }, select: { timeZone: true } })
    const { start } = dayRange(undefined, lot?.timeZone)
    return this.prisma.visit.findMany({
      where: {
        parkingLotId: parkingLotId ?? { in: lotIds },
        startedAt: { gte: start },
      },
      include: { parkingLot: { select: { id: true, name: true } } },
      orderBy: { startedAt: 'desc' },
    })
  }

  async checkIn(
    ownerId: string,
    data: {
      parkingLotId: string
      plate: string
      fullName?: string
      phone?: string
      notes?: string
      spotCode?: string
      reservationId?: string
    },
  ) {
    await this.license.assertWritable(ownerId)
    await this.assertOwnedLot(ownerId, data.parkingLotId)
    await assertLotDayOpen(this.prisma, data.parkingLotId)
    const plate = formatPlate(data.plate)
    if (!normalizePlate(plate)) throw new BadRequestException('Plaka gerekli')

    const lotIds = await this.ownerLotIds(ownerId)
    const open = await this.prisma.visit.findMany({
      where: { parkingLotId: { in: lotIds }, status: VisitStatus.OPEN },
      select: { plate: true },
    })
    if (open.some((visit) => platesEqual(visit.plate, plate))) {
      throw new BadRequestException('Bu plaka zaten içeride')
    }

    const subscribers = await this.prisma.subscriber.findMany({
      where: { parkingLotId: data.parkingLotId, status: SubscriberStatus.ACTIVE },
      select: { fullName: true, plate: true, spotCode: true },
    })
    const subscriber = subscribers.find((item) => platesEqual(item.plate, plate))
    const isSubscriber = Boolean(subscriber)
    const occupancy = await this.spots.occupancy(ownerId, data.parkingLotId)

    let spotCode: string | null
    try {
      spotCode = pickAssignedSpot(occupancy.spots, {
        requested: data.spotCode,
        subscriberSpot: subscriber?.spotCode,
        plate,
        requireEmpty: !isSubscriber,
      })
    } catch (err) {
      if (err instanceof SpotConflictError) {
        const messages = {
          TAKEN: 'Bu park yeri dolu',
          RESERVED: 'Bu yer bir aboneye ait',
          FULL: 'Boş park yeri yok',
        }
        throw new BadRequestException(messages[err.reason])
      }
      throw err
    }

    const created = await this.prisma.visit.create({
      data: {
        parkingLotId: data.parkingLotId,
        plate,
        fullName: data.fullName || subscriber?.fullName,
        phone: data.phone,
        notes: data.notes,
        isSubscriber,
        spotCode,
        reservationId: data.reservationId || null,
      },
    })
    if (data.reservationId) {
      await this.prisma.reservation.updateMany({
        where: { id: data.reservationId, parkingLotId: data.parkingLotId, status: 'BOOKED' },
        data: { status: 'CHECKED_IN' },
      })
    }
    return created
  }

  async checkout(ownerId: string, id: string, data: { method?: PaymentMethod; lostTicket?: boolean }) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: { parkingLot: true },
    })
    if (!visit || visit.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Kayıt bulunamadı')
    }
    if (visit.status !== VisitStatus.OPEN) {
      throw new BadRequestException('Bu araç zaten çıkış yaptı')
    }
    await assertLotDayOpen(this.prisma, visit.parkingLotId)

    if (!visit.isSubscriber && !data.method) {
      throw new BadRequestException('Ödeme yöntemi gerekli')
    }

    // Çıkış saati yalnızca sunucu saati; istemci endedAt kabul edilmez.
    const endedAt = new Date()
    if (endedAt <= visit.startedAt) {
      throw new BadRequestException('Çıkış saati girişten sonra olmalı')
    }

    const charge = computeVisitCharge(visit.startedAt, endedAt, {
      hourlyRate: Number(visit.parkingLot.hourlyRate),
      nightHourlyRate: visit.parkingLot.nightHourlyRate != null ? Number(visit.parkingLot.nightHourlyRate) : null,
      nightStartHour: visit.parkingLot.nightStartHour,
      nightEndHour: visit.parkingLot.nightEndHour,
      maxDailyCap: visit.parkingLot.maxDailyCap != null ? Number(visit.parkingLot.maxDailyCap) : null,
      freeMinutes: visit.parkingLot.freeMinutes,
      lostTicketFee: Number(visit.parkingLot.lostTicketFee),
      timeZone: visit.parkingLot.timeZone,
    }, { isSubscriber: visit.isSubscriber, lostTicket: Boolean(data.lostTicket) })

    const updated = await this.prisma.visit.update({
      where: { id },
      data: {
        endedAt,
        billedHours: charge.billedHours,
        hourlyRate: charge.hourlyRate,
        totalPrice: charge.totalPrice,
        method: visit.isSubscriber ? null : data.method,
        status: VisitStatus.CLOSED,
        lostTicket: Boolean(data.lostTicket),
      },
      include: { parkingLot: { select: { name: true, address: true } } },
    })
    return { ...updated, receipt: visitReceipt(updated) }
  }

  async cancel(ownerId: string, id: string, reason?: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: { parkingLot: true },
    })
    if (!visit || visit.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Kayıt bulunamadı')
    }
    if (visit.status !== VisitStatus.OPEN) {
      throw new BadRequestException('Yalnızca içerideki kayıt iptal edilebilir')
    }
    await assertLotDayOpen(this.prisma, visit.parkingLotId)

    const note = [visit.notes, reason].filter(Boolean).join(' · ')
    return this.prisma.visit.update({
      where: { id },
      data: {
        status: VisitStatus.CANCELLED,
        endedAt: new Date(),
        billedHours: 0,
        totalPrice: 0,
        method: null,
        notes: note || visit.notes,
      },
    })
  }

  async receipt(ownerId: string, id: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: { parkingLot: { select: { ownerId: true, name: true, address: true } } },
    })
    if (!visit || visit.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Kayıt bulunamadı')
    }
    if (visit.status !== VisitStatus.CLOSED) {
      throw new BadRequestException('Fiş yalnızca tamamlanan çıkış için yazdırılır')
    }
    return visitReceipt(visit)
  }

  async history(ownerId: string, plate: string, parkingLotId?: string) {
    const lotIds = await this.ownerLotIds(ownerId)
    if (parkingLotId && !lotIds.includes(parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }
    const formatted = formatPlate(plate)
    if (!normalizePlate(formatted)) throw new BadRequestException('Plaka gerekli')
    const visits = await this.prisma.visit.findMany({
      where: {
        parkingLotId: parkingLotId ?? { in: lotIds },
      },
      include: { parkingLot: { select: { id: true, name: true } } },
      orderBy: { startedAt: 'desc' },
      take: 200,
    })
    return visits.filter((row) => platesEqual(row.plate, formatted))
  }

  async adjust(
    ownerId: string,
    id: string,
    data: { totalPrice?: number; method?: PaymentMethod; notes?: string },
  ) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: { parkingLot: true },
    })
    if (!visit || visit.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Kayıt bulunamadı')
    }
    if (visit.status !== VisitStatus.CLOSED) {
      throw new BadRequestException('Yalnızca kapanmış çıkış düzeltilebilir')
    }
    await assertLotDayOpen(this.prisma, visit.parkingLotId)
    return this.prisma.visit.update({
      where: { id },
      data: {
        totalPrice: data.totalPrice ?? undefined,
        method: data.method ?? undefined,
        notes: data.notes ?? visit.notes,
        adjustedAt: new Date(),
        adjustmentNote: data.notes,
      },
    })
  }

  private async ownerLotIds(ownerId: string) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true },
    })
    return lots.map((l) => l.id)
  }

  private async assertOwnedLot(ownerId: string, parkingLotId: string) {
    const lot = await this.prisma.parkingLot.findFirst({
      where: { id: parkingLotId, ownerId },
    })
    if (!lot) throw new NotFoundException('Tesis bulunamadı')
    return lot
  }
}
