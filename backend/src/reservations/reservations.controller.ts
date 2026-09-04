import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth-user'
import { ReservationsService } from './reservations.service'

class CreateReservationDto {
  @IsUUID()
  parkingLotId!: string

  @IsString()
  @MaxLength(20)
  plate!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  spotCode?: string

  @IsDateString()
  startsAt!: string

  @IsDateString()
  endsAt!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('parkingLotId') parkingLotId?: string) {
    return this.reservations.list(user.id, parkingLotId)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(user.id, dto)
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reservations.cancel(user.id, id)
  }
}
