import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from '../user.entity';
import {
  Gym,
  GymLicenseStatus,
} from '../gym/gym.entity';
import { OrganizationUser } from '../organization/organization-user.entity';
import { UserGymAccess } from '../organization/user-gym-access.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Gym)
    private readonly gymRepo: Repository<Gym>,

    @InjectRepository(OrganizationUser)
    private readonly organizationUserRepo:
      Repository<OrganizationUser>,

    @InjectRepository(UserGymAccess)
    private readonly userGymAccessRepo:
      Repository<UserGymAccess>,

    private readonly jwtService: JwtService,
  ) {}

  private permissionsForRole(
    role: UserRole,
  ) {
    const all = {
      dashboard: true,
      members: true,
      packages: true,
      checkIn: true,
      finance: true,
      accessCards: true,
      cafe: true,
      staff: true,
      sms: true,
      devices: true,
      turnstiles: true,
      lockers: true,
      novaAi: true,
      notifications: true,
      reports: true,
      auditLogs: true,
      settings: true,
    };

    if (
      role ===
      UserRole.SUPER_ADMIN
    ) {
      return all;
    }

    if (
      role ===
      UserRole.GYM_ADMIN
    ) {
      return all;
    }

    return {
      dashboard: true,
      members: true,
      packages: false,
      checkIn: true,
      finance: false,
      accessCards: true,
      cafe: false,
      staff: false,
      sms: false,
      devices: false,
      turnstiles: false,
      lockers: false,
      novaAi: false,
      notifications: true,
      reports: false,
      auditLogs: false,
      settings: false,
    };
  }

  private async registerFailedLogin(
    user: User,
  ) {
    const attempts =
      Number(
        user.failedLoginAttempts ||
          0,
      ) + 1;

    user.failedLoginAttempts =
      attempts;

    if (attempts >= 5) {
      user.lockedUntil =
        new Date(
          Date.now() +
            15 *
              60 *
              1000,
        );

      user.failedLoginAttempts =
        0;
    }

    await this.userRepo.save(
      user,
    );
  }

  // KULLANICI KAYDI
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    gymId?: string;
  }) {
    if (
      !data.email ||
      !data.password ||
      !data.firstName ||
      !data.lastName
    ) {
      throw new BadRequestException(
        'Ad, soyad, e-posta ve şifre zorunludur.',
      );
    }

    if (data.password.length < 6) {
      throw new BadRequestException(
        'Şifre en az 6 karakter olmalıdır.',
      );
    }

    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await this.userRepo.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Bu e-posta adresi zaten kayıtlı.',
      );
    }

    const role = data.role ?? UserRole.GYM_ADMIN;

    /*
     * Güvenlik nedeniyle normal kayıt endpoint'i üzerinden
     * SUPER_ADMIN oluşturulamaz.
     *
     * SUPER_ADMIN hesabını daha sonra özel bir seed veya
     * yalnızca Super Admin'e açık endpoint ile oluşturacağız.
     */
    if (role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Bu işlem üzerinden Super Admin oluşturulamaz.',
      );
    }

    if (
      role !== UserRole.GYM_ADMIN &&
      role !== UserRole.STAFF
    ) {
      throw new BadRequestException(
        'Geçersiz kullanıcı rolü.',
      );
    }

    if (!data.gymId) {
      throw new BadRequestException(
        'Salon yöneticisi ve personel için gymId zorunludur.',
      );
    }

    const gym = await this.gymRepo.findOne({
      where: {
        id: data.gymId,
      },
    });

    if (!gym) {
      throw new BadRequestException(
        'Bağlanmak istenen spor salonu bulunamadı.',
      );
    }

    if (!gym.isActive) {
      throw new BadRequestException(
        'Bu spor salonu aktif değildir.',
      );
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      10,
    );

    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role,
      gymId: gym.id,
      isActive: true,
    });

    const savedUser = await this.userRepo.save(user);

    return this.removePassword(savedUser);
  }

  // GİRİŞ
  async login(
    email: string,
    password: string,
    ipAddress?: string,
  ) {
    if (!email || !password) {
      throw new BadRequestException(
        'E-posta ve şifre zorunludur.',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepo.findOne({
      where: {
        email: normalizedEmail,
      },
      relations: {
        gym: {
          organization: true,
        },
        organizationMemberships: {
          organization: true,
        },
        gymAccesses: {
          gym: true,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'E-posta veya şifre hatalı.',
      );
    }

    if (
      user.lockedUntil &&
      new Date(
        user.lockedUntil,
      ).getTime() >
        Date.now()
    ) {
      const remainingMinutes =
        Math.max(
          1,
          Math.ceil(
            (
              new Date(
                user.lockedUntil,
              ).getTime() -
              Date.now()
            ) /
              60000,
          ),
        );

      throw new ForbiddenException(
        `Çok fazla hatalı giriş yapıldı. ${remainingMinutes} dakika sonra tekrar deneyin.`,
      );
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordCorrect) {
      await this.registerFailedLogin(
        user,
      );

      throw new UnauthorizedException(
        'E-posta veya şifre hatalı.',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Kullanıcı hesabınız pasif durumdadır.',
      );
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt =
      new Date();
    user.lastLoginIp =
      ipAddress || null;

    await this.userRepo.save(
      user,
    );

    /*
     * Eski sistemde kullanılan MANAGER rolünü
     * yeni GYM_ADMIN rolüne dönüştürüyoruz.
     */
    if ((user.role as string) === 'MANAGER') {
      user.role = UserRole.GYM_ADMIN;
      await this.userRepo.save(user);
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      if (!user.gymId || !user.gym) {
        throw new ForbiddenException(
          'Kullanıcı herhangi bir spor salonuna bağlı değildir.',
        );
      }

      if (!user.gym.isActive) {
        throw new ForbiddenException(
          'Spor salonunuz pasif duruma alınmıştır.',
        );
      }

      this.checkGymLicense(user.gym);
    }

    const organizationMembership =
      user.organizationMemberships?.find(
        (item) =>
          item.isActive,
      ) || null;

    const authorizedGymIds = [
      ...new Set([
        ...(user.gymId
          ? [user.gymId]
          : []),
        ...(
          user.gymAccesses || []
        )
          .filter(
            (item) =>
              item.isActive,
          )
          .map(
            (item) =>
              item.gymId,
          ),
      ]),
    ];

    const permissions =
      this.permissionsForRole(
        user.role,
      );

    const tokenPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      tokenVersion:
        user.tokenVersion || 0,
      permissions,
      organizationId:
        organizationMembership
          ?.organizationId ||
        user.gym
          ?.organizationId ||
        null,
      accessAllGyms:
        organizationMembership
          ?.accessAllGyms ||
        false,
      authorizedGymIds,
    };

    const accessToken =
      this.jwtService.sign(tokenPayload);

    return {
      access_token: accessToken,

      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gymId: user.gymId,
        permissions,
        lastLoginAt:
          user.lastLoginAt,

        organization:
          organizationMembership
            ?.organization ||
          user.gym?.organization ||
          null,

        accessAllGyms:
          organizationMembership
            ?.accessAllGyms ||
          false,

        authorizedGyms:
          (
            user.gymAccesses || []
          )
            .filter(
              (item) =>
                item.isActive,
            )
            .map(
              (item) => ({
                id:
                  item.gym.id,
                name:
                  item.gym.name,
                city:
                  item.gym.city,
                role:
                  item.role,
              }),
            ),

        gym: user.gym
          ? {
              id: user.gym.id,
              name: user.gym.name,
              slug: user.gym.slug,
              subscriptionPlan:
                user.gym.subscriptionPlan,
              licenseStartDate:
                user.gym.licenseStartDate,
              licenseEndDate:
                user.gym.licenseEndDate,
              licenseStatus:
                user.gym.licenseStatus,
              billingCycle:
                user.gym.billingCycle,
              trialEndDate:
                user.gym.trialEndDate,
              lastPaymentDate:
                user.gym.lastPaymentDate,
              nextPaymentDate:
                user.gym.nextPaymentDate,
              logoUrl: user.gym.logoUrl,
            }
          : null,
      },
    };
  }

  async profile(
    userId: string,
  ) {
    const user =
      await this.userRepo.findOne({
        where: {
          id: userId,
        },
        relations: {
          gym: true,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      throw new UnauthorizedException(
        'Oturum geçersiz veya kullanıcı pasif.',
      );
    }

    return {
      id: user.id,
      email: user.email,
      firstName:
        user.firstName,
      lastName:
        user.lastName,
      role: user.role,
      gymId: user.gymId,
      permissions:
        this.permissionsForRole(
          user.role,
        ),
      lastLoginAt:
        user.lastLoginAt,
      gym: user.gym
        ? {
            id: user.gym.id,
            name:
              user.gym.name,
            subscriptionPlan:
              user.gym
                .subscriptionPlan,
            licenseEndDate:
              user.gym
                .licenseEndDate,
            licenseStatus:
              user.gym
                .licenseStatus,
          }
        : null,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (
      !currentPassword ||
      !newPassword
    ) {
      throw new BadRequestException(
        'Mevcut şifre ve yeni şifre zorunludur.',
      );
    }

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Yeni şifre en az 8 karakter olmalıdır.',
      );
    }

    if (
      !/[A-ZÇĞİÖŞÜ]/.test(
        newPassword,
      ) ||
      !/[a-zçğıöşü]/.test(
        newPassword,
      ) ||
      !/[0-9]/.test(
        newPassword,
      )
    ) {
      throw new BadRequestException(
        'Yeni şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.',
      );
    }

    const user =
      await this.userRepo.findOne({
        where: {
          id: userId,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      throw new UnauthorizedException(
        'Kullanıcı bulunamadı veya hesap pasif.',
      );
    }

    const currentMatches =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );

    if (!currentMatches) {
      throw new UnauthorizedException(
        'Mevcut şifre hatalı.',
      );
    }

    const sameAsCurrent =
      await bcrypt.compare(
        newPassword,
        user.passwordHash,
      );

    if (sameAsCurrent) {
      throw new BadRequestException(
        'Yeni şifre mevcut şifreyle aynı olamaz.',
      );
    }

    user.passwordHash =
      await bcrypt.hash(
        newPassword,
        12,
      );

    user.tokenVersion =
      Number(
        user.tokenVersion || 0,
      ) + 1;

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    await this.userRepo.save(
      user,
    );

    return {
      success: true,
      message:
        'Şifreniz başarıyla güncellendi. Güvenlik nedeniyle yeniden giriş yapın.',
      requireRelogin: true,
    };
  }

  private checkGymLicense(gym: Gym): void {
    const now = new Date();

    if (
      gym.licenseStatus ===
      GymLicenseStatus.SUSPENDED
    ) {
      throw new ForbiddenException(
        'Spor salonunuzun lisansı askıya alınmıştır.',
      );
    }

    if (
      gym.licenseStatus ===
      GymLicenseStatus.EXPIRED
    ) {
      throw new ForbiddenException(
        'Spor salonunun NovaPlus+ lisans süresi sona ermiştir.',
      );
    }

    if (
      gym.licenseStatus ===
        GymLicenseStatus.TRIAL &&
      gym.trialEndDate &&
      new Date(
        gym.trialEndDate,
      ) < now
    ) {
      throw new ForbiddenException(
        'Spor salonunun deneme süresi sona ermiştir.',
      );
    }

    if (
      gym.licenseStartDate &&
      new Date(
        gym.licenseStartDate,
      ) > now
    ) {
      throw new ForbiddenException(
        'Spor salonunun lisansı henüz başlamamıştır.',
      );
    }

    if (
      gym.licenseEndDate &&
      new Date(
        gym.licenseEndDate,
      ) < now
    ) {
      throw new ForbiddenException(
        'Spor salonunun NovaPlus+ lisans süresi sona ermiştir.',
      );
    }
  }

  private removePassword(user: User) {
    const {
      passwordHash: _passwordHash,
      ...safeUser
    } = user;

    return safeUser;
  }
}