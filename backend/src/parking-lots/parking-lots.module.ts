import { Module } from '@nestjs/common'
import { ParkingLotsController } from './parking-lots.controller'
import { ParkingLotsService } from './parking-lots.service'
import { LicenseModule } from '../license/license.module'

@Module({
  imports: [LicenseModule],
  controllers: [ParkingLotsController],
  providers: [ParkingLotsService],
  exports: [ParkingLotsService],
})
export class ParkingLotsModule {}
