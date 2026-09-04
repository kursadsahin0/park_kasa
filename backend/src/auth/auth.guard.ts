import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { IS_PUBLIC_KEY } from './public.decorator'
import { UsersService } from '../users/users.service'
import type { AuthUser } from './auth-user'

type TokenPayload = JWTPayload & {
  sub?: string
  email?: string
  user_metadata?: { full_name?: string; name?: string; license_key?: string }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string }
      user?: AuthUser
    }>()
    const header = request.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

    if (!token) {
      if (isPublic) return true
      throw new UnauthorizedException('Oturum gerekli')
    }

    try {
      const payload = await this.verifyToken(token)
      if (!payload.sub) throw new Error('sub yok')

      const user = await this.users.ensureFromAuth({
        id: payload.sub,
        email: payload.email ?? `${payload.sub}@users.local`,
        fullName: payload.user_metadata?.full_name ?? payload.user_metadata?.name,
        licenseKey: payload.user_metadata?.license_key,
      })

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      }
      return true
    } catch (err) {
      if (isPublic) return true
      if (err instanceof ForbiddenException) throw err
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum')
    }
  }

  private async verifyToken(token: string): Promise<TokenPayload> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '')
    if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT')) {
      throw new UnauthorizedException('Supabase JWKS yapılandırılmadı')
    }
    this.jwks ??= createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    })
    return payload as TokenPayload
  }
}
