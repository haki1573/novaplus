import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  Repository,
} from 'typeorm';

import { Member } from '../member/member.entity';
import { Finance } from '../finance.entity';
import { SmsHistory } from '../sms/sms-history.entity';
import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import { Locker } from '../locker/locker.entity';
import { LockerHistory } from '../locker/locker-history.entity';
import { CafeSale } from '../wallet-cafe/cafe-sale.entity';
import { CafeProduct } from '../wallet-cafe/cafe-product.entity';
import { Staff } from '../staff/staff.entity';
import { StaffAttendance } from '../staff/staff-attendance.entity';
import {
  TurnstileEvent,
  TurnstileEventDirection,
  TurnstileEventResult,
} from '../turnstile/turnstile-event.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,

    @InjectRepository(Finance)
    private readonly financeRepository:
      Repository<Finance>,

    @InjectRepository(SmsHistory)
    private readonly smsHistoryRepository:
      Repository<SmsHistory>,

    @InjectRepository(GymSmsBalance)
    private readonly smsBalanceRepository:
      Repository<GymSmsBalance>,

    @InjectRepository(Locker)
    private readonly lockerRepository:
      Repository<Locker>,

    @InjectRepository(LockerHistory)
    private readonly lockerHistoryRepository:
      Repository<LockerHistory>,

    @InjectRepository(CafeSale)
    private readonly cafeSaleRepository:
      Repository<CafeSale>,

    @InjectRepository(CafeProduct)
    private readonly cafeProductRepository:
      Repository<CafeProduct>,

    @InjectRepository(Staff)
    private readonly staffRepository:
      Repository<Staff>,

    @InjectRepository(StaffAttendance)
    private readonly attendanceRepository:
      Repository<StaffAttendance>,

    @InjectRepository(TurnstileEvent)
    private readonly turnstileEventRepository:
      Repository<TurnstileEvent>,
  ) {}

  private parseRange(
    dateFrom?: string,
    dateTo?: string,
  ) {
    const now = new Date();

    const from = dateFrom
      ? new Date(`${dateFrom}T00:00:00`)
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );

    const to = dateTo
      ? new Date(`${dateTo}T23:59:59.999`)
      : new Date();

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime())
    ) {
      throw new BadRequestException(
        'Tarih aralığı geçersiz.',
      );
    }

    if (from > to) {
      throw new BadRequestException(
        'Başlangıç tarihi bitiş tarihinden sonra olamaz.',
      );
    }

    return { from, to };
  }

  async overview(
    gymId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const { from, to } =
      this.parseRange(
        dateFrom,
        dateTo,
      );

    const [
      members,
      finance,
      smsHistory,
      smsBalance,
      lockers,
      lockerHistory,
      cafeSales,
      cafeProducts,
      staff,
      attendance,
      turnstileEvents,
    ] = await Promise.all([
      this.memberRepository.find({
        where: {
          gymId,
          isArchived: false,
        },
        relations: {
          package: true,
        },
      }),

      this.financeRepository.find({
        where: {
          gymId,
          createdAt: Between(
            from,
            to,
          ),
        },
        order: {
          createdAt: 'DESC',
        },
      }),

      this.smsHistoryRepository.find({
        where: {
          gymId,
          createdAt: Between(
            from,
            to,
          ),
        },
        order: {
          createdAt: 'DESC',
        },
      }),

      this.smsBalanceRepository.findOne({
        where: {
          gymId,
        },
      }),

      this.lockerRepository.find({
        where: {
          gymId,
        },
      }),

      this.lockerHistoryRepository.find({
        where: {
          gymId,
          createdAt: Between(
            from,
            to,
          ),
        },
        order: {
          createdAt: 'DESC',
        },
      }),

      this.cafeSaleRepository.find({
        where: {
          gymId,
          createdAt: Between(
            from,
            to,
          ),
        },
        order: {
          createdAt: 'DESC',
        },
      }),

      this.cafeProductRepository.find({
        where: {
          gymId,
        },
      }),

      this.staffRepository.find({
        where: {
          gymId,
          isArchived: false,
        },
      }),

      this.attendanceRepository.find({
        where: {
          gymId,
          checkInTime: Between(
            from,
            to,
          ),
        },
        relations: {
          staff: true,
        },
        order: {
          checkInTime: 'DESC',
        },
      }),

      this.turnstileEventRepository.find({
        where: {
          gymId,
          createdAt: Between(
            from,
            to,
          ),
        },
        order: {
          createdAt: 'DESC',
        },
        take: 1000,
      }),
    ]);

    const activeMembers =
      members.filter(
        (member) =>
          member.status === 'Aktif',
      );

    const passiveMembers =
      members.filter(
        (member) =>
          member.status !== 'Aktif',
      );

    const newMembers =
      members.filter(
        (member) => {
          const createdAt =
            (member as unknown as {
              createdAt?: Date;
            }).createdAt;

          if (!createdAt) {
            return false;
          }

          const date =
            new Date(createdAt);

          return (
            date >= from &&
            date <= to
          );
        },
      );

    const packageMap =
      new Map<string, number>();

    for (const member of members) {
      const packageName =
        member.package?.name ||
        'Paketsiz';

      packageMap.set(
        packageName,
        (
          packageMap.get(
            packageName,
          ) || 0
        ) + 1,
      );
    }

    const totalIncome =
      finance
        .filter(
          (item) =>
            item.type === 'income',
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.amount || 0,
            ),
          0,
        );

    const totalExpense =
      finance
        .filter(
          (item) =>
            item.type === 'expense',
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.amount || 0,
            ),
          0,
        );

    const sentSms =
      smsHistory.filter(
        (item) =>
          String(item.status) ===
            'SENT' ||
          String(item.status) ===
            'DELIVERED',
      ).length;

    const failedSms =
      smsHistory.filter(
        (item) =>
          String(item.status) ===
          'FAILED',
      ).length;

    const smsSuccessRate =
      smsHistory.length > 0
        ? Number(
            (
              (
                sentSms /
                smsHistory.length
              ) * 100
            ).toFixed(2),
          )
        : 0;

    const totalCafeRevenue =
      cafeSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.totalAmount || 0,
          ),
        0,
      );

    const lowStockProducts =
      cafeProducts.filter(
        (product) =>
          product.isActive &&
          Number(
            product.stockQuantity ||
              0,
          ) <=
            Number(
              product.lowStockLimit ||
                0,
            ),
      );

    const totalStaffMinutes =
      attendance.reduce(
        (sum, item) =>
          sum +
          Number(
            item.durationMinutes ||
              0,
          ),
        0,
      );

    const staffInside =
      attendance
        .filter(
          (item) =>
            !item.checkOutTime,
        )
        .map(
          (item) =>
            item.staffId,
        );

    const approvedTurnstileEvents =
      turnstileEvents.filter(
        (item) =>
          item.result ===
          TurnstileEventResult.APPROVED,
      );

    const rejectedTurnstileEvents =
      turnstileEvents.filter(
        (item) =>
          item.result ===
          TurnstileEventResult.REJECTED,
      );

    const turnstileUsageMap =
      new Map<
        string,
        {
          turnstileId: string;
          turnstileName: string;
          count: number;
        }
      >();

    for (
      const event of
      approvedTurnstileEvents
    ) {
      const current =
        turnstileUsageMap.get(
          event.turnstileId,
        ) || {
          turnstileId:
            event.turnstileId,
          turnstileName:
            event.turnstileName ||
            'Turnike',
          count: 0,
        };

      current.count += 1;

      turnstileUsageMap.set(
        event.turnstileId,
        current,
      );
    }

    const turnstileUsage =
      [...turnstileUsageMap.values()]
        .sort(
          (a, b) =>
            b.count - a.count,
        );

    const rejectionReasonMap =
      new Map<string, number>();

    for (
      const event of
      rejectedTurnstileEvents
    ) {
      const reason =
        event.reason ||
        'Belirtilmedi';

      rejectionReasonMap.set(
        reason,
        (
          rejectionReasonMap.get(
            reason,
          ) || 0
        ) + 1,
      );
    }

    const rejectionReasons =
      [...rejectionReasonMap.entries()]
        .map(
          ([reason, count]) => ({
            reason,
            count,
          }),
        )
        .sort(
          (a, b) =>
            b.count - a.count,
        );

    return {
      dateFrom:
        from
          .toISOString()
          .slice(0, 10),

      dateTo:
        to
          .toISOString()
          .slice(0, 10),

      members: {
        total:
          members.length,
        active:
          activeMembers.length,
        passive:
          passiveMembers.length,
        newInRange:
          newMembers.length,
        packageDistribution:
          [...packageMap.entries()]
            .map(
              ([name, count]) => ({
                name,
                count,
              }),
            )
            .sort(
              (a, b) =>
                b.count -
                a.count,
            ),
      },

      finance: {
        totalIncome:
          Number(
            totalIncome.toFixed(2),
          ),
        totalExpense:
          Number(
            totalExpense.toFixed(2),
          ),
        balance:
          Number(
            (
              totalIncome -
              totalExpense
            ).toFixed(2),
          ),
        records: finance.slice(0, 500),
      },

      sms: {
        balance:
          smsBalance?.balance ||
          0,
        totalPurchased:
          smsBalance
            ?.totalPurchased || 0,
        totalUsed:
          smsBalance
            ?.totalUsed || 0,
        totalMessages:
          smsHistory.length,
        sent:
          sentSms,
        failed:
          failedSms,
        successRate:
          smsSuccessRate,
        history:
          smsHistory.slice(0, 500),
      },

      lockers: {
        total:
          lockers.length,
        available:
          lockers.filter(
            (item) =>
              String(
                item.status,
              ) ===
              'AVAILABLE',
          ).length,
        occupied:
          lockers.filter(
            (item) =>
              String(
                item.status,
              ) ===
              'OCCUPIED',
          ).length,
        outOfService:
          lockers.filter(
            (item) =>
              String(
                item.status,
              ) ===
              'OUT_OF_SERVICE',
          ).length,
        totalMovements:
          lockerHistory.length,
        history:
          lockerHistory.slice(0, 500),
      },

      cafe: {
        totalSales:
          cafeSales.length,
        totalRevenue:
          Number(
            totalCafeRevenue.toFixed(
              2,
            ),
          ),
        totalProducts:
          cafeProducts.length,
        activeProducts:
          cafeProducts.filter(
            (item) =>
              item.isActive,
          ).length,
        lowStockProducts:
          lowStockProducts.length,
        sales:
          cafeSales.slice(0, 500),
      },

      turnstile: {
        totalEvents:
          turnstileEvents.length,
        entries:
          turnstileEvents.filter(
            (item) =>
              item.direction ===
              TurnstileEventDirection.ENTRY,
          ).length,
        exits:
          turnstileEvents.filter(
            (item) =>
              item.direction ===
              TurnstileEventDirection.EXIT,
          ).length,
        approved:
          approvedTurnstileEvents.length,
        rejected:
          rejectedTurnstileEvents.length,
        approvalRate:
          turnstileEvents.length > 0
            ? Number(
                (
                  (
                    approvedTurnstileEvents.length /
                    turnstileEvents.length
                  ) * 100
                ).toFixed(1),
              )
            : 0,
        busiestTurnstile:
          turnstileUsage[0] || null,
        usage:
          turnstileUsage,
        rejectionReasons,
        events:
          turnstileEvents.slice(0, 500),
      },

      staff: {
        total:
          staff.length,
        active:
          staff.filter(
            (item) =>
              item.isActive,
          ).length,
        insideNow:
          new Set(
            staffInside,
          ).size,
        totalAttendance:
          attendance.length,
        totalMinutes:
          totalStaffMinutes,
        attendance:
          attendance.slice(0, 500),
      },
    };
  }

  async exportCsv(
    gymId: string,
    reportType: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const report =
      await this.overview(
        gymId,
        dateFrom,
        dateTo,
      );

    const escapeCsv = (
      value: unknown,
    ) =>
      `"${String(
        value ?? '',
      ).replace(
        /"/g,
        '""',
      )}"`;

    let headers: string[] = [];
    let rows:
      Array<
        Array<
          string | number
        >
      > = [];

    if (reportType === 'members') {
      headers = [
        'Paket',
        'Üye Sayısı',
      ];

      rows =
        report.members
          .packageDistribution
          .map((item) => [
            item.name,
            item.count,
          ]);
    } else if (
      reportType === 'finance'
    ) {
      headers = [
        'Başlık',
        'Tür',
        'Tutar',
        'Açıklama',
        'Tarih',
      ];

      rows =
        report.finance.records
          .map((item) => [
            item.title,
            item.type,
            Number(
              item.amount || 0,
            ),
            item.description || '',
            new Date(
              item.createdAt,
            ).toLocaleString(
              'tr-TR',
            ),
          ]);
    } else if (
      reportType === 'sms'
    ) {
      headers = [
        'Telefon',
        'Durum',
        'SMS Maliyeti',
        'Mesaj',
        'Tarih',
      ];

      rows =
        report.sms.history
          .map((item) => [
            item.phone,
            String(item.status),
            Number(
              item.smsCost || 0,
            ),
            item.message,
            new Date(
              item.createdAt,
            ).toLocaleString(
              'tr-TR',
            ),
          ]);
    } else if (
      reportType === 'lockers'
    ) {
      headers = [
        'Dolap',
        'İşlem',
        'Açıklama',
        'Tarih',
      ];

      rows =
        report.lockers.history
          .map((item) => [
            item.lockerId,
            String(item.action),
            item.description || '',
            new Date(
              item.createdAt,
            ).toLocaleString(
              'tr-TR',
            ),
          ]);
    } else if (
      reportType === 'cafe'
    ) {
      headers = [
        'Satış No',
        'Üye No',
        'Ödeme Yöntemi',
        'Toplam',
        'Tarih',
      ];

      rows =
        report.cafe.sales
          .map((item) => [
            item.id,
            item.memberId || '',
            String(
              item.paymentMethod,
            ),
            Number(
              item.totalAmount || 0,
            ),
            new Date(
              item.createdAt,
            ).toLocaleString(
              'tr-TR',
            ),
          ]);
    } else if (
      reportType === 'turnstile'
    ) {
      headers = [
        'Turnike',
        'Üye',
        'Yön',
        'Sonuç',
        'Erişim Türü',
        'Kod',
        'Neden',
        'Tarih',
      ];

      rows =
        report.turnstile.events
          .map((item) => [
            item.turnstileName ||
              item.turnstileId,
            item.memberName || '',
            String(item.direction),
            String(item.result),
            item.credentialType || '',
            item.credentialCode || '',
            item.reason || '',
            new Date(
              item.createdAt,
            ).toLocaleString(
              'tr-TR',
            ),
          ]);
    } else if (
      reportType === 'staff'
    ) {
      headers = [
        'Personel',
        'Tarih',
        'Giriş',
        'Çıkış',
        'Süre (Dakika)',
        'Erişim Türü',
      ];

      rows =
        report.staff.attendance
          .map((item) => [
            item.staff?.fullName ||
              'Personel',
            item.workDate,
            new Date(
              item.checkInTime,
            ).toLocaleString(
              'tr-TR',
            ),
            item.checkOutTime
              ? new Date(
                  item.checkOutTime,
                ).toLocaleString(
                  'tr-TR',
                )
              : '',
            Number(
              item.durationMinutes ||
                0,
            ),
            item.accessType,
          ]);
    } else {
      throw new BadRequestException(
        'Rapor türü geçersiz.',
      );
    }

    return [
      headers
        .map(escapeCsv)
        .join(';'),
      ...rows.map(
        (row) =>
          row
            .map(escapeCsv)
            .join(';'),
      ),
    ].join('\r\n');
  }
}
