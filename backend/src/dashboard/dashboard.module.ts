import { Module } from '@nestjs/common'
import { SpotsModule } from '../spots/spots.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [SpotsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
