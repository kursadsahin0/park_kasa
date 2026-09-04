import { Injectable, NotFoundException } from '@nestjs/common'
import { SubscriberStatus, VisitStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { buildSpotMap } from './spot-map'

@Injectable()
export class SpotsService {
  constructor(private readonly prisma: PrismaService) {}

  async occupancy(ownerId: string, parkingLotId?: string) {
    const lots = await this.prisma.parkingLot.findMany({
      where: { ownerId },
      select: { id: true, name: true, totalSpots: true, spotPrefix: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!lots.length) {
      return {
        parkingLotId: null,
        name: null,
        totalSpots: 0,
        spotPrefix: '',
        lots: [],
        spots: [],
        emptyCount: 0,
        occupiedCount: 0,
        reservedCount: 0,
        unassignedInside: 0,
      }
    }

    const lot = parkingLotId ? lots.find((l) => l.id === parkingLotId) : lots[0]
    if (!lot) throw new NotFoundException('Tesis bulunamadı')

    const [subscribers, visits] = await Promise.all([
      this.prisma.subscriber.findMany({
        where: { parkingLotId: lot.id, status: SubscriberStatus.ACTIVE },
        select: { plate: true, fullName: true, spotCode: true },
      }),
      this.prisma.visit.findMany({
        where: { parkingLotId: lot.id, status: VisitStatus.OPEN },
        select: {
          id: true,
          plate: true,
          fullName: true,
          spotCode: true,
          isSubscriber: true,
        },
      }),
    ])

    const map = buildSpotMap({
      totalSpots: lot.totalSpots,
      spotPrefix: lot.spotPrefix,
      subscribers,
      visits,
    })

    return {
      parkingLotId: lot.id,
      name: lot.name,
      totalSpots: lot.totalSpots,
      spotPrefix: lot.spotPrefix,
      lots: lots.map((l) => ({ id: l.id, name: l.name })),
      ...map,
    }
  }
}
