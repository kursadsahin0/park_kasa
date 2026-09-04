import { describe, expect, it } from 'vitest'
import { shouldExposeSwagger } from './swagger'

describe('shouldExposeSwagger', () => {
  it('productionda kapalıdır', () => {
    expect(shouldExposeSwagger({ NODE_ENV: 'production' })).toBe(false)
  })

  it('developmentte açıktır', () => {
    expect(shouldExposeSwagger({ NODE_ENV: 'development' })).toBe(true)
  })

  it('SWAGGER_ENABLED ile productionda açılabilir', () => {
    expect(shouldExposeSwagger({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true)
  })
})
