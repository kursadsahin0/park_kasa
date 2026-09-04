import { Module } from '@nestjs/common'
import { SpotsModule } from '../spots/spots.module'
import { VisitsController } from './visits.controller'
import { VisitsService } from './visits.service'
import { LicenseModule } from '../license/license.module'

@Module({
  imports: [SpotsModule, LicenseModule],
  controllers: [VisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
