import { describe, expect, it } from 'vitest'
import { formatPlate, normalizePlate, platesEqual } from './plates'

describe('plates', () => {
  it('plakayı normalize eder', () => {
    expect(normalizePlate('34 abc 123')).toBe('34ABC123')
  })

  it('eşitliği boşluksuz bakar', () => {
    expect(platesEqual('34 ABC 123', '34abc123')).toBe(true)
  })

  it('TR biçiminde yazar', () => {
    expect(formatPlate('34abc123')).toBe('34 ABC 123')
  })
})
