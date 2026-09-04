import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { dayRange } from './day'
import type { PrismaService } from '../prisma/prisma.service'

export function toBusinessDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function isMissingRelation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021'
}

export async function isLotDayClosed(
  prisma: PrismaService,
  parkingLotId: string,
  dateStr?: string,
) {
  const lot = await prisma.parkingLot.findUnique({
    where: { id: parkingLotId },
    select: { timeZone: true },
  })
  const { date } = dayRange(dateStr, lot?.timeZone || undefined)
  try {
    const row = await prisma.dayClose.findUnique({
      where: {
        parkingLotId_businessDate: {
          parkingLotId,
          businessDate: toBusinessDate(date),
        },
      },
    })
    return Boolean(row)
  } catch (err) {
    if (isMissingRelation(err)) return false
    throw err
  }
}

export async function assertLotDayOpen(prisma: PrismaService, parkingLotId: string) {
  if (await isLotDayClosed(prisma, parkingLotId)) {
    throw new BadRequestException('Bu tesis için gün kapatıldı. Yeni işlem alınamaz.')
  }
}
