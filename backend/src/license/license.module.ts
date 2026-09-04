import { Module } from '@nestjs/common'
import { LicenseService } from './license.service'
import { LicensesController } from './licenses.controller'

@Module({
  controllers: [LicensesController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
