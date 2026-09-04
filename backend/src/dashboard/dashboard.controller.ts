import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { COLLECTABLE_METHODS } from '../billing/collectable-methods'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth-user'
import { DashboardService } from './dashboard.service'

class DayCloseQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsUUID()
  parkingLotId?: string
}

class CloseDayDto {
  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsUUID()
  parkingLotId?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}

class CashAdjustmentDto {
  @IsUUID()
  parkingLotId!: string

  @Type(() => Number)
  @IsNumber()
  amount!: number

  @IsOptional()
  @IsIn([...COLLECTABLE_METHODS])
  method?: (typeof COLLECTABLE_METHODS)[number]

  @IsString()
  @MaxLength(500)
  reason!: string
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  stats(@CurrentUser() user: AuthUser) {
    return this.dashboard.stats(user.id)
  }

  @Get('spots')
  spots(@CurrentUser() user: AuthUser, @Query('parkingLotId') parkingLotId?: string) {
    return this.dashboard.occupancy(user.id, parkingLotId)
  }

  @Get('report')
  report(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('parkingLotId') parkingLotId?: string,
  ) {
    return this.dashboard.rangeReport(user.id, { from, to, parkingLotId })
  }

  @Get('alerts')
  alerts(@CurrentUser() user: AuthUser) {
    return this.dashboard.alerts(user.id)
  }

  @Post('cash-adjustments')
  cash(@CurrentUser() user: AuthUser, @Body() dto: CashAdjustmentDto) {
    return this.dashboard.addCashAdjustment(user.id, user.id, dto)
  }

  @Get('day-close')
  dayClose(@CurrentUser() user: AuthUser, @Query() query: DayCloseQueryDto) {
    return this.dashboard.dayClose(user.id, query)
  }

  @Post('day-close')
  closeDay(@CurrentUser() user: AuthUser, @Body() dto: CloseDayDto) {
    return this.dashboard.closeDay(user.id, user.id, dto)
  }

  @Post('day-close/reopen')
  reopenDay(@CurrentUser() user: AuthUser, @Body() dto: DayCloseQueryDto) {
    return this.dashboard.reopenDay(user.id, dto)
  }
}
