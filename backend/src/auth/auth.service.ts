import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { LicenseService } from '../license/license.service'
import { UsersService } from '../users/users.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly license: LicenseService,
    private readonly users: UsersService,
  ) {}

  async register(input: { email: string; password: string; fullName: string; licenseKey: string }) {
    const email = input.email.trim().toLowerCase()
    const licenseKey = input.licenseKey.trim()
    this.license.parseForEmail(licenseKey, email)
    await this.license.assertKeyFree(licenseKey)

    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '')
    const serviceRole = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRole || supabaseUrl.includes('YOUR_PROJECT') || serviceRole.includes('your-service-role')) {
      throw new ServiceUnavailableException('Kayıt kapalı; sunucu Auth yönetimi eksik')
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName.trim(),
        license_key: licenseKey,
      },
    })
    if (error || !data.user) {
      throw new BadRequestException('Bu e-posta ile kayıt olunamadı')
    }

    try {
      await this.users.ensureFromAuth({
        id: data.user.id,
        email,
        fullName: input.fullName.trim(),
        licenseKey,
      })
    } catch (err) {
      await admin.auth.admin.deleteUser(data.user.id)
      throw err
    }

    return { ok: true }
  }
}
