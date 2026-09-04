import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { AuthGuard } from './auth/auth.guard'
import { UsersModule } from './users/users.module'
import { ParkingLotsModule } from './parking-lots/parking-lots.module'
import { SubscribersModule } from './subscribers/subscribers.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { VisitsModule } from './visits/visits.module'
import { ReservationsModule } from './reservations/reservations.module'
import { SpotsModule } from './spots/spots.module'
import { LicenseModule } from './license/license.module'
import { HealthController } from './health.controller'
import { MetaController } from './meta/meta.controller'
import { AuditInterceptor } from './http/audit.interceptor'
import { RequestLogMiddleware } from './http/request-log.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL') ?? 60_000),
            limit: Number(config.get('THROTTLE_LIMIT') ?? 120),
          },
        ],
      }),
    }),
    LicenseModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ParkingLotsModule,
    SubscribersModule,
    VisitsModule,
    ReservationsModule,
    SpotsModule,
    DashboardModule,
  ],
  controllers: [HealthController, MetaController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLogMiddleware).forRoutes('*')
  }
}
