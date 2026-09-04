import 'reflect-metadata'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { CheckoutDto } from './checkout.dto'

describe('CheckoutDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  })

  it('istemci endedAt gönderirse reddeder', async () => {
    await expect(
      pipe.transform(
        { method: 'CASH', endedAt: '2020-01-01T00:00:00.000Z' },
        { type: 'body', metatype: CheckoutDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('yalnızca ödeme yöntemini kabul eder', async () => {
    await expect(
      pipe.transform({ method: 'CARD' }, { type: 'body', metatype: CheckoutDto }),
    ).resolves.toEqual({ method: 'CARD' })
  })

  it('havale / IBAN yöntemini reddeder', async () => {
    await expect(
      pipe.transform({ method: 'TRANSFER' }, { type: 'body', metatype: CheckoutDto }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('kayıp bilet bayrağını kabul eder', async () => {
    await expect(
      pipe.transform({ method: 'CASH', lostTicket: true }, { type: 'body', metatype: CheckoutDto }),
    ).resolves.toEqual({ method: 'CASH', lostTicket: true })
  })
})
