import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { normalizeSpotCode } from '../spots/spot-map'
import { UpsertParkingLotDto } from './dto/upsert-parking-lot.dto'
import { LicenseService } from '../license/license.service'

@Injectable()
export class ParkingLotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly license: LicenseService,
  ) {}

  listMine(ownerId: string) {
    return this.prisma.parkingLot.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { subscribers: { where: { status: 'ACTIVE' } } } },
      },
    })
  }

  async getOwned(ownerId: string, id: string) {
    const lot = await this.prisma.parkingLot.findFirst({ where: { id, ownerId } })
    if (!lot) throw new NotFoundException('Tesis bulunamadı')
    return lot
  }

  async create(ownerId: string, dto: UpsertParkingLotDto) {
    await this.license.assertCanCreateLot(ownerId)
    return this.prisma.parkingLot.create({
      data: { ...this.toData(dto), ownerId },
    })
  }

  async update(ownerId: string, id: string, dto: UpsertParkingLotDto) {
    await this.getOwned(ownerId, id)
    return this.prisma.parkingLot.update({ where: { id }, data: this.toData(dto) })
  }

  async remove(ownerId: string, id: string) {
    await this.getOwned(ownerId, id)
    const open = await this.prisma.visit.count({ where: { parkingLotId: id, status: 'OPEN' } })
    if (open) throw new BadRequestException('İçeride araç varken tesis silinemez')
    await this.prisma.parkingLot.delete({ where: { id } })
    return { ok: true }
  }

  private toData(dto: UpsertParkingLotDto) {
    return {
      ...dto,
      spotPrefix: normalizeSpotCode(dto.spotPrefix) || '',
      notifyEmail: dto.notifyEmail?.trim() || null,
    }
  }
}
