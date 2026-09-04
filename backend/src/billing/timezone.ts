export const DEFAULT_TZ = 'Europe/Istanbul'

function tzParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

function tzOffsetMs(date: Date, timeZone: string) {
  const p = tzParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - date.getTime()
}

export function ymdInTimeZone(date: Date, timeZone = DEFAULT_TZ) {
  const p = tzParts(date, timeZone)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function hourInTimeZone(date: Date, timeZone = DEFAULT_TZ) {
  return tzParts(date, timeZone).hour
}

export function wallTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0)
  const instant = naive - tzOffsetMs(new Date(naive), timeZone)
  return new Date(naive - tzOffsetMs(new Date(instant), timeZone))
}

export function addCalendarDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`
}

export function parseYmd(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return { year, month, day }
}
