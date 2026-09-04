export const money = (value) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export const shortDate = (value) =>
  new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value))

export const statusLabel = (status) =>
  ({
    ACTIVE: 'Aktif',
    PENDING: 'Beklemede',
    EXPIRED: 'Süresi doldu',
    SUSPENDED: 'Donduruldu',
    CANCELLED: 'Sonlandırıldı',
  })[status] || status

export const statusColor = (status) =>
  ({
    ACTIVE: 'positive',
    PENDING: 'warning',
    EXPIRED: 'grey',
    SUSPENDED: 'negative',
    CANCELLED: 'grey',
  })[status] || 'grey'

export const methodLabel = (method) =>
  ({
    CASH: 'Nakit',
    CARD: 'Kart',
    TRANSFER: 'Havale',
  })[method] || method

export const dateTime = (value) =>
  new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

export const todayIso = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const calendarDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return shortDate(new Date(y, m - 1, d))
}

export const durationLabel = (startedAt) => {
  const totalSec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h) return `${h} sa ${m} dk ${String(s).padStart(2, '0')} sn`
  if (m) return `${m} dk ${String(s).padStart(2, '0')} sn`
  return `${s} sn`
}
