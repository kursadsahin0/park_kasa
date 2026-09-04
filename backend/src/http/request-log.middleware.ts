import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import type { AuthUser } from '../auth/auth-user'

@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
    const started = Date.now()
    res.on('finish', () => {
      const path = req.originalUrl?.split('?')[0] || req.path
      if (path === '/api/health') return
      const user = req.user?.id ?? '-'
      this.logger.log(
        `${req.method} ${path} ${res.statusCode} ${Date.now() - started}ms user=${user}`,
      )
    })
    next()
  }
}
