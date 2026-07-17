import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import {
  User,
  UserRole,
} from '../user.entity';

import { InitializeSystemDto } from './dto/initialize-system.dto';

@Injectable()
export class SetupService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly dataSource: DataSource,
  ) {}

  async getSetupStatus() {
    const superAdminCount =
      await this.userRepository.count({
        where: {
          role: UserRole.SUPER_ADMIN,
        },
      });

    return {
      needsSetup: superAdminCount === 0,
    };
  }

  async initializeSystem(
    dto: InitializeSystemDto,
  ) {
    this.validateDto(dto);

    const normalizedEmail = dto.email
      .trim()
      .toLowerCase();

    const superAdminCount =
      await this.userRepository.count({
        where: {
          role: UserRole.SUPER_ADMIN,
        },
      });

    if (superAdminCount > 0) {
      throw new ForbiddenException(
        'NovaPlus+ ilk kurulumu daha önce tamamlanmış.',
      );
    }

    const existingUser =
      await this.userRepository.findOne({
        where: {
          email: normalizedEmail,
        },
      });

    if (existingUser) {
      throw new BadRequestException(
        'Bu e-posta adresi zaten kayıtlı.',
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      12,
    );

    return this.dataSource.transaction(
      async (manager) => {
        /*
         * İşlem başlamadan hemen önce tekrar kontrol ediyoruz.
         * Böylece aynı anda iki kurulum isteği gönderilirse
         * ikinci Super Admin hesabı oluşturulmaz.
         */
        const superAdminRepository =
          manager.getRepository(User);

        const existingSuperAdminCount =
          await superAdminRepository.count({
            where: {
              role: UserRole.SUPER_ADMIN,
            },
          });

        if (existingSuperAdminCount > 0) {
          throw new ForbiddenException(
            'NovaPlus+ ilk kurulumu daha önce tamamlanmış.',
          );
        }

        const superAdmin =
          superAdminRepository.create({
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            email: normalizedEmail,
            passwordHash,
            role: UserRole.SUPER_ADMIN,
            gymId: null,
            isActive: true,
          });

        const savedSuperAdmin =
          await superAdminRepository.save(
            superAdmin,
          );

        return {
          message:
            'NovaPlus+ ilk kurulumu başarıyla tamamlandı.',

          user: {
            id: savedSuperAdmin.id,
            firstName:
              savedSuperAdmin.firstName,
            lastName:
              savedSuperAdmin.lastName,
            email: savedSuperAdmin.email,
            role: savedSuperAdmin.role,
          },
        };
      },
    );
  }

  private validateDto(
    dto: InitializeSystemDto,
  ): void {
    if (
      !dto.firstName?.trim() ||
      !dto.lastName?.trim() ||
      !dto.email?.trim() ||
      !dto.password
    ) {
      throw new BadRequestException(
        'Ad, soyad, e-posta ve şifre zorunludur.',
      );
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(dto.email.trim())) {
      throw new BadRequestException(
        'Geçerli bir e-posta adresi girin.',
      );
    }

    if (dto.password.length < 8) {
      throw new BadRequestException(
        'Şifre en az 8 karakter olmalıdır.',
      );
    }

    if (
      !/[A-ZÇĞİÖŞÜ]/.test(dto.password) ||
      !/[a-zçğıöşü]/.test(dto.password) ||
      !/[0-9]/.test(dto.password)
    ) {
      throw new BadRequestException(
        'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.',
      );
    }
  }
}