import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth-user'
import { UpsertParkingLotDto } from './dto/upsert-parking-lot.dto'
import { ParkingLotsService } from './parking-lots.service'

@ApiTags('parking-lots')
@ApiBearerAuth()
@Controller('parking-lots')
export class ParkingLotsController {
  constructor(private readonly lots: ParkingLotsService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.lots.listMine(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertParkingLotDto) {
    return this.lots.create(user.id, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertParkingLotDto,
  ) {
    return this.lots.update(user.id, id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.lots.remove(user.id, id)
  }
}
