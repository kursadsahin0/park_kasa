import { PaymentMethod } from '@prisma/client'

export type ReceiptKind = 'VISIT' | 'SUBSCRIBER'

export type Receipt = {
  kind: ReceiptKind
  title: string
  receiptNo: string
  lotName: string
  lotAddress?: string | null
  plate: string
  fullName?: string | null
  issuedAt: Date
  method: PaymentMethod | null
  total: number
  lines: { label: string; value: string }[]
}

function shortId(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function visitReceipt(visit: {
  id: string
  plate: string
  fullName?: string | null
  startedAt: Date
  endedAt: Date | null
  billedHours: number | null
  hourlyRate: { toString(): string } | number | null
  totalPrice: { toString(): string } | number | null
  isSubscriber: boolean
  method: PaymentMethod | null
  spotCode?: string | null
  lostTicket?: boolean
  parkingLot: { name: string; address?: string | null }
}): Receipt {
  const total = visit.isSubscriber ? 0 : Number(visit.totalPrice || 0)
  const lines = [
    { label: 'Giriş', value: visit.startedAt.toISOString() },
    { label: 'Çıkış', value: (visit.endedAt ?? new Date()).toISOString() },
  ]
  if (visit.spotCode) lines.push({ label: 'Yer', value: visit.spotCode })
  if (visit.isSubscriber) {
    lines.push({ label: 'Tür', value: 'Abone' })
    lines.push({ label: 'Ücret', value: '0' })
  } else if (visit.lostTicket) {
    lines.push({ label: 'Tür', value: 'Kayıp bilet' })
  } else {
    lines.push({ label: 'Süre', value: `${visit.billedHours ?? 0} saat` })
    lines.push({ label: 'Saatlik', value: String(Number(visit.hourlyRate || 0)) })
  }

  return {
    kind: 'VISIT',
    title: 'İşletme fişi (mali belge değildir)',
    receiptNo: `C-${shortId(visit.id)}`,
    lotName: visit.parkingLot.name,
    lotAddress: visit.parkingLot.address,
    plate: visit.plate,
    fullName: visit.fullName,
    issuedAt: visit.endedAt ?? new Date(),
    method: visit.isSubscriber ? null : visit.method,
    total,
    lines,
  }
}

export function paymentReceipt(payment: {
  id: string
  amount: { toString(): string } | number
  cycleNumber: number
  periodStart: Date
  periodEnd: Date
  paidAt: Date
  method: PaymentMethod
  subscriber: {
    plate: string
    fullName: string
    parkingLot: { name: string; address?: string | null }
  }
}): Receipt {
  return {
    kind: 'SUBSCRIBER',
    title: 'Abone tahsilat (mali belge değildir)',
    receiptNo: `A-${shortId(payment.id)}`,
    lotName: payment.subscriber.parkingLot.name,
    lotAddress: payment.subscriber.parkingLot.address,
    plate: payment.subscriber.plate,
    fullName: payment.subscriber.fullName,
    issuedAt: payment.paidAt,
    method: payment.method,
    total: Number(payment.amount),
    lines: [
      { label: 'Dönem', value: String(payment.cycleNumber) },
      { label: 'Başlangıç', value: payment.periodStart.toISOString() },
      { label: 'Bitiş', value: payment.periodEnd.toISOString() },
    ],
  }
}
