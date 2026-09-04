import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'
import { Public } from './public.decorator'
import { AuthService } from './auth.service'

class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string

  @IsString()
  @MaxLength(120)
  licenseKey!: string
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }
}
