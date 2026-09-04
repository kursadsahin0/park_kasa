import { BadRequestException, Body, Controller, Get, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth-user'
import { UsersService } from './users.service'
import { LicenseService } from '../license/license.service'

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string
}

class ActivateLicenseDto {
  @IsString()
  @MaxLength(120)
  key!: string
}

class ExportDto {
  @IsBoolean()
  confirm!: boolean
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly license: LicenseService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.findById(user.id)
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto)
  }

  @Post('me/license')
  activate(@CurrentUser() user: AuthUser, @Body() dto: ActivateLicenseDto) {
    return this.license.activate(user.id, dto.key)
  }

  @Post('me/onboarding')
  onboarding(@CurrentUser() user: AuthUser) {
    return this.license.markOnboarding(user.id, true)
  }

  @Post('me/export')
  export(@CurrentUser() user: AuthUser, @Body() dto: ExportDto) {
    if (!dto.confirm) throw new BadRequestException('Yedek için onay gerekli')
    return this.users.exportBackup(user.id)
  }
}
