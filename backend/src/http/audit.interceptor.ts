import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { catchError, tap } from 'rxjs/operators'
import { throwError } from 'rxjs'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthUser } from '../auth/auth-user'

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp()
    const req = http.getRequest<Request & { user?: AuthUser }>()
    const res = http.getResponse<Response>()
    const method = req.method.toUpperCase()
    const path = (req.originalUrl || req.url || '').split('?')[0]

    if (!MUTATING.has(method) || path === '/api/health') {
      return next.handle()
    }

    const write = (status: number) => {
      const userId = req.user?.id
      const entityId =
        typeof req.params?.id === 'string'
          ? req.params.id
          : typeof req.body?.parkingLotId === 'string'
            ? req.body.parkingLotId
            : undefined
      const ip =
        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket?.remoteAddress

      void this.prisma.auditLog
        .create({
          data: {
            userId: userId || null,
            method,
            path,
            action: `${method} ${path}`,
            entityId,
            status,
            ip: ip || null,
          },
        })
        .catch(() => undefined)
    }

    return next.handle().pipe(
      tap(() => write(res.statusCode || 200)),
      catchError((err: { status?: number; statusCode?: number }) => {
        write(err.status ?? err.statusCode ?? 500)
        return throwError(() => err)
      }),
    )
  }
}
