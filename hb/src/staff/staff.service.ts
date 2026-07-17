import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Staff, StaffRole } from './staff.entity';
import { StaffAttendance } from './staff-attendance.entity';
import { StaffPermission } from './staff-permission.entity';

type PermissionInput = Partial<
  Omit<StaffPermission, 'id' | 'staffId' | 'staff'>
>;

type CreateStaffInput = {
  fullName: string;
  phone?: string;
  email?: string;
  role?: StaffRole;
  cardCode?: string | null;
  qrCode?: string | null;
  employmentStartDate?: string | null;
  permissions?: PermissionInput;
};

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,

    @InjectRepository(StaffAttendance)
    private readonly attendanceRepository: Repository<StaffAttendance>,

    @InjectRepository(StaffPermission)
    private readonly permissionRepository: Repository<StaffPermission>,
  ) {}

  private normalizeCode(value?: string | null) {
    const normalized = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

    return normalized || null;
  }

  private workDate(value = new Date()) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async list(gymId: string) {
    return this.staffRepository.find({
      where: {
        gymId,
        isArchived: false,
      },
      relations: {
        permission: true,
      },
      order: {
        fullName: 'ASC',
      },
    });
  }

  async create(gymId: string, input: CreateStaffInput) {
    const fullName = String(input.fullName || '').trim();

    if (!fullName) {
      throw new BadRequestException('Personel adı zorunludur.');
    }

    const cardCode = this.normalizeCode(input.cardCode);
    const qrCode = this.normalizeCode(input.qrCode);

    if (!cardCode && !qrCode) {
      throw new BadRequestException(
        'En az bir kart veya QR kodu girilmelidir.',
      );
    }

    const duplicateConditions = [
      ...(cardCode ? [{ gymId, cardCode }] : []),
      ...(qrCode ? [{ gymId, qrCode }] : []),
    ];

    if (duplicateConditions.length > 0) {
      const duplicate = await this.staffRepository.findOne({
        where: duplicateConditions,
      });

      if (duplicate) {
        throw new BadRequestException(
          'Bu kart veya QR kodu başka bir personele atanmış.',
        );
      }
    }

    const staff = this.staffRepository.create({
      gymId,
      fullName,
      phone: input.phone?.trim() || '',
      email: input.email?.trim() || '',
      role: input.role || StaffRole.OTHER,
      cardCode,
      qrCode,
      employmentStartDate: input.employmentStartDate || null,
      isActive: true,
      isArchived: false,
    });

    const saved = await this.staffRepository.save(staff);

    const permission = this.permissionRepository.create({
      staffId: saved.id,
      staff: saved,
      dashboard: true,
      members: true,
      finance: false,
      sms: false,
      lockers: false,
      cafe: false,
      reports: false,
      checkIn: true,
      accessCards: false,
      settings: false,
      ...(input.permissions || {}),
    });

    await this.permissionRepository.save(permission);

    return this.getOne(gymId, saved.id);
  }

  async getOne(gymId: string, id: string) {
    const staff = await this.staffRepository.findOne({
      where: {
        id,
        gymId,
        isArchived: false,
      },
      relations: {
        permission: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Personel bulunamadı.');
    }

    return staff;
  }

  async update(
    gymId: string,
    id: string,
    input: Partial<CreateStaffInput> & {
      isActive?: boolean;
    },
  ) {
    const staff = await this.getOne(gymId, id);

    if (input.fullName !== undefined) {
      const fullName = input.fullName.trim();

      if (!fullName) {
        throw new BadRequestException('Personel adı zorunludur.');
      }

      staff.fullName = fullName;
    }

    if (input.phone !== undefined) staff.phone = input.phone.trim();
    if (input.email !== undefined) staff.email = input.email.trim();
    if (input.role !== undefined) staff.role = input.role;
    if (input.cardCode !== undefined) {
      staff.cardCode = this.normalizeCode(input.cardCode);
    }
    if (input.qrCode !== undefined) {
      staff.qrCode = this.normalizeCode(input.qrCode);
    }
    if (input.employmentStartDate !== undefined) {
      staff.employmentStartDate = input.employmentStartDate;
    }
    if (input.isActive !== undefined) {
      staff.isActive = input.isActive;
    }

    await this.staffRepository.save(staff);

    if (input.permissions) {
      let permission = await this.permissionRepository.findOne({
        where: {
          staffId: staff.id,
        },
      });

      if (!permission) {
        permission = this.permissionRepository.create({
          staffId: staff.id,
          staff,
        });
      }

      Object.assign(permission, input.permissions);
      await this.permissionRepository.save(permission);
    }

    return this.getOne(gymId, id);
  }

  async archive(gymId: string, id: string) {
    const staff = await this.getOne(gymId, id);

    staff.isArchived = true;
    staff.isActive = false;

    await this.staffRepository.save(staff);

    return { success: true };
  }

  async findByAccessCode(gymId: string, rawCode: string) {
    const code = this.normalizeCode(rawCode);

    if (!code) return null;

    return this.staffRepository.findOne({
      where: [
        {
          gymId,
          cardCode: code,
          isActive: true,
          isArchived: false,
        },
        {
          gymId,
          qrCode: code,
          isActive: true,
          isArchived: false,
        },
      ],
    });
  }

  async scanAttendance(gymId: string, rawCode: string) {
    const staff = await this.findByAccessCode(gymId, rawCode);

    if (!staff) return null;

    const code = this.normalizeCode(rawCode)!;
    const accessType: 'CARD' | 'QR' =
      staff.cardCode === code ? 'CARD' : 'QR';

    const openAttendance = await this.attendanceRepository.findOne({
      where: {
        gymId,
        staffId: staff.id,
        checkOutTime: IsNull(),
      },
      order: {
        checkInTime: 'DESC',
      },
    });

    if (!openAttendance) {
      const attendance = this.attendanceRepository.create({
        gymId,
        staffId: staff.id,
        staff,
        workDate: this.workDate(),
        checkInTime: new Date(),
        checkOutTime: null,
        durationMinutes: 0,
        accessType,
        accessCode: code,
      });

      const saved = await this.attendanceRepository.save(attendance);

      return {
        success: true,
        subjectType: 'STAFF',
        action: 'CHECK_IN',
        message: 'Personel işe giriş kaydı oluşturuldu.',
        attendance: saved,
        staff,
      };
    }

    const checkOutTime = new Date();

    openAttendance.checkOutTime = checkOutTime;
    openAttendance.durationMinutes = Math.max(
      0,
      Math.round(
        (checkOutTime.getTime() -
          new Date(openAttendance.checkInTime).getTime()) /
          60000,
      ),
    );

    const saved = await this.attendanceRepository.save(openAttendance);

    return {
      success: true,
      subjectType: 'STAFF',
      action: 'CHECK_OUT',
      message: 'Personel işten çıkış kaydı oluşturuldu.',
      attendance: saved,
      staff,
    };
  }

  async attendance(
    gymId: string,
    dateFrom?: string,
    dateTo?: string,
    staffId?: string,
  ) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.staff', 'staff')
      .where('attendance.gymId = :gymId', { gymId })
      .orderBy('attendance.checkInTime', 'DESC');

    if (staffId) {
      query.andWhere('attendance.staffId = :staffId', { staffId });
    }

    if (dateFrom) {
      query.andWhere('attendance.workDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('attendance.workDate <= :dateTo', { dateTo });
    }

    return query.getMany();
  }


  async weeklySummary(
    gymId: string,
    dateFrom: string,
    dateTo: string,
    staffId?: string,
  ) {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException(
        'Başlangıç ve bitiş tarihi zorunludur.',
      );
    }

    if (dateFrom > dateTo) {
      throw new BadRequestException(
        'Başlangıç tarihi bitiş tarihinden sonra olamaz.',
      );
    }

    const records = await this.attendance(
      gymId,
      dateFrom,
      dateTo,
      staffId,
    );

    const grouped = new Map<
      string,
      {
        staffId: string;
        fullName: string;
        role: StaffRole;
        totalMinutes: number;
        totalSessions: number;
        workedDays: Set<string>;
        firstCheckIn: Date | null;
        lastCheckOut: Date | null;
        days: Map<
          string,
          {
            date: string;
            firstCheckIn: Date;
            lastCheckOut: Date | null;
            totalMinutes: number;
            sessions: number;
            isInside: boolean;
          }
        >;
      }
    >();

    for (const record of records) {
      const current =
        grouped.get(record.staffId) || {
          staffId: record.staffId,
          fullName:
            record.staff?.fullName ||
            'Personel',
          role:
            record.staff?.role ||
            StaffRole.OTHER,
          totalMinutes: 0,
          totalSessions: 0,
          workedDays: new Set<string>(),
          firstCheckIn: null,
          lastCheckOut: null,
          days: new Map(),
        };

      current.totalMinutes +=
        Number(record.durationMinutes || 0);
      current.totalSessions += 1;
      current.workedDays.add(
        record.workDate,
      );

      const checkIn =
        new Date(record.checkInTime);

      if (
        !current.firstCheckIn ||
        checkIn < current.firstCheckIn
      ) {
        current.firstCheckIn = checkIn;
      }

      if (record.checkOutTime) {
        const checkOut =
          new Date(record.checkOutTime);

        if (
          !current.lastCheckOut ||
          checkOut > current.lastCheckOut
        ) {
          current.lastCheckOut = checkOut;
        }
      }

      const day =
        current.days.get(
          record.workDate,
        );

      if (!day) {
        current.days.set(
          record.workDate,
          {
            date: record.workDate,
            firstCheckIn: checkIn,
            lastCheckOut:
              record.checkOutTime
                ? new Date(
                    record.checkOutTime,
                  )
                : null,
            totalMinutes:
              Number(
                record.durationMinutes ||
                  0,
              ),
            sessions: 1,
            isInside:
              !record.checkOutTime,
          },
        );
      } else {
        if (
          checkIn <
          day.firstCheckIn
        ) {
          day.firstCheckIn =
            checkIn;
        }

        if (record.checkOutTime) {
          const checkOut =
            new Date(
              record.checkOutTime,
            );

          if (
            !day.lastCheckOut ||
            checkOut >
              day.lastCheckOut
          ) {
            day.lastCheckOut =
              checkOut;
          }
        }

        day.totalMinutes +=
          Number(
            record.durationMinutes || 0,
          );
        day.sessions += 1;

        if (!record.checkOutTime) {
          day.isInside = true;
        }
      }

      grouped.set(
        record.staffId,
        current,
      );
    }

    const items =
      [...grouped.values()]
        .map((item) => ({
          staffId: item.staffId,
          fullName: item.fullName,
          role: item.role,
          totalMinutes:
            item.totalMinutes,
          totalSessions:
            item.totalSessions,
          workedDays:
            item.workedDays.size,
          firstCheckIn:
            item.firstCheckIn,
          lastCheckOut:
            item.lastCheckOut,
          averageDailyMinutes:
            item.workedDays.size > 0
              ? Math.round(
                  item.totalMinutes /
                    item.workedDays.size,
                )
              : 0,
          days:
            [...item.days.values()]
              .sort((a, b) =>
                a.date.localeCompare(
                  b.date,
                ),
              ),
        }))
        .sort((a, b) =>
          a.fullName.localeCompare(
            b.fullName,
            'tr',
          ),
        );

    return {
      dateFrom,
      dateTo,
      totalStaff: items.length,
      totalMinutes:
        items.reduce(
          (sum, item) =>
            sum +
            item.totalMinutes,
          0,
        ),
      totalSessions:
        items.reduce(
          (sum, item) =>
            sum +
            item.totalSessions,
          0,
        ),
      items,
    };
  }

  async exportAttendanceCsv(
    gymId: string,
    dateFrom: string,
    dateTo: string,
    staffId?: string,
  ) {
    const records =
      await this.attendance(
        gymId,
        dateFrom,
        dateTo,
        staffId,
      );

    const escapeCsv = (
      value: unknown,
    ) => {
      const text = String(
        value ?? '',
      );

      return `"${text.replace(
        /"/g,
        '""',
      )}"`;
    };

    const header = [
      'Personel',
      'Görev',
      'Tarih',
      'Giriş',
      'Çıkış',
      'Çalışma Süresi (Dakika)',
      'Erişim Türü',
      'Erişim Kodu',
      'Durum',
    ];

    const rows = records.map(
      (record) => [
        record.staff?.fullName ||
          'Personel',
        record.staff?.role ||
          StaffRole.OTHER,
        record.workDate,
        new Date(
          record.checkInTime,
        ).toLocaleString('tr-TR'),
        record.checkOutTime
          ? new Date(
              record.checkOutTime,
            ).toLocaleString('tr-TR')
          : '',
        Number(
          record.durationMinutes ||
            0,
        ),
        record.accessType,
        record.accessCode,
        record.checkOutTime
          ? 'Tamamlandı'
          : 'İçeride',
      ],
    );

    return [
      header.map(escapeCsv).join(';'),
      ...rows.map((row) =>
        row.map(escapeCsv).join(';'),
      ),
    ].join('\r\n');
  }


  async dailySummary(gymId: string, date?: string) {
    const workDate = date || this.workDate();

    const records = await this.attendanceRepository.find({
      where: {
        gymId,
        workDate,
      },
      relations: {
        staff: true,
      },
      order: {
        checkInTime: 'ASC',
      },
    });

    const grouped = new Map<
      string,
      {
        staffId: string;
        fullName: string;
        firstCheckIn: Date;
        lastCheckOut: Date | null;
        totalMinutes: number;
        isInside: boolean;
        sessions: number;
      }
    >();

    for (const record of records) {
      const current = grouped.get(record.staffId);

      if (!current) {
        grouped.set(record.staffId, {
          staffId: record.staffId,
          fullName: record.staff.fullName,
          firstCheckIn: record.checkInTime,
          lastCheckOut: record.checkOutTime,
          totalMinutes: record.durationMinutes,
          isInside: !record.checkOutTime,
          sessions: 1,
        });
        continue;
      }

      current.totalMinutes += record.durationMinutes;
      current.sessions += 1;

      if (!record.checkOutTime) current.isInside = true;

      if (
        record.checkOutTime &&
        (!current.lastCheckOut ||
          new Date(record.checkOutTime) >
            new Date(current.lastCheckOut))
      ) {
        current.lastCheckOut = record.checkOutTime;
      }
    }

    const items = [...grouped.values()];

    return {
      date: workDate,
      totalStaff: items.length,
      insideNow: items.filter((item) => item.isInside).length,
      totalMinutes: items.reduce(
        (sum, item) => sum + item.totalMinutes,
        0,
      ),
      items,
    };
  }
}
