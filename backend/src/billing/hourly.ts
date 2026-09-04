import { hourInTimeZone, DEFAULT_TZ } from './timezone'

export type LotRates = {
  hourlyRate: number
  nightHourlyRate?: number | null
  nightStartHour?: number | null
  nightEndHour?: number | null
  maxDailyCap?: number | null
  freeMinutes?: number | null
  lostTicketFee?: number | null
  timeZone?: string | null
}

export function billedHours(startedAt: Date, endedAt: Date, freeMinutes = 0) {
  const billableMs = Math.max(0, endedAt.getTime() - startedAt.getTime() - freeMinutes * 60_000)
  if (billableMs <= 0) return 0
  const minutes = Math.max(1, Math.ceil(billableMs / 60_000))
  return Math.max(1, Math.ceil(minutes / 60))
}

export function visitTotal(hours: number, hourlyRate: number, isSubscriber: boolean) {
  if (isSubscriber) return 0
  return Math.round(hours * hourlyRate * 100) / 100
}

function inNight(hour: number, start: number, end: number) {
  if (start === end) return false
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

function rateAt(date: Date, lot: LotRates) {
  const tz = lot.timeZone || DEFAULT_TZ
  const nightRate = Number(lot.nightHourlyRate)
  const dayRate = Number(lot.hourlyRate)
  if (!nightRate || nightRate <= 0) return dayRate
  const startH = lot.nightStartHour ?? 22
  const endH = lot.nightEndHour ?? 7
  return inNight(hourInTimeZone(date, tz), startH, endH) ? nightRate : dayRate
}

export function computeVisitCharge(
  startedAt: Date,
  endedAt: Date,
  lot: LotRates,
  opts: { isSubscriber?: boolean; lostTicket?: boolean } = {},
) {
  if (opts.isSubscriber) {
    return { billedHours: 0, hourlyRate: Number(lot.hourlyRate), totalPrice: 0 }
  }
  const cap = lot.maxDailyCap != null ? Number(lot.maxDailyCap) : null
  if (opts.lostTicket) {
    const fee = Number(lot.lostTicketFee || 0)
    const totalPrice = cap != null ? Math.min(fee, cap) : fee
    return { billedHours: 0, hourlyRate: Number(lot.hourlyRate), totalPrice }
  }

  const freeMinutes = Number(lot.freeMinutes || 0)
  const billableStart = new Date(startedAt.getTime() + freeMinutes * 60_000)
  if (billableStart >= endedAt) {
    return { billedHours: 0, hourlyRate: Number(lot.hourlyRate), totalPrice: 0 }
  }

  let total = 0
  let cursor = billableStart.getTime()
  const end = endedAt.getTime()
  while (cursor < end) {
    const slotEnd = Math.min(cursor + 3_600_000, end)
    total += rateAt(new Date(cursor), lot)
    cursor = slotEnd
  }
  total = Math.round(total * 100) / 100
  if (cap != null) total = Math.min(total, cap)
  return {
    billedHours: billedHours(startedAt, endedAt, freeMinutes),
    hourlyRate: Number(lot.hourlyRate),
    totalPrice: total,
  }
}
