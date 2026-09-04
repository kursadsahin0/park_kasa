import { SubscriberStatus } from '@prisma/client'
import { cycleFor } from './cycle'
import { DEFAULT_TZ, ymdInTimeZone } from './timezone'

export function resolvedSubscriberStatus(input: {
  status: SubscriberStatus
  startDate: Date
  payments: { cycleNumber: number }[]
  now?: Date
  timeZone?: string
  parkingLot?: { timeZone?: string }
}) {
  if (input.status === SubscriberStatus.CANCELLED || input.status === SubscriberStatus.SUSPENDED) {
    return input.status
  }

  const now = input.now ?? new Date()
  const tz = input.timeZone || input.parkingLot?.timeZone || DEFAULT_TZ
  if (ymdInTimeZone(input.startDate, tz) > ymdInTimeZone(now, tz)) return SubscriberStatus.PENDING

  const cycle = cycleFor(input.startDate, now, tz)
  const paid = input.payments.some((p) => p.cycleNumber === cycle.cycleNumber)
  return paid ? SubscriberStatus.ACTIVE : SubscriberStatus.EXPIRED
}
