import { platesEqual } from '../plates'

export type SpotState = 'empty' | 'occupied' | 'reserved'

export type SpotCell = {
  code: string
  state: SpotState
  kind: 'daily' | 'subscriber' | null
  plate: string | null
  fullName: string | null
  visitId: string | null
}

export type Occupant = {
  id?: string
  plate: string
  fullName?: string | null
  spotCode?: string | null
  isSubscriber?: boolean
}

export type SubscriberSeat = {
  plate: string
  fullName: string
  spotCode?: string | null
}

export class SpotConflictError extends Error {
  constructor(public readonly reason: 'TAKEN' | 'RESERVED' | 'FULL') {
    super(reason)
  }
}

export function normalizeSpotCode(value?: string | null) {
  const v = String(value || '').trim().toUpperCase()
  return v || null
}

export function generateSpotCodes(totalSpots: number, prefix?: string | null) {
  const p = normalizeSpotCode(prefix) || ''
  const n = Math.max(0, Math.min(Number(totalSpots) || 0, 500))
  return Array.from({ length: n }, (_, i) => `${p}${i + 1}`)
}

export function buildSpotMap(input: {
  totalSpots: number
  spotPrefix?: string | null
  subscribers: SubscriberSeat[]
  visits: Occupant[]
}) {
  const codes = generateSpotCodes(input.totalSpots, input.spotPrefix)
  const known = new Set(codes)
  const extra = new Set<string>()
  const visitBySpot = new Map<string, Occupant>()
  const subBySpot = new Map<string, SubscriberSeat>()

  for (const visit of input.visits) {
    const code = normalizeSpotCode(visit.spotCode)
    if (!code) continue
    visitBySpot.set(code, visit)
    if (!known.has(code)) extra.add(code)
  }

  for (const subscriber of input.subscribers) {
    const code = normalizeSpotCode(subscriber.spotCode)
    if (!code) continue
    subBySpot.set(code, subscriber)
    if (!known.has(code)) extra.add(code)
  }

  const spots: SpotCell[] = [...codes, ...[...extra].sort()].map((code) => {
    const visit = visitBySpot.get(code)
    const subscriber = subBySpot.get(code)
    if (visit) {
      return {
        code,
        state: 'occupied',
        kind: visit.isSubscriber ? 'subscriber' : 'daily',
        plate: visit.plate,
        fullName: visit.fullName || null,
        visitId: visit.id || null,
      }
    }
    if (subscriber) {
      return {
        code,
        state: 'reserved',
        kind: 'subscriber',
        plate: subscriber.plate,
        fullName: subscriber.fullName,
        visitId: null,
      }
    }
    return {
      code,
      state: 'empty',
      kind: null,
      plate: null,
      fullName: null,
      visitId: null,
    }
  })

  return {
    spots,
    emptyCount: spots.filter((s) => s.state === 'empty').length,
    occupiedCount: spots.filter((s) => s.state === 'occupied').length,
    reservedCount: spots.filter((s) => s.state === 'reserved').length,
    unassignedInside: input.visits.filter((v) => !normalizeSpotCode(v.spotCode)).length,
  }
}

export function pickAssignedSpot(
  spots: SpotCell[],
  opts: {
    requested?: string | null
    subscriberSpot?: string | null
    plate: string
    requireEmpty: boolean
  },
) {
  const wanted = normalizeSpotCode(opts.requested) || normalizeSpotCode(opts.subscriberSpot)

  if (wanted) {
    const cell = spots.find((s) => s.code === wanted)
    if (cell?.state === 'occupied') throw new SpotConflictError('TAKEN')
    if (cell?.state === 'reserved' && !platesEqual(cell.plate, opts.plate)) {
      throw new SpotConflictError('RESERVED')
    }
    return wanted
  }

  const empty = spots.find((s) => s.state === 'empty')
  if (empty) return empty.code
  if (opts.requireEmpty) throw new SpotConflictError('FULL')
  return null
}
