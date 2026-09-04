import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ReservationStatus } from '@prisma/client'
import { assertLotDayOpen } from '../billing/day-lock'
import { formatPlate, normalizePlate } from '../plates'
import { PrismaService } from '../prisma/prisma.service'
import { normalizeSpotCode } from '../spots/spot-map'
import { LicenseService } from '../license/license.service'

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly license: LicenseService,
  ) {}

  async list(ownerId: string, parkingLotId?: string) {
    const lotIds = await this.ownerLotIds(ownerId)
    if (parkingLotId && !lotIds.includes(parkingLotId)) {
      throw new NotFoundException('Tesis bulunamadı')
    }
    return this.prisma.reservation.findMany({
      where: { parkingLotId: parkingLotId ?? { in: lotIds } },
      include: { parkingLot: { select: { id: true, name: true } } },
      orderBy: { startsAt: 'asc' },
      take: 200,
    })
  }

  async create(
    ownerId: string,
    data: {
      parkingLotId: string
      plate: string
      fullName?: string
      phone?: string
      spotCode?: string
      startsAt: string
      endsAt: string
      notes?: string
    },
  ) {
    await this.license.assertWritable(ownerId)
    await this.assertOwnedLot(ownerId, data.parkingLotId)
    await assertLotDayOpen(this.prisma, data.parkingLotId)
    const plate = formatPlate(data.plate)
    if (!normalizePlate(plate)) throw new BadRequestException('Plaka gerekli')
    const startsAt = new Date(data.startsAt)
    const endsAt = new Date(data.endsAt)
    if (!(startsAt < endsAt)) throw new BadRequestException('Bitiş girişten sonra olmalı')
    return this.prisma.reservation.create({
      data: {
        parkingLotId: data.parkingLotId,
        plate,
        fullName: data.fullName,
        phone: data.phone,
        spotCode: normalizeSpotCode(data.spotCode),
        startsAt,
        endsAt,
        notes: data.notes,
      },
    })
  }

  async cancel(ownerId: string, id: string) {
    const row = await this.prisma.reservation.findUnique({
      where: { id },
      include: { parkingLot: true },
    })
    if (!row || row.parkingLot.ownerId !== ownerId) {
      throw new NotFoundException('Rezervasyon bulunamadı')
    }
    if (row.status !== ReservationStatus.BOOKED) {
      throw new BadRequestException('Yalnızca bekleyen rezervasyon iptal edilir')
    }
    return this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
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
    const lot = await this.prisma.parkingLot.findFirst({ where: { id: parkingLotId, ownerId } })
    if (!lot) throw new NotFoundException('Tesis bulunamadı')
    return lot
  }
}
