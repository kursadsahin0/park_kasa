import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth-user'
import { CheckoutDto } from './dto/checkout.dto'
import { VisitsService } from './visits.service'
import { COLLECTABLE_METHODS } from '../billing/collectable-methods'

class CheckInDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string

  @IsOptional()
  @IsUUID()
  reservationId?: string
}

class AdjustVisitDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalPrice?: number

  @IsOptional()
  @IsIn([...COLLECTABLE_METHODS])
  method?: (typeof COLLECTABLE_METHODS)[number]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

class CancelVisitDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

@ApiTags('visits')
@ApiBearerAuth()
@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Get('open')
  open(@CurrentUser() user: AuthUser, @Query('parkingLotId') parkingLotId?: string) {
    return this.visits.listOpen(user.id, parkingLotId)
  }

  @Get('today')
  today(@CurrentUser() user: AuthUser, @Query('parkingLotId') parkingLotId?: string) {
    return this.visits.listToday(user.id, parkingLotId)
  }

  @Get('closed')
  closed(@CurrentUser() user: AuthUser, @Query('parkingLotId') parkingLotId?: string) {
    return this.visits.listClosedToday(user.id, parkingLotId)
  }

  @Get('history')
  history(
    @CurrentUser() user: AuthUser,
    @Query('plate') plate: string,
    @Query('parkingLotId') parkingLotId?: string,
  ) {
    return this.visits.history(user.id, plate, parkingLotId)
  }

  @Post('check-in')
  checkIn(@CurrentUser() user: AuthUser, @Body() dto: CheckInDto) {
    return this.visits.checkIn(user.id, dto)
  }

  @Post(':id/checkout')
  checkout(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CheckoutDto) {
    return this.visits.checkout(user.id, id, dto)
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelVisitDto) {
    return this.visits.cancel(user.id, id, dto.reason)
  }

  @Patch(':id')
  adjust(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AdjustVisitDto) {
    return this.visits.adjust(user.id, id, dto)
  }

  @Get(':id/receipt')
  receipt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.visits.receipt(user.id, id)
  }
}
