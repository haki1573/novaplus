import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import {
  Gym,
  GymBillingCycle,
  GymLicenseStatus,
  GymSubscriptionPlan,
} from '../gym/gym.entity';

import { GymLicensePayment } from './gym-license-payment.entity';

import {
  AccessCard,
  AccessCredentialStatus,
  AccessCredentialType,
} from '../card/access-card.entity';

import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import { Organization } from '../organization/organization.entity';
import {
  OrganizationUser,
  OrganizationUserRole,
} from '../organization/organization-user.entity';
import { UserGymAccess } from '../organization/user-gym-access.entity';

import {
  User,
  UserRole,
} from '../user.entity';

import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Gym)
    private readonly gymRepository:
      Repository<Gym>,

    @InjectRepository(User)
    private readonly userRepository:
      Repository<User>,

    @InjectRepository(GymLicensePayment)
    private readonly licensePaymentRepository:
      Repository<GymLicensePayment>,

    @InjectRepository(AccessCard)
    private readonly accessCardRepository:
      Repository<AccessCard>,

    @InjectRepository(GymSmsBalance)
    private readonly smsBalanceRepository:
      Repository<GymSmsBalance>,

    @InjectRepository(Organization)
    private readonly organizationRepository:
      Repository<Organization>,

    @InjectRepository(OrganizationUser)
    private readonly organizationUserRepository:
      Repository<OrganizationUser>,

    @InjectRepository(UserGymAccess)
    private readonly userGymAccessRepository:
      Repository<UserGymAccess>,
  ) {}


  async getOrganizations() {
    const organizations =
      await this.organizationRepository.find({
        relations: {
          gyms: true,
          organizationUsers: {
            user: true,
          },
        },
        order: {
          createdAt: 'DESC',
        },
      });

    return organizations.map(
      (organization) => ({
        id: organization.id,
        name: organization.name,
        companyName:
          organization.companyName,
        taxNumber:
          organization.taxNumber,
        taxOffice:
          organization.taxOffice,
        ownerName:
          organization.ownerName,
        email:
          organization.email,
        phone:
          organization.phone,
        address:
          organization.address,
        city:
          organization.city,
        logoUrl:
          organization.logoUrl,
        maxGyms:
          organization.maxGyms,
        isActive:
          organization.isActive,
        gymCount:
          organization.gyms
            ?.length || 0,
        gyms:
          (
            organization.gyms ||
            []
          ).map((gym) => ({
            id: gym.id,
            name: gym.name,
            city: gym.city,
            isActive:
              gym.isActive,
          })),
        users:
          (
            organization.organizationUsers ||
            []
          ).map(
            (membership) => ({
              id:
                membership.id,
              userId:
                membership.userId,
              name:
                `${membership.user.firstName} ${membership.user.lastName}`,
              email:
                membership.user.email,
              role:
                membership.role,
              accessAllGyms:
                membership.accessAllGyms,
              isActive:
                membership.isActive,
            }),
          ),
        createdAt:
          organization.createdAt,
      }),
    );
  }

  async createOrganization(
    data: {
      name?: string;
      companyName?: string | null;
      taxNumber?: string | null;
      taxOffice?: string | null;
      ownerName?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      logoUrl?: string | null;
      maxGyms?: number;
    },
  ) {
    const name =
      String(
        data.name || '',
      ).trim();

    if (!name) {
      throw new BadRequestException(
        'İşletme adı zorunludur.',
      );
    }

    const existing =
      await this.organizationRepository
        .findOne({
          where: {
            name,
          },
        });

    if (existing) {
      throw new BadRequestException(
        'Bu isimde bir işletme zaten bulunuyor.',
      );
    }

    const maxGyms =
      Number(
        data.maxGyms || 1,
      );

    if (
      !Number.isInteger(maxGyms) ||
      maxGyms < 1
    ) {
      throw new BadRequestException(
        'Şube hakkı en az 1 olmalıdır.',
      );
    }

    const organization =
      this.organizationRepository.create({
        name,
        companyName:
          data.companyName?.trim() ||
          null,
        taxNumber:
          data.taxNumber?.trim() ||
          null,
        taxOffice:
          data.taxOffice?.trim() ||
          null,
        ownerName:
          data.ownerName?.trim() ||
          null,
        email:
          data.email
            ?.trim()
            .toLowerCase() ||
          null,
        phone:
          data.phone?.trim() ||
          null,
        address:
          data.address?.trim() ||
          null,
        city:
          data.city?.trim() ||
          null,
        logoUrl:
          data.logoUrl?.trim() ||
          null,
        maxGyms,
        isActive: true,
      });

    return this.organizationRepository
      .save(organization);
  }

  async assignGymToOrganization(
    organizationId: string,
    gymId: string,
  ) {
    const organization =
      await this.organizationRepository
        .findOne({
          where: {
            id: organizationId,
          },
          relations: {
            gyms: true,
          },
        });

    if (!organization) {
      throw new NotFoundException(
        'İşletme bulunamadı.',
      );
    }

    const gym =
      await this.findGymOrFail(gymId);

    const currentCount =
      organization.gyms
        ?.filter(
          (item) =>
            item.id !== gym.id,
        )
        .length || 0;

    if (
      currentCount >=
      organization.maxGyms
    ) {
      throw new BadRequestException(
        'İşletmenin şube hakkı dolmuştur.',
      );
    }

    gym.organizationId =
      organization.id;

    await this.gymRepository.save(gym);

    return {
      message:
        'Şube işletmeye bağlandı.',
      gym,
    };
  }

  async removeGymFromOrganization(
    organizationId: string,
    gymId: string,
  ) {
    const gym =
      await this.findGymOrFail(gymId);

    if (
      gym.organizationId !==
      organizationId
    ) {
      throw new BadRequestException(
        'Bu şube seçilen işletmeye bağlı değil.',
      );
    }

    gym.organizationId = null;

    await this.gymRepository.save(gym);

    return {
      message:
        'Şube işletmeden çıkarıldı.',
    };
  }

  async assignOrganizationUser(
    organizationId: string,
    data: {
      userId?: string;
      role?:
        OrganizationUserRole;
      accessAllGyms?: boolean;
    },
  ) {
    const organization =
      await this.organizationRepository
        .findOne({
          where: {
            id: organizationId,
          },
        });

    if (!organization) {
      throw new NotFoundException(
        'İşletme bulunamadı.',
      );
    }

    const userId =
      String(
        data.userId || '',
      ).trim();

    const user =
      await this.userRepository
        .findOne({
          where: {
            id: userId,
          },
        });

    if (!user) {
      throw new NotFoundException(
        'Kullanıcı bulunamadı.',
      );
    }

    let membership =
      await this.organizationUserRepository
        .findOne({
          where: {
            organizationId,
            userId,
          },
        });

    if (!membership) {
      membership =
        this.organizationUserRepository.create({
          organizationId,
          userId,
          role:
            data.role ||
            OrganizationUserRole.VIEWER,
          accessAllGyms:
            Boolean(
              data.accessAllGyms,
            ),
          isActive: true,
        });
    } else {
      membership.role =
        data.role ||
        membership.role;

      membership.accessAllGyms =
        data.accessAllGyms ??
        membership.accessAllGyms;

      membership.isActive = true;
    }

    return this.organizationUserRepository
      .save(membership);
  }

  async grantUserGymAccess(
    userId: string,
    data: {
      gymId?: string;
      role?: UserRole;
    },
  ) {
    const user =
      await this.userRepository
        .findOne({
          where: {
            id: userId,
          },
        });

    if (!user) {
      throw new NotFoundException(
        'Kullanıcı bulunamadı.',
      );
    }

    const gymId =
      String(
        data.gymId || '',
      ).trim();

    const gym =
      await this.findGymOrFail(
        gymId,
      );

    let access =
      await this.userGymAccessRepository
        .findOne({
          where: {
            userId,
            gymId,
          },
        });

    if (!access) {
      access =
        this.userGymAccessRepository.create({
          userId,
          gymId,
          role:
            data.role ||
            UserRole.STAFF,
          isActive: true,
        });
    } else {
      access.role =
        data.role ||
        access.role;

      access.isActive = true;
    }

    return this.userGymAccessRepository
      .save(access);
  }

  async getDashboardStats() {
    const gyms =
      await this.gymRepository.find();

    const totalGyms = gyms.length;

    const activeGyms = gyms.filter(
      (gym) => gym.isActive,
    ).length;

    const inactiveGyms =
      totalGyms - activeGyms;

    const now = new Date();

    const expiredLicenses = gyms.filter(
      (gym) =>
        gym.licenseStatus ===
          GymLicenseStatus.EXPIRED ||
        (
          gym.licenseEndDate !== null &&
          new Date(gym.licenseEndDate) < now
        ),
    ).length;

    const trialLicenses = gyms.filter(
      (gym) =>
        gym.licenseStatus ===
        GymLicenseStatus.TRIAL,
    ).length;

    const suspendedLicenses = gyms.filter(
      (gym) =>
        gym.licenseStatus ===
        GymLicenseStatus.SUSPENDED,
    ).length;

    const expiringSoon = gyms.filter(
      (gym) => {
        if (!gym.licenseEndDate) {
          return false;
        }

        const diff =
          new Date(
            gym.licenseEndDate,
          ).getTime() -
          now.getTime();

        return (
          diff >= 0 &&
          diff <=
            30 * 24 * 60 * 60 * 1000
        );
      },
    ).length;

    const totalUsers =
      await this.userRepository.count();

    const totalGymAdmins =
      await this.userRepository.count({
        where: {
          role: UserRole.GYM_ADMIN,
        },
      });

    const totalStaff =
      await this.userRepository.count({
        where: {
          role: UserRole.STAFF,
        },
      });

    return {
      totalGyms,
      activeGyms,
      inactiveGyms,
      expiredLicenses,
      trialLicenses,
      suspendedLicenses,
      expiringSoon,
      totalUsers,
      totalGymAdmins,
      totalStaff,
    };
  }


  async getCloudDashboard() {
    const [
      gyms,
      cardRecords,
      smsBalances,
      licensePayments,
    ] = await Promise.all([
      this.gymRepository.find({
        relations: {
          users: true,
          members: true,
        },
        order: {
          createdAt: 'DESC',
        },
      }),

      this.accessCardRepository.find(),

      this.smsBalanceRepository.find(),

      this.licensePaymentRepository.find({
        order: {
          createdAt: 'DESC',
        },
      }),
    ]);

    const now = new Date();

    const cardMap =
      new Map<
        string,
        {
          cardAvailable: number;
          qrAvailable: number;
          cardTotal: number;
          qrTotal: number;
        }
      >();

    for (const record of cardRecords) {
      const current =
        cardMap.get(record.gymId) || {
          cardAvailable: 0,
          qrAvailable: 0,
          cardTotal: 0,
          qrTotal: 0,
        };

      if (
        record.type ===
        AccessCredentialType.CARD
      ) {
        current.cardTotal += 1;

        if (
          record.status ===
          AccessCredentialStatus.AVAILABLE
        ) {
          current.cardAvailable += 1;
        }
      }

      if (
        record.type ===
        AccessCredentialType.QR
      ) {
        current.qrTotal += 1;

        if (
          record.status ===
          AccessCredentialStatus.AVAILABLE
        ) {
          current.qrAvailable += 1;
        }
      }

      cardMap.set(
        record.gymId,
        current,
      );
    }

    const smsMap =
      new Map(
        smsBalances.map((item) => [
          item.gymId,
          item,
        ]),
      );

    const gymRows =
      gyms.map((gym) => {
        const access =
          cardMap.get(gym.id) || {
            cardAvailable: 0,
            qrAvailable: 0,
            cardTotal: 0,
            qrTotal: 0,
          };

        const sms =
          smsMap.get(gym.id);

        const licenseEnd =
          gym.licenseEndDate
            ? new Date(
                gym.licenseEndDate,
              )
            : null;

        const daysRemaining =
          licenseEnd
            ? Math.ceil(
                (
                  licenseEnd.getTime() -
                  now.getTime()
                ) /
                  (
                    24 *
                    60 *
                    60 *
                    1000
                  ),
              )
            : null;

        const risks:
          string[] = [];

        if (!gym.isActive) {
          risks.push(
            'Salon pasif durumda',
          );
        }

        if (
          gym.licenseStatus ===
          GymLicenseStatus.SUSPENDED
        ) {
          risks.push(
            'Lisans askıya alınmış',
          );
        }

        if (
          gym.licenseStatus ===
            GymLicenseStatus.EXPIRED ||
          (
            daysRemaining !== null &&
            daysRemaining < 0
          )
        ) {
          risks.push(
            'Lisans süresi dolmuş',
          );
        } else if (
          daysRemaining !== null &&
          daysRemaining <= 30
        ) {
          risks.push(
            `Lisansın bitmesine ${Math.max(
              daysRemaining,
              0,
            )} gün kaldı`,
          );
        }

        const smsBalance =
          Number(
            sms?.balance || 0,
          );

        if (smsBalance <= 50) {
          risks.push(
            'SMS bakiyesi kritik',
          );
        }

        if (
          access.cardTotal > 0 &&
          access.cardAvailable <= 10
        ) {
          risks.push(
            'Kart stoğu kritik',
          );
        }

        if (
          access.qrTotal > 0 &&
          access.qrAvailable <= 10
        ) {
          risks.push(
            'QR stoğu kritik',
          );
        }

        return {
          id: gym.id,
          name: gym.name,
          city: gym.city,
          subscriptionPlan:
            gym.subscriptionPlan,
          licenseStatus:
            gym.licenseStatus,
          licenseEndDate:
            gym.licenseEndDate,
          daysRemaining,
          isActive:
            gym.isActive,
          memberCount:
            gym.members?.length || 0,
          userCount:
            gym.users?.length || 0,
          smsBalance,
          cardAvailable:
            access.cardAvailable,
          qrAvailable:
            access.qrAvailable,
          cardTotal:
            access.cardTotal,
          qrTotal:
            access.qrTotal,
          riskCount:
            risks.length,
          risks,
          createdAt:
            gym.createdAt,
        };
      });

    const topGyms =
      [...gymRows]
        .sort(
          (a, b) =>
            b.memberCount -
            a.memberCount,
        )
        .slice(0, 5);

    const riskyGyms =
      gymRows
        .filter(
          (gym) =>
            gym.riskCount > 0,
        )
        .sort(
          (a, b) =>
            b.riskCount -
            a.riskCount,
        )
        .slice(0, 8);

    const expiringGyms =
      gymRows
        .filter(
          (gym) =>
            gym.daysRemaining !== null &&
            gym.daysRemaining >= 0 &&
            gym.daysRemaining <= 30,
        )
        .sort(
          (a, b) =>
            (
              a.daysRemaining || 0
            ) -
            (
              b.daysRemaining || 0
            ),
        )
        .slice(0, 8);

    const recentGyms =
      [...gymRows]
        .sort(
          (a, b) =>
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime(),
        )
        .slice(0, 6);

    const monthStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

    const monthlySaasRevenue =
      licensePayments
        .filter(
          (payment) =>
            new Date(
              payment.createdAt,
            ) >= monthStart,
        )
        .reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0,
            ),
          0,
        );

    const totalCardAvailable =
      gymRows.reduce(
        (sum, gym) =>
          sum +
          gym.cardAvailable,
        0,
      );

    const totalQrAvailable =
      gymRows.reduce(
        (sum, gym) =>
          sum +
          gym.qrAvailable,
        0,
      );

    const totalSmsBalance =
      gymRows.reduce(
        (sum, gym) =>
          sum +
          gym.smsBalance,
        0,
      );

    const recommendations:
      string[] = [];

    if (riskyGyms.length > 0) {
      recommendations.push(
        `${riskyGyms.length} salon operasyonel risk taşıyor.`,
      );
    }

    if (expiringGyms.length > 0) {
      recommendations.push(
        `${expiringGyms.length} salonun lisansı 30 gün içinde sona erecek.`,
      );
    }

    const criticalSms =
      gymRows.filter(
        (gym) =>
          gym.smsBalance <= 50,
      ).length;

    if (criticalSms > 0) {
      recommendations.push(
        `${criticalSms} salonda SMS bakiyesi kritik seviyede.`,
      );
    }

    const criticalCards =
      gymRows.filter(
        (gym) =>
          gym.cardTotal > 0 &&
          gym.cardAvailable <= 10,
      ).length;

    if (criticalCards > 0) {
      recommendations.push(
        `${criticalCards} salonda kart stoğu kritik seviyede.`,
      );
    }

    const criticalQr =
      gymRows.filter(
        (gym) =>
          gym.qrTotal > 0 &&
          gym.qrAvailable <= 10,
      ).length;

    if (criticalQr > 0) {
      recommendations.push(
        `${criticalQr} salonda QR stoğu kritik seviyede.`,
      );
    }

    if (
      recommendations.length === 0
    ) {
      recommendations.push(
        'Cloud operasyonlarında kritik bir risk görünmüyor.',
      );
    }

    return {
      generatedAt:
        new Date(),

      summary: {
        totalGyms:
          gymRows.length,
        activeGyms:
          gymRows.filter(
            (gym) =>
              gym.isActive,
          ).length,
        totalMembers:
          gymRows.reduce(
            (sum, gym) =>
              sum +
              gym.memberCount,
            0,
          ),
        totalUsers:
          gymRows.reduce(
            (sum, gym) =>
              sum +
              gym.userCount,
            0,
          ),
        riskyGyms:
          riskyGyms.length,
        expiringGyms:
          expiringGyms.length,
        totalCardAvailable,
        totalQrAvailable,
        totalSmsBalance,
        monthlySaasRevenue:
          Number(
            monthlySaasRevenue.toFixed(
              2,
            ),
          ),
      },

      topGyms,
      riskyGyms,
      expiringGyms,
      recentGyms,
      recommendations,
    };
  }

  async getAllGyms() {
    const gyms =
      await this.gymRepository.find({
        relations: {
          users: true,
          members: true,
        },

        order: {
          createdAt: 'DESC',
        },
      });

    return gyms.map((gym) => ({
      id: gym.id,
      name: gym.name,
      slug: gym.slug,
      ownerName: gym.ownerName,
      email: gym.email,
      phone: gym.phone,
      address: gym.address,
      city: gym.city,

      organizationId:
        gym.organizationId,

      subscriptionPlan:
        gym.subscriptionPlan,

      licenseStartDate:
        gym.licenseStartDate,

      licenseEndDate:
        gym.licenseEndDate,

      licenseStatus:
        gym.licenseStatus,

      billingCycle:
        gym.billingCycle,

      trialEndDate:
        gym.trialEndDate,

      lastPaymentDate:
        gym.lastPaymentDate,

      nextPaymentDate:
        gym.nextPaymentDate,

      isActive: gym.isActive,
      logoUrl: gym.logoUrl,

      userCount:
        gym.users?.length ?? 0,

      memberCount:
        gym.members?.length ?? 0,

      createdAt: gym.createdAt,
      updatedAt: gym.updatedAt,
    }));
  }

  async getGymById(id: string) {
    const gym =
      await this.gymRepository.findOne({
        where: {
          id,
        },

        relations: {
          users: true,
          members: true,
        },
      });

    if (!gym) {
      throw new NotFoundException(
        'Spor salonu bulunamadı.',
      );
    }

    return {
      id: gym.id,
      name: gym.name,
      slug: gym.slug,
      ownerName: gym.ownerName,
      email: gym.email,
      phone: gym.phone,
      address: gym.address,
      city: gym.city,

      organizationId:
        gym.organizationId,

      subscriptionPlan:
        gym.subscriptionPlan,

      licenseStartDate:
        gym.licenseStartDate,

      licenseEndDate:
        gym.licenseEndDate,

      licenseStatus:
        gym.licenseStatus,

      billingCycle:
        gym.billingCycle,

      trialEndDate:
        gym.trialEndDate,

      lastPaymentDate:
        gym.lastPaymentDate,

      nextPaymentDate:
        gym.nextPaymentDate,

      isActive: gym.isActive,
      logoUrl: gym.logoUrl,

      memberCount:
        gym.members?.length ?? 0,

      users:
        gym.users?.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        })) ?? [],
    };
  }

  async createGym(
    dto: CreateGymDto,
  ) {
    const normalizedSlug =
      this.normalizeSlug(dto.slug);

    const normalizedManagerEmail =
      dto.managerEmail
        .trim()
        .toLowerCase();

    const existingGymByName =
      await this.gymRepository.findOne({
        where: {
          name: dto.name.trim(),
        },
      });

    if (existingGymByName) {
      throw new BadRequestException(
        'Bu isimde bir spor salonu zaten bulunuyor.',
      );
    }

    const existingGymBySlug =
      await this.gymRepository.findOne({
        where: {
          slug: normalizedSlug,
        },
      });

    if (existingGymBySlug) {
      throw new BadRequestException(
        'Bu salon bağlantı adı zaten kullanılıyor.',
      );
    }

    const existingManager =
      await this.userRepository.findOne({
        where: {
          email: normalizedManagerEmail,
        },
      });

    if (existingManager) {
      throw new BadRequestException(
        'Salon yöneticisinin e-posta adresi zaten kayıtlı.',
      );
    }

    const licenseStartDate =
      this.parseOptionalDate(
        dto.licenseStartDate,
        'Lisans başlangıç tarihi geçersiz.',
      );

    const licenseEndDate =
      this.parseOptionalDate(
        dto.licenseEndDate,
        'Lisans bitiş tarihi geçersiz.',
      );

    this.validateLicenseDates(
      licenseStartDate,
      licenseEndDate,
    );

    const gym =
      this.gymRepository.create({
        name: dto.name.trim(),
        slug: normalizedSlug,

        ownerName:
          dto.ownerName?.trim() || null,

        email:
          dto.email
            ?.trim()
            .toLowerCase() || null,

        phone:
          dto.phone?.trim() || null,

        address:
          dto.address?.trim() || null,

        city:
          dto.city?.trim() || null,

        subscriptionPlan:
          dto.subscriptionPlan ??
          GymSubscriptionPlan.BASIC,

        licenseStartDate,
        licenseEndDate,

        licenseStatus:
          licenseEndDate &&
          licenseEndDate < new Date()
            ? GymLicenseStatus.EXPIRED
            : GymLicenseStatus.ACTIVE,

        billingCycle:
          GymBillingCycle.MONTHLY,

        trialEndDate: null,
        lastPaymentDate: null,
        nextPaymentDate:
          licenseEndDate,

        logoUrl:
          dto.logoUrl?.trim() || null,

        isActive: true,
      });

    const savedGym =
      await this.gymRepository.save(gym);

    try {
      const passwordHash =
        await bcrypt.hash(
          dto.managerPassword,
          10,
        );

      const manager =
        this.userRepository.create({
          email:
            normalizedManagerEmail,

          passwordHash,

          firstName:
            dto.managerFirstName.trim(),

          lastName:
            dto.managerLastName.trim(),

          role:
            UserRole.GYM_ADMIN,

          gymId:
            savedGym.id,

          isActive:
            true,
        });

      const savedManager =
        await this.userRepository.save(
          manager,
        );

      return {
        message:
          'Spor salonu ve salon yöneticisi başarıyla oluşturuldu.',

        gym:
          savedGym,

        manager: {
          id:
            savedManager.id,

          email:
            savedManager.email,

          firstName:
            savedManager.firstName,

          lastName:
            savedManager.lastName,

          role:
            savedManager.role,

          gymId:
            savedManager.gymId,

          isActive:
            savedManager.isActive,
        },
      };
    } catch (error) {
      await this.gymRepository.delete(
        savedGym.id,
      );

      throw error;
    }
  }

  async updateGym(
    id: string,
    dto: UpdateGymDto,
  ) {
    const gym =
      await this.findGymOrFail(id);

    if (dto.name !== undefined) {
      const trimmedName =
        dto.name.trim();

      if (!trimmedName) {
        throw new BadRequestException(
          'Salon adı boş bırakılamaz.',
        );
      }

      if (
        trimmedName !== gym.name
      ) {
        const existingGym =
          await this.gymRepository.findOne({
            where: {
              name: trimmedName,
            },
          });

        if (
          existingGym &&
          existingGym.id !== gym.id
        ) {
          throw new BadRequestException(
            'Bu isimde başka bir spor salonu bulunuyor.',
          );
        }

        gym.name =
          trimmedName;
      }
    }

    if (dto.slug !== undefined) {
      const normalizedSlug =
        this.normalizeSlug(dto.slug);

      if (
        normalizedSlug !== gym.slug
      ) {
        const existingGym =
          await this.gymRepository.findOne({
            where: {
              slug: normalizedSlug,
            },
          });

        if (
          existingGym &&
          existingGym.id !== gym.id
        ) {
          throw new BadRequestException(
            'Bu salon bağlantı adı başka bir salon tarafından kullanılıyor.',
          );
        }

        gym.slug =
          normalizedSlug;
      }
    }

    if (
      dto.ownerName !== undefined
    ) {
      gym.ownerName =
        dto.ownerName?.trim() || null;
    }

    if (
      dto.email !== undefined
    ) {
      gym.email =
        dto.email
          ?.trim()
          .toLowerCase() || null;
    }

    if (
      dto.phone !== undefined
    ) {
      gym.phone =
        dto.phone?.trim() || null;
    }

    if (
      dto.address !== undefined
    ) {
      gym.address =
        dto.address?.trim() || null;
    }

    if (
      dto.city !== undefined
    ) {
      gym.city =
        dto.city?.trim() || null;
    }

    if (
      dto.subscriptionPlan !==
      undefined
    ) {
      gym.subscriptionPlan =
        dto.subscriptionPlan;
    }

    if (
      dto.logoUrl !== undefined
    ) {
      gym.logoUrl =
        dto.logoUrl?.trim() || null;
    }

    if (
      dto.licenseStartDate !==
      undefined
    ) {
      gym.licenseStartDate =
        this.parseOptionalDate(
          dto.licenseStartDate,
          'Lisans başlangıç tarihi geçersiz.',
        );
    }

    if (
      dto.licenseEndDate !==
      undefined
    ) {
      gym.licenseEndDate =
        this.parseOptionalDate(
          dto.licenseEndDate,
          'Lisans bitiş tarihi geçersiz.',
        );
    }

    this.validateLicenseDates(
      gym.licenseStartDate,
      gym.licenseEndDate,
    );

    const updatedGym =
      await this.gymRepository.save(gym);

    return {
      message:
        'Spor salonu bilgileri başarıyla güncellendi.',

      gym:
        updatedGym,
    };
  }

  async updateGymStatus(
    id: string,
    isActive: boolean,
  ) {
    if (
      typeof isActive !== 'boolean'
    ) {
      throw new BadRequestException(
        'isActive alanı true veya false olmalıdır.',
      );
    }

    const gym =
      await this.findGymOrFail(id);

    gym.isActive =
      isActive;

    const updatedGym =
      await this.gymRepository.save(gym);

    return {
      message:
        isActive
          ? 'Spor salonu aktif hâle getirildi.'
          : 'Spor salonu pasif hâle getirildi.',

      gym:
        updatedGym,
    };
  }

  async getGymStaff(
    gymId: string,
  ) {
    await this.findGymOrFail(gymId);

    const users =
      await this.userRepository.find({
        where: {
          gymId,
        },
        order: {
          createdAt: 'DESC',
        },
      });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      gymId: user.gymId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  async createGymStaff(
    gymId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      isActive?: boolean;
    },
  ) {
    await this.findGymOrFail(gymId);

    const firstName = String(
      data.firstName || '',
    ).trim();

    const lastName = String(
      data.lastName || '',
    ).trim();

    const email = String(
      data.email || '',
    )
      .trim()
      .toLowerCase();

    const password = String(
      data.password || '',
    );

    if (!firstName) {
      throw new BadRequestException(
        'Personel adı zorunludur.',
      );
    }

    if (!lastName) {
      throw new BadRequestException(
        'Personel soyadı zorunludur.',
      );
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException(
        'Geçerli bir e-posta adresi girin.',
      );
    }

    if (password.length < 8) {
      throw new BadRequestException(
        'Şifre en az 8 karakter olmalıdır.',
      );
    }

    const existingUser =
      await this.userRepository.findOne({
        where: {
          email,
        },
      });

    if (existingUser) {
      throw new BadRequestException(
        'Bu e-posta adresi zaten kayıtlı.',
      );
    }

    const role =
      data.role === UserRole.GYM_ADMIN
        ? UserRole.GYM_ADMIN
        : UserRole.STAFF;

    const passwordHash =
      await bcrypt.hash(password, 10);

    const user =
      this.userRepository.create({
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        gymId,
        isActive:
          data.isActive !== false,
      });

    const savedUser =
      await this.userRepository.save(
        user,
      );

    return {
      message:
        'Personel başarıyla oluşturuldu.',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName:
          savedUser.firstName,
        lastName:
          savedUser.lastName,
        role: savedUser.role,
        gymId: savedUser.gymId,
        isActive:
          savedUser.isActive,
        createdAt:
          savedUser.createdAt,
      },
    };
  }

  async updateGymStaff(
    gymId: string,
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      isActive?: boolean;
    },
  ) {
    const user =
      await this.findGymUserOrFail(
        gymId,
        userId,
      );

    if (
      data.firstName !== undefined
    ) {
      const firstName =
        data.firstName.trim();

      if (!firstName) {
        throw new BadRequestException(
          'Personel adı boş bırakılamaz.',
        );
      }

      user.firstName = firstName;
    }

    if (
      data.lastName !== undefined
    ) {
      const lastName =
        data.lastName.trim();

      if (!lastName) {
        throw new BadRequestException(
          'Personel soyadı boş bırakılamaz.',
        );
      }

      user.lastName = lastName;
    }

    if (data.email !== undefined) {
      const email =
        data.email
          .trim()
          .toLowerCase();

      if (
        !email ||
        !email.includes('@')
      ) {
        throw new BadRequestException(
          'Geçerli bir e-posta adresi girin.',
        );
      }

      if (email !== user.email) {
        const existingUser =
          await this.userRepository.findOne({
            where: {
              email,
            },
          });

        if (
          existingUser &&
          existingUser.id !== user.id
        ) {
          throw new BadRequestException(
            'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.',
          );
        }

        user.email = email;
      }
    }

    if (data.role !== undefined) {
      user.role =
        data.role ===
        UserRole.GYM_ADMIN
          ? UserRole.GYM_ADMIN
          : UserRole.STAFF;
    }

    if (
      typeof data.isActive ===
      'boolean'
    ) {
      user.isActive =
        data.isActive;
    }

    if (data.password) {
      if (
        data.password.length < 8
      ) {
        throw new BadRequestException(
          'Şifre en az 8 karakter olmalıdır.',
        );
      }

      user.passwordHash =
        await bcrypt.hash(
          data.password,
          10,
        );
    }

    const savedUser =
      await this.userRepository.save(
        user,
      );

    return {
      message:
        'Personel bilgileri güncellendi.',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName:
          savedUser.firstName,
        lastName:
          savedUser.lastName,
        role: savedUser.role,
        gymId: savedUser.gymId,
        isActive:
          savedUser.isActive,
        createdAt:
          savedUser.createdAt,
        updatedAt:
          savedUser.updatedAt,
      },
    };
  }

  async updateGymStaffStatus(
    gymId: string,
    userId: string,
    isActive: boolean,
  ) {
    if (
      typeof isActive !== 'boolean'
    ) {
      throw new BadRequestException(
        'isActive alanı true veya false olmalıdır.',
      );
    }

    const user =
      await this.findGymUserOrFail(
        gymId,
        userId,
      );

    user.isActive = isActive;

    await this.userRepository.save(
      user,
    );

    return {
      message: isActive
        ? 'Personel aktif hâle getirildi.'
        : 'Personel pasif hâle getirildi.',
    };
  }

  async deleteGymStaff(
    gymId: string,
    userId: string,
  ) {
    const user =
      await this.findGymUserOrFail(
        gymId,
        userId,
      );

    await this.userRepository.remove(
      user,
    );

    return {
      message:
        'Personel başarıyla silindi.',
    };
  }


  async getLicenseOverview() {
    const gyms =
      await this.gymRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });

    const now = new Date();

    return {
      total: gyms.length,

      active: gyms.filter(
        (gym) =>
          gym.licenseStatus ===
          GymLicenseStatus.ACTIVE,
      ).length,

      trial: gyms.filter(
        (gym) =>
          gym.licenseStatus ===
          GymLicenseStatus.TRIAL,
      ).length,

      expired: gyms.filter(
        (gym) =>
          gym.licenseStatus ===
            GymLicenseStatus.EXPIRED ||
          (
            gym.licenseEndDate !== null &&
            new Date(
              gym.licenseEndDate,
            ) < now
          ),
      ).length,

      suspended: gyms.filter(
        (gym) =>
          gym.licenseStatus ===
          GymLicenseStatus.SUSPENDED,
      ).length,

      expiringSoon: gyms.filter(
        (gym) => {
          if (!gym.licenseEndDate) {
            return false;
          }

          const diff =
            new Date(
              gym.licenseEndDate,
            ).getTime() -
            now.getTime();

          return (
            diff >= 0 &&
            diff <=
              30 * 24 * 60 * 60 * 1000
          );
        },
      ).length,
    };
  }

  async updateGymLicense(
    gymId: string,
    data: {
      subscriptionPlan?:
        GymSubscriptionPlan;
      licenseStatus?:
        GymLicenseStatus;
      billingCycle?:
        GymBillingCycle;
      licenseStartDate?:
        string | null;
      licenseEndDate?:
        string | null;
      trialEndDate?:
        string | null;
      lastPaymentDate?:
        string | null;
      nextPaymentDate?:
        string | null;
    },
  ) {
    const gym =
      await this.findGymOrFail(gymId);

    if (
      data.subscriptionPlan !==
      undefined
    ) {
      gym.subscriptionPlan =
        data.subscriptionPlan;
    }

    if (
      data.licenseStatus !==
      undefined
    ) {
      gym.licenseStatus =
        data.licenseStatus;
    }

    if (
      data.billingCycle !==
      undefined
    ) {
      gym.billingCycle =
        data.billingCycle;
    }

    const setDate = (
      field:
        | 'licenseStartDate'
        | 'licenseEndDate'
        | 'trialEndDate'
        | 'lastPaymentDate'
        | 'nextPaymentDate',
      value:
        | string
        | null
        | undefined,
    ) => {
      if (value === undefined) {
        return;
      }

      gym[field] =
        this.parseOptionalDate(
          value,
          'Lisans tarihi geçersiz.',
        );
    };

    setDate(
      'licenseStartDate',
      data.licenseStartDate,
    );

    setDate(
      'licenseEndDate',
      data.licenseEndDate,
    );

    setDate(
      'trialEndDate',
      data.trialEndDate,
    );

    setDate(
      'lastPaymentDate',
      data.lastPaymentDate,
    );

    setDate(
      'nextPaymentDate',
      data.nextPaymentDate,
    );

    this.validateLicenseDates(
      gym.licenseStartDate,
      gym.licenseEndDate,
    );

    if (
      gym.licenseStatus ===
        GymLicenseStatus.ACTIVE &&
      gym.licenseEndDate &&
      gym.licenseEndDate <
        new Date()
    ) {
      gym.licenseStatus =
        GymLicenseStatus.EXPIRED;
    }

    const saved =
      await this.gymRepository.save(gym);

    return {
      message:
        'Lisans bilgileri güncellendi.',
      gym: saved,
    };
  }

  async getLicensePayments(
    gymId: string,
  ) {
    await this.findGymOrFail(gymId);

    return this.licensePaymentRepository
      .find({
        where: {
          gymId,
        },
        order: {
          createdAt: 'DESC',
        },
      });
  }

  async addLicensePayment(
    gymId: string,
    userId: string | null,
    data: {
      amount?: number;
      plan?: GymSubscriptionPlan;
      billingCycle?: GymBillingCycle;
      periodStart?: string | null;
      periodEnd?: string | null;
      note?: string | null;
      activateLicense?: boolean;
    },
  ) {
    const gym =
      await this.findGymOrFail(gymId);

    const amount =
      Number(data.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        'Ödeme tutarı sıfırdan büyük olmalıdır.',
      );
    }

    const payment =
      this.licensePaymentRepository.create({
        gymId,
        amount,
        plan:
          data.plan ||
          gym.subscriptionPlan,
        billingCycle:
          data.billingCycle ||
          gym.billingCycle,
        periodStart:
          this.parseOptionalDate(
            data.periodStart,
            'Dönem başlangıç tarihi geçersiz.',
          ),
        periodEnd:
          this.parseOptionalDate(
            data.periodEnd,
            'Dönem bitiş tarihi geçersiz.',
          ),
        note:
          data.note?.trim() || null,
        createdByUserId:
          userId,
      });

    const savedPayment =
      await this.licensePaymentRepository
        .save(payment);

    gym.subscriptionPlan =
      payment.plan;

    gym.billingCycle =
      payment.billingCycle;

    gym.lastPaymentDate =
      new Date();

    if (payment.periodStart) {
      gym.licenseStartDate =
        payment.periodStart;
    }

    if (payment.periodEnd) {
      gym.licenseEndDate =
        payment.periodEnd;

      gym.nextPaymentDate =
        payment.periodEnd;
    }

    if (
      data.activateLicense !== false
    ) {
      gym.licenseStatus =
        GymLicenseStatus.ACTIVE;

      gym.isActive = true;
    }

    await this.gymRepository.save(gym);

    return {
      message:
        'Lisans ödemesi kaydedildi.',
      payment:
        savedPayment,
      gym,
    };
  }

  private async findGymOrFail(
    id: string,
  ): Promise<Gym> {
    const gym =
      await this.gymRepository.findOne({
        where: {
          id,
        },
      });

    if (!gym) {
      throw new NotFoundException(
        'Spor salonu bulunamadı.',
      );
    }

    return gym;
  }

  private async findGymUserOrFail(
    gymId: string,
    userId: string,
  ): Promise<User> {
    const user =
      await this.userRepository.findOne({
        where: {
          id: userId,
          gymId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'Personel bulunamadı veya bu spor salonuna ait değil.',
      );
    }

    return user;
  }

  private normalizeSlug(
    slug: string,
  ): string {
    const normalized =
      slug
        .trim()
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!normalized) {
      throw new BadRequestException(
        'Geçerli bir salon bağlantı adı girin.',
      );
    }

    return normalized;
  }

  private parseOptionalDate(
    value:
      | string
      | null
      | undefined,

    errorMessage: string,
  ): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate =
      new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        errorMessage,
      );
    }

    return parsedDate;
  }

  private validateLicenseDates(
    startDate: Date | null,
    endDate: Date | null,
  ): void {
    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      throw new BadRequestException(
        'Lisans bitiş tarihi başlangıç tarihinden önce olamaz.',
      );
    }
  }
}
