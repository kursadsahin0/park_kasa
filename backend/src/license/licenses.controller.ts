import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { IsEmail, IsString, MaxLength } from 'class-validator'
import { Public } from '../auth/public.decorator'
import { LicenseService } from './license.service'

class LicensePreviewDto {
  @IsEmail()
  email!: string

  @IsString()
  @MaxLength(120)
  key!: string
}

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly license: LicenseService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('preview')
  preview(@Body() dto: LicensePreviewDto) {
    return this.license.preview(dto.key, dto.email)
  }
}
