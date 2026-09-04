import { Module } from '@nestjs/common'
import { SubscribersController } from './subscribers.controller'
import { SubscribersService } from './subscribers.service'
import { LicenseModule } from '../license/license.module'

@Module({
  imports: [LicenseModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
})
export class SubscribersModule {}
