import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { AnalyticsService } from '../analytics.service';
import { AccessCardService } from '../card/access-card.service';
import { CheckIn } from '../check-in/check-in.entity';
import { LockerService } from '../locker/locker.service';
import { NotificationService } from '../notification/notification.service';
import { NovaAiService } from '../nova-ai/nova-ai.service';
import { SmsService } from '../sms/sms.service';
import { StaffAttendance } from '../staff/staff-attendance.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { CafeSale } from '../wallet-cafe/cafe-sale.entity';
import { WalletCafeService } from '../wallet-cafe/wallet-cafe.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly analyticsService:
      AnalyticsService,

    private readonly smsService:
      SmsService,

    private readonly lockerService:
      LockerService,

    private readonly accessCardService:
      AccessCardService,

    private readonly walletCafeService:
      WalletCafeService,

    private readonly notificationService:
      NotificationService,

    private readonly novaAiService:
      NovaAiService,

    @InjectRepository(AuditLog)
    private readonly auditLogRepository:
      Repository<AuditLog>,

    @InjectRepository(StaffAttendance)
    private readonly staffAttendanceRepository:
      Repository<StaffAttendance>,

    @InjectRepository(CafeSale)
    private readonly cafeSaleRepository:
      Repository<CafeSale>,

    @InjectRepository(CheckIn)
    private readonly checkInRepository:
      Repository<CheckIn>,
  ) {}

  private startOfDay(
    date = new Date(),
  ) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
  }

  private endOfDay(
    date = new Date(),
  ) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );
  }

  async getOverview(
    gymId: string,
  ) {
    const todayStart =
      this.startOfDay();

    const todayEnd =
      this.endOfDay();

    const [
      stats,
      dailyFinance,
      notifications,
      notificationSummary,
      smsBalance,
      lockerSummary,
      accessSummary,
      walletCafeSummary,
      novaBriefing,
      recentAuditLogs,
      todayStaffRecords,
      todayCafeSales,
      todayCheckIns,
    ] = await Promise.all([
      this.analyticsService
        .getDashboardStats(gymId),

      this.analyticsService
        .getLastSevenDaysFinance(gymId),

      this.notificationService
        .list(gymId),

      this.notificationService
        .summary(gymId),

      this.smsService
        .getGymBalance(gymId),

      this.lockerService
        .getSummary(gymId),

      this.accessCardService
        .getInventorySummary(gymId),

      this.walletCafeService
        .getSummary(gymId),

      this.novaAiService
        .briefing(gymId),

      this.auditLogRepository.find({
        where: {
          gymId,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 8,
      }),

      this.staffAttendanceRepository.find({
        where: {
          gymId,
          checkInTime: Between(
            todayStart,
            todayEnd,
          ),
        },
        relations: {
          staff: true,
        },
        order: {
          checkInTime: 'DESC',
        },
        take: 300,
      }),

      this.cafeSaleRepository.find({
        where: {
          gymId,
          createdAt: Between(
            todayStart,
            todayEnd,
          ),
        },
        order: {
          createdAt: 'DESC',
        },
        take: 500,
      }),

      this.checkInRepository.find({
        where: {
          gymId,
          checkInTime: Between(
            todayStart,
            todayEnd,
          ),
        },
        order: {
          checkInTime: 'ASC',
        },
      }),
    ]);

    const latestByStaff =
      new Map<
        string,
        StaffAttendance
      >();

    for (
      const record
      of todayStaffRecords
    ) {
      if (
        !latestByStaff.has(
          record.staffId,
        )
      ) {
        latestByStaff.set(
          record.staffId,
          record,
        );
      }
    }

    const staffLive =
      [...latestByStaff.values()]
        .map((record) => ({
          id: record.id,
          staffId:
            record.staffId,
          fullName:
            record.staff?.fullName ||
            'Personel',
          role:
            record.staff?.role ||
            'OTHER',
          checkInTime:
            record.checkInTime,
          checkOutTime:
            record.checkOutTime,
          durationMinutes:
            Number(
              record.durationMinutes ||
              0,
            ),
          isInside:
            !record.checkOutTime,
        }))
        .sort(
          (a, b) =>
            Number(b.isInside) -
            Number(a.isInside),
        );

    const hourlyCheckIns =
      Array.from(
        { length: 24 },
        (_, hour) => ({
          hour,
          label:
            `${String(hour).padStart(
              2,
              '0',
            )}:00`,
          count: 0,
        }),
      );

    for (
      const checkIn
      of todayCheckIns
    ) {
      const hour =
        new Date(
          checkIn.checkInTime,
        ).getHours();

      hourlyCheckIns[
        hour
      ].count += 1;
    }

    const todayCafeRevenue =
      todayCafeSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.totalAmount || 0,
          ),
        0,
      );

    return {
      generatedAt: new Date(),

      stats,
      dailyFinance,

      notifications,
      notificationSummary,

      smsBalance,
      lockerSummary,
      accessSummary,
      walletCafeSummary,

      novaBriefing,

      recentAuditLogs,

      staffLive,
      staffInsideCount:
        staffLive.filter(
          (item) =>
            item.isInside,
        ).length,

      hourlyCheckIns,

      todayCafe: {
        salesCount:
          todayCafeSales.length,
        revenue:
          Number(
            todayCafeRevenue.toFixed(
              2,
            ),
          ),
      },
    };
  }
}
