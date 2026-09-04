import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, SubscriberStatus } from '@prisma/client'
import { assertLotDayOpen } from '../billing/day-lock'
import { cycleByNumber, cycleFor } from '../billing/cycle'
import { paymentReceipt } from '../billing/receipt'
import { resolvedSubscriberStatus } from '../billing/subscriber-status'
import { formatPlate, normalizePlate, platesEqual } from '../plates'
import { PrismaService } from '../prisma/prisma.service'
import { normalizeSpotCode } from '../spots/spot-map'
import { CreateSubscriberDto } from './dto/create-subscriber.dto'
import { UpdateSubscriberDto } from './dto/update-subscriber.dto'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { LicenseService } from '../license/license.service'

@Injectable()
export class SubscribersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly license: LicenseService,
  ) {}

  async list(
    ownerId: string,
    query: { q?: string; status?: SubscriberStatus; parkingLotId?: string },
  ) {
    const lots = await this.ownerLotIds(ownerId)
    const where: Prisma.SubscriberWhereInput = {
      parkingLotId: query.parkingLotId ? query.parkingLotId : { in: lots },
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { plate: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    if (query.parkingLotId && !lots.includes(query.parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }

    await this.syncOwner(lots)

    const items = await this.prisma.subscriber.findMany({
      where,
      include: {
        parkingLot: { select: { id: true, name: true, timeZone: true } },
        payments: { orderBy: { cycleNumber: 'desc' }, take: 6 },
      },
      orderBy: { fullName: 'asc' },
    })

    return items.map((item) => this.withCycle(item))
  }

  async get(ownerId: string, id: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
      include: {
        parkingLot: { select: { id: true, name: true, ownerId: true, timeZone: true } },
        payments: { orderBy: { cycleNumber: 'desc' } },
      },
    })
    if (!subscriber || subscriber.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Abone bulunamadı')
    }
    const [synced] = await this.syncStatuses([subscriber])
    return this.withCycle(synced)
  }

  async create(ownerId: string, dto: CreateSubscriberDto) {
    await this.license.assertWritable(ownerId)
    const lot = await this.assertOwnedLot(ownerId, dto.parkingLotId)
    await assertLotDayOpen(this.prisma, dto.parkingLotId)
    const plate = formatPlate(dto.plate)
    if (!normalizePlate(plate)) throw new BadRequestException('Plaka gerekli')
    await this.assertPlateFree(dto.parkingLotId, plate)

    const spotCode = normalizeSpotCode(dto.spotCode)
    await this.assertSpotFree(dto.parkingLotId, spotCode)

    const amount = dto.paidAmount ?? dto.monthlyFee
    if (!amount || amount <= 0) {
      throw new BadRequestException('Abone kaydı için ödeme alınmalı')
    }

    const startDate = new Date(dto.startDate)
    const cycle = cycleFor(startDate, new Date(), lot.timeZone)
    const { paymentMethod, paidAmount: _paid, status: requestedStatus, ...rest } = dto
    const initialStatus =
      requestedStatus === SubscriberStatus.SUSPENDED
        ? SubscriberStatus.SUSPENDED
        : SubscriberStatus.ACTIVE

    const created = await this.prisma.$transaction(async (tx) => {
      const subscriber = await tx.subscriber.create({
        data: {
          ...rest,
          plate,
          spotCode,
          startDate,
          status: initialStatus,
        },
      })
      await tx.payment.create({
        data: {
          subscriberId: subscriber.id,
          amount,
          cycleNumber: cycle.cycleNumber,
          periodStart: cycle.periodStart,
          periodEnd: cycle.periodEnd,
          method: paymentMethod,
        },
      })
      return tx.subscriber.findUniqueOrThrow({
        where: { id: subscriber.id },
        include: {
          parkingLot: { select: { id: true, name: true, address: true, timeZone: true } },
          payments: true,
        },
      })
    })
    const synced = this.withCycle(created)
    const payment = created.payments[0]
    return {
      ...synced,
      receipt: payment
        ? paymentReceipt({
            ...payment,
            subscriber: {
              plate: created.plate,
              fullName: created.fullName,
              parkingLot: created.parkingLot,
            },
          })
        : null,
    }
  }

  async update(ownerId: string, id: string, dto: UpdateSubscriberDto) {
    const current = await this.get(ownerId, id)
    if (current.status === SubscriberStatus.CANCELLED) {
      throw new BadRequestException('Sonlandırılmış abonelik düzenlenemez')
    }
    if (dto.status === SubscriberStatus.CANCELLED) {
      throw new BadRequestException('Aboneliği durdurmak için sonlandırma kullanın')
    }
    if (dto.plate) {
      const plate = formatPlate(dto.plate)
      if (!normalizePlate(plate)) throw new BadRequestException('Plaka gerekli')
      await this.assertPlateFree(current.parkingLotId, plate, id)
    }
    const spotCode = dto.spotCode !== undefined ? normalizeSpotCode(dto.spotCode) : undefined
    if (spotCode) await this.assertSpotFree(current.parkingLotId, spotCode, id)
    const updated = await this.prisma.subscriber.update({
      where: { id },
      data: {
        ...dto,
        plate: dto.plate ? formatPlate(dto.plate) : undefined,
        spotCode,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },
      include: {
        parkingLot: { select: { id: true, name: true, timeZone: true } },
        payments: { orderBy: { cycleNumber: 'desc' }, take: 6 },
      },
    })
    return this.withCycle(updated)
  }

  async terminate(ownerId: string, id: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
      include: { parkingLot: { select: { ownerId: true } } },
    })
    if (!subscriber || subscriber.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Abone bulunamadı')
    }
    if (subscriber.status === SubscriberStatus.CANCELLED) {
      throw new BadRequestException('Bu abonelik zaten sonlandırıldı')
    }

    const updated = await this.prisma.subscriber.update({
      where: { id },
      data: {
        status: SubscriberStatus.CANCELLED,
        endedAt: new Date(),
      },
      include: {
        parkingLot: { select: { id: true, name: true, timeZone: true } },
        payments: { orderBy: { cycleNumber: 'desc' }, take: 6 },
      },
    })
    return this.withCycle(updated)
  }

  async addPayment(ownerId: string, id: string, dto: CreatePaymentDto) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
      include: { parkingLot: { select: { ownerId: true, timeZone: true } } },
    })
    if (!subscriber || subscriber.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Abone bulunamadı')
    }
    await this.license.assertWritable(ownerId)
    if (subscriber.status === SubscriberStatus.CANCELLED) {
      throw new BadRequestException('Sonlandırılmış aboneliğe ödeme eklenemez')
    }
    await assertLotDayOpen(this.prisma, subscriber.parkingLotId)
    if (!dto.method) {
      throw new BadRequestException('Ödeme yöntemi gerekli')
    }

    const cycle = dto.cycleNumber
      ? cycleByNumber(subscriber.startDate, dto.cycleNumber, subscriber.parkingLot.timeZone)
      : cycleFor(subscriber.startDate, new Date(), subscriber.parkingLot.timeZone)

    try {
      const payment = await this.prisma.payment.create({
        data: {
          subscriberId: id,
          amount: dto.amount,
          cycleNumber: cycle.cycleNumber,
          periodStart: cycle.periodStart,
          periodEnd: cycle.periodEnd,
          method: dto.method,
          notes: dto.notes,
        },
        include: {
          subscriber: {
            include: { parkingLot: { select: { name: true, address: true } } },
          },
        },
      })
      const payments = await this.prisma.payment.findMany({
        where: { subscriberId: id },
        select: { cycleNumber: true },
      })
      await this.prisma.subscriber.update({
        where: { id },
        data: { status: resolvedSubscriberStatus({ ...subscriber, payments }) },
      })
      return { ...payment, receipt: paymentReceipt(payment) }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Bu takvim ayı için ödeme zaten kayıtlı')
      }
      throw err
    }
  }

  async paymentReceipt(ownerId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscriber: {
          include: { parkingLot: { select: { ownerId: true, name: true, address: true } } },
        },
      },
    })
    if (!payment || payment.subscriber.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Ödeme bulunamadı')
    }
    return paymentReceipt(payment)
  }

  private async syncStatuses<
    T extends {
      id: string
      status: SubscriberStatus
      startDate: Date
      payments: { cycleNumber: number }[]
    },
  >(items: T[]) {
    const updates = items.flatMap((item) => {
      const next = resolvedSubscriberStatus(item)
      if (next === item.status) return []
      return [{ id: item.id, status: next }]
    })
    if (updates.length) {
      await this.prisma.$transaction(
        updates.map((u) =>
          this.prisma.subscriber.update({ where: { id: u.id }, data: { status: u.status } }),
        ),
      )
    }
    const map = new Map(updates.map((u) => [u.id, u.status]))
    return items.map((item) => (map.has(item.id) ? { ...item, status: map.get(item.id)! } : item))
  }

  private async syncOwner(lotIds: string[]) {
    const items = await this.prisma.subscriber.findMany({
      where: {
        parkingLotId: { in: lotIds },
        status: { not: SubscriberStatus.CANCELLED },
      },
      select: { id: true, status: true, startDate: true, payments: { select: { cycleNumber: true } } },
    })
    await this.syncStatuses(items)
  }

  private withCycle<
    T extends {
      startDate: Date
      payments: { cycleNumber: number }[]
      parkingLot?: { timeZone?: string | null }
    },
  >(subscriber: T) {
    const cycle = cycleFor(subscriber.startDate, new Date(), subscriber.parkingLot?.timeZone || undefined)
    const currentPaid = subscriber.payments.some((p) => p.cycleNumber === cycle.cycleNumber)
    return {
      ...subscriber,
      cycle: {
        ...cycle,
        paid: currentPaid,
      },
    }
  }

  private async assertPlateFree(parkingLotId: string, plate: string, exceptId?: string) {
    const others = await this.prisma.subscriber.findMany({
      where: {
        parkingLotId,
        status: { not: SubscriberStatus.CANCELLED },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { plate: true },
    })
    if (others.some((item) => platesEqual(item.plate, plate))) {
      throw new BadRequestException('Bu plaka bu tesiste zaten kayıtlı')
    }
  }

  private async assertSpotFree(parkingLotId: string, spotCode: string | null, exceptId?: string) {
    if (!spotCode) return
    const clash = await this.prisma.subscriber.findFirst({
      where: {
        parkingLotId,
        spotCode,
        status: { not: SubscriberStatus.CANCELLED },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
    })
    if (clash) throw new BadRequestException('Bu park yeri başka bir aboneye ait')
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
