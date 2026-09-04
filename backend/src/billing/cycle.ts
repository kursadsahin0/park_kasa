import { ymdInTimeZone, DEFAULT_TZ, parseYmd, addCalendarDays } from './timezone'

function addMonthsYmd(ymd: string, months: number) {
  const { year, month, day } = parseYmd(ymd)
  const base = new Date(Date.UTC(year, month - 1 + months, 1))
  const last = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const d = Math.min(day, last)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(d)}`
}

function monthsBetween(startYmd: string, todayYmd: string) {
  const s = parseYmd(startYmd)
  const t = parseYmd(todayYmd)
  let months = (t.year - s.year) * 12 + (t.month - s.month)
  if (t.day < s.day) months -= 1
  return Math.max(0, months)
}

export function cycleFor(startDate: Date | string, now = new Date(), timeZone = DEFAULT_TZ) {
  const startYmd = typeof startDate === 'string' ? String(startDate).slice(0, 10) : ymdInTimeZone(startDate, timeZone)
  const todayYmd = ymdInTimeZone(now, timeZone)
  const index = monthsBetween(startYmd, todayYmd)
  const periodStartYmd = addMonthsYmd(startYmd, index)
  const periodEndYmd = addMonthsYmd(startYmd, index + 1)
  let daysLeft = 0
  let cursor = todayYmd
  while (cursor < periodEndYmd && daysLeft < 40) {
    daysLeft += 1
    cursor = addCalendarDays(cursor, 1)
  }
  if (todayYmd >= periodEndYmd) daysLeft = 0

  return {
    cycleNumber: index + 1,
    periodStart: new Date(`${periodStartYmd}T00:00:00.000Z`),
    periodEnd: new Date(`${periodEndYmd}T00:00:00.000Z`),
    daysLeft,
  }
}

export function cycleByNumber(startDate: Date | string, cycleNumber: number, timeZone = DEFAULT_TZ) {
  const n = Math.max(1, cycleNumber)
  const startYmd = typeof startDate === 'string' ? String(startDate).slice(0, 10) : ymdInTimeZone(startDate, timeZone)
  const periodStartYmd = addMonthsYmd(startYmd, n - 1)
  const periodEndYmd = addMonthsYmd(startYmd, n)
  return {
    cycleNumber: n,
    periodStart: new Date(`${periodStartYmd}T00:00:00.000Z`),
    periodEnd: new Date(`${periodEndYmd}T00:00:00.000Z`),
  }
}
