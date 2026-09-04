import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { addDays, parseLicenseKey, type LicensePlan } from './license'

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get enforce() {
    return this.config.get('LICENSE_ENFORCE') !== 'false'
  }

  secret() {
    return this.config.get<string>('LICENSE_SECRET') || ''
  }

  trialDays() {
    return Number(this.config.get('LICENSE_TRIAL_DAYS') ?? 0)
  }

  trialFields() {
    const days = this.trialDays()
    return {
      licensePlan: days > 0 ? 'trial' : 'kasa',
      maxLots: 1,
      licenseExpiresAt: days > 0 ? addDays(new Date(), days) : new Date(0),
    }
  }

  parseForEmail(key: string, email: string) {
    try {
      return parseLicenseKey(key, this.secret(), email)
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Geçersiz lisans')
    }
  }

  async assertKeyFree(key: string, exceptUserId?: string) {
    const taken = await this.prisma.user.findFirst({
      where: { licenseKey: key.trim(), ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}) },
      select: { id: true },
    })
    if (taken) throw new BadRequestException('Bu lisans anahtarı başka hesapta kayıtlı')
  }

  async snapshot(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        licensePlan: true,
        licenseExpiresAt: true,
        maxLots: true,
        onboardingDone: true,
        _count: { select: { ownedLots: true } },
      },
    })
    if (!user) return null
    const expired = this.enforce && Boolean(user.licenseExpiresAt && user.licenseExpiresAt < new Date())
    return {
      plan: user.licensePlan,
      expiresAt: user.licenseExpiresAt,
      maxLots: user.maxLots,
      lotCount: user._count.ownedLots,
      onboardingDone: user.onboardingDone,
      expired,
      enforce: this.enforce,
    }
  }

  async assertWritable(userId: string) {
    if (!this.enforce) return
    const snap = await this.snapshot(userId)
    if (snap?.expired) {
      throw new ForbiddenException('Lisans süresi doldu. Yeni giriş ve tahsilat alınamaz; çıkış ve yedek alınabilir.')
    }
  }

  async assertCanCreateLot(userId: string) {
    await this.assertWritable(userId)
    const snap = await this.snapshot(userId)
    if (!snap) return
    if (snap.lotCount >= snap.maxLots) {
      throw new ForbiddenException(`Bu lisans en fazla ${snap.maxLots} tesis kapsar`)
    }
  }

  async activate(userId: string, key: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user) throw new BadRequestException('Kullanıcı yok')
    const parsed = this.parseForEmail(key, user.email)
    await this.assertKeyFree(key.trim(), userId)
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        licenseKey: key.trim(),
        licensePlan: parsed.plan,
        maxLots: parsed.maxLots,
        licenseExpiresAt: parsed.expiresAt,
      },
      select: {
        licensePlan: true,
        licenseExpiresAt: true,
        maxLots: true,
      },
    })
  }

  grantFields(key: string, email: string) {
    const parsed = this.parseForEmail(key, email)
    return {
      licenseKey: key.trim(),
      licensePlan: parsed.plan,
      maxLots: parsed.maxLots,
      licenseExpiresAt: parsed.expiresAt,
    }
  }

  preview(key: string, email: string) {
    const parsed = this.parseForEmail(key, email)
    return { ok: true, plan: parsed.plan, maxLots: parsed.maxLots, expiresAt: parsed.expiresAt }
  }

  async markOnboarding(userId: string, done = true) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDone: done },
      select: { onboardingDone: true },
    })
  }
}

export type { LicensePlan }
