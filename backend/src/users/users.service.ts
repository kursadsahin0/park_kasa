import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { LicenseService } from '../license/license.service'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly license: LicenseService,
  ) {}

  async ensureFromAuth(input: {
    id: string
    email: string
    fullName?: string | null
    licenseKey?: string | null
  }) {
    const existing = await this.prisma.user.findUnique({ where: { id: input.id } })
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email: input.email,
          fullName: input.fullName ?? undefined,
        },
      })
    }

    const emailTaken = await this.prisma.user.findUnique({ where: { email: input.email } })
    if (emailTaken) {
      throw new ForbiddenException('Bu e-posta ile kayıtlı hesap var; giriş yapın')
    }

    if (!input.licenseKey?.trim()) {
      throw new ForbiddenException('Yeni hesap için bu e-postaya kesilmiş lisans anahtarı gerekli')
    }

    await this.license.assertKeyFree(input.licenseKey)
    const grant = this.license.grantFields(input.licenseKey, input.email)
    return this.prisma.user.create({
      data: {
        id: input.id,
        email: input.email,
        fullName: input.fullName ?? null,
        role: 'OWNER',
        ...grant,
      },
    })
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        licensePlan: true,
        licenseExpiresAt: true,
        maxLots: true,
        onboardingDone: true,
      },
    })
    if (!user) return null
    const license = await this.license.snapshot(id)
    return { ...user, license }
  }

  updateProfile(id: string, data: { fullName?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    })
  }

  async exportBackup(ownerId: string) {
    const [user, lots] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, email: true, fullName: true, phone: true, licensePlan: true, createdAt: true },
      }),
      this.prisma.parkingLot.findMany({
        where: { ownerId },
        include: {
          subscribers: { include: { payments: true } },
          visits: true,
          reservations: true,
          cashAdjustments: true,
          dayCloses: true,
        },
      }),
    ])
    return {
      exportedAt: new Date().toISOString(),
      product: 'ParkKasa',
      user,
      lots,
    }
  }
}
