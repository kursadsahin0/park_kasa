import { BadRequestException } from '@nestjs/common'
import { DEFAULT_TZ, parseYmd, wallTimeToUtc, ymdInTimeZone, addCalendarDays } from './timezone'

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

export function dayRange(dateStr?: string, timeZone = DEFAULT_TZ) {
  let ymd: string
  if (dateStr) {
    if (!DAY.test(dateStr)) throw new BadRequestException('Tarih YYYY-MM-DD olmalı')
    ymd = dateStr
  } else {
    ymd = ymdInTimeZone(new Date(), timeZone)
  }
  const { year, month, day } = parseYmd(ymd)
  const start = wallTimeToUtc(timeZone, year, month, day, 0, 0)
  const next = addCalendarDays(ymd, 1)
  const n = parseYmd(next)
  const end = wallTimeToUtc(timeZone, n.year, n.month, n.day, 0, 0)
  return { start, end, date: ymd, timeZone }
}

export function isSameCalendarDay(a: Date, b = new Date(), timeZone = DEFAULT_TZ) {
  return ymdInTimeZone(a, timeZone) === ymdInTimeZone(b, timeZone)
}

export function rangeBetween(from: string, to: string, timeZone = DEFAULT_TZ) {
  const startRange = dayRange(from, timeZone)
  const endRange = dayRange(to, timeZone)
  if (endRange.start < startRange.start) {
    throw new BadRequestException('Bitiş tarihi başlangıçtan önce olamaz')
  }
  return { start: startRange.start, end: endRange.end, from, to, timeZone }
}
