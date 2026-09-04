import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module'
import { LicenseModule } from '../license/license.module'
import { AuthGuard } from './auth.guard'
import { RolesGuard } from './roles.guard'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

@Module({
  imports: [UsersModule, LicenseModule],
  controllers: [AuthController],
  providers: [AuthGuard, RolesGuard, AuthService],
  exports: [AuthGuard, RolesGuard, UsersModule],
})
export class AuthModule {}
