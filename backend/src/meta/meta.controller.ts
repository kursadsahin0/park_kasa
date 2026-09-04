import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { Public } from '../auth/public.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth-user'
import { PrismaService } from '../prisma/prisma.service'
import { VERSION } from './meta'

class SupportDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsIn(['BUG', 'DATA_DELETION', 'OTHER'])
  kind?: string

  @IsString()
  @MaxLength(4000)
  message!: string
}

@ApiTags('meta')
@Controller()
export class MetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get('meta')
  meta() {
    return {
      product: 'ParkKasa',
      pitch: 'Otopark kasa + abone + gün sonu — web paneli.',
      version: VERSION,
      plans: [
        { id: 'kasa', name: 'Kasa', price: '24.900 ₺', period: 'yıl', lots: 1 },
        { id: 'isletme', name: 'İşletme', price: '49.900 ₺', period: 'yıl', lots: 5 },
      ],
    }
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('support')
  createTicket(@Body() dto: SupportDto, @CurrentUser() user: AuthUser | undefined) {
    return this.prisma.supportTicket.create({
      data: {
        email: dto.email,
        kind: dto.kind || 'OTHER',
        message: dto.message,
        userId: user?.id,
      },
      select: { id: true, createdAt: true },
    })
  }
}
