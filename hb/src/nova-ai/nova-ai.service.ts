import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { Member } from '../member/member.entity';
import { CheckIn } from '../check-in/check-in.entity';
import { Finance } from '../finance.entity';
import { CafeProduct } from '../wallet-cafe/cafe-product.entity';
import { CafeSale } from '../wallet-cafe/cafe-sale.entity';
import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import {
  Locker,
  LockerStatus,
} from '../locker/locker.entity';
import { StaffAttendance } from '../staff/staff-attendance.entity';

type AlertSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'critical';

type IntelligenceAlert = {
  id: string;
  severity: AlertSeverity;
  module:
    | 'MEMBERS'
    | 'FINANCE'
    | 'CAFE'
    | 'SMS'
    | 'LOCKERS'
    | 'STAFF';
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
};

@Injectable()
export class NovaAiService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,

    @InjectRepository(CheckIn)
    private readonly checkInRepository:
      Repository<CheckIn>,

    @InjectRepository(Finance)
    private readonly financeRepository:
      Repository<Finance>,

    @InjectRepository(CafeProduct)
    private readonly cafeProductRepository:
      Repository<CafeProduct>,

    @InjectRepository(CafeSale)
    private readonly cafeSaleRepository:
      Repository<CafeSale>,

    @InjectRepository(GymSmsBalance)
    private readonly smsBalanceRepository:
      Repository<GymSmsBalance>,

    @InjectRepository(Locker)
    private readonly lockerRepository:
      Repository<Locker>,

    @InjectRepository(StaffAttendance)
    private readonly staffAttendanceRepository:
      Repository<StaffAttendance>,
  ) {}

  private startOfDay(date = new Date()) {
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

  private endOfDay(date = new Date()) {
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

  private daysAgo(days: number) {
    const date = this.startOfDay();

    date.setDate(
      date.getDate() - days,
    );

    return date;
  }

  private daysLater(days: number) {
    const date = this.endOfDay();

    date.setDate(
      date.getDate() + days,
    );

    return date;
  }

  private clamp(
    value: number,
    min = 0,
    max = 100,
  ) {
    return Math.min(
      max,
      Math.max(min, value),
    );
  }

  private scoreLabel(
    score: number,
  ) {
    if (score >= 90) return 'Mükemmel';
    if (score >= 75) return 'İyi';
    if (score >= 60) return 'Dikkat';
    return 'Kritik';
  }

  async briefing(gymId: string) {
    const todayStart =
      this.startOfDay();
    const todayEnd =
      this.endOfDay();
    const sevenDaysLater =
      this.daysLater(7);
    const fifteenDaysAgo =
      this.daysAgo(15);
    const sevenDaysAgo =
      this.daysAgo(7);

    const [
      members,
      expiringMembers,
      recentCheckIns,
      todayFinance,
      weekFinance,
      criticalProducts,
      todayCafeSales,
      smsBalance,
      lockers,
      staffAttendance,
    ] = await Promise.all([
      this.memberRepository.find({
        where: {
          gymId,
          isArchived: false,
        },
      }),

      this.memberRepository.find({
        where: {
          gymId,
          isArchived: false,
          status: 'Aktif',
          membershipEnd: Between(
            todayStart,
            sevenDaysLater,
          ),
        },
      }),

      this.checkInRepository.find({
        where: {
          gymId,
          checkInTime:
            MoreThanOrEqual(
              fifteenDaysAgo,
            ),
        },
      }),

      this.financeRepository.find({
        where: {
          gymId,
          createdAt: Between(
            todayStart,
            todayEnd,
          ),
        },
      }),

      this.financeRepository.find({
        where: {
          gymId,
          createdAt: MoreThanOrEqual(
            sevenDaysAgo,
          ),
        },
      }),

      this.cafeProductRepository.find({
        where: {
          gymId,
          isActive: true,
        },
      }),

      this.cafeSaleRepository.find({
        where: {
          gymId,
          createdAt: Between(
            todayStart,
            todayEnd,
          ),
        },
      }),

      this.smsBalanceRepository.findOne({
        where: { gymId },
      }),

      this.lockerRepository.find({
        where: { gymId },
      }),

      this.staffAttendanceRepository.find({
        where: {
          gymId,
          checkInTime: MoreThanOrEqual(
            sevenDaysAgo,
          ),
        },
      }),
    ]);

    const activeMembers =
      members.filter(
        (member) =>
          member.status === 'Aktif',
      );

    const recentMemberIds =
      new Set(
        recentCheckIns.map(
          (item) => item.memberId,
        ),
      );

    const inactiveMembers =
      activeMembers.filter(
        (member) =>
          !recentMemberIds.has(
            member.id,
          ),
      );

    const todayIncome =
      todayFinance
        .filter(
          (item) =>
            item.type === 'income',
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0,
        );

    const todayExpense =
      todayFinance
        .filter(
          (item) =>
            item.type === 'expense',
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0,
        );

    const weeklyIncome =
      weekFinance
        .filter(
          (item) =>
            item.type === 'income',
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0,
        );

    const weeklyExpense =
      weekFinance
        .filter(
          (item) =>
            item.type === 'expense',
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0,
        );

    const lowStockProducts =
      criticalProducts.filter(
        (product) =>
          Number(
            product.stockQuantity || 0,
          ) <=
          Number(
            product.lowStockLimit || 0,
          ),
      );

    const todayCafeRevenue =
      todayCafeSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.totalAmount || 0,
          ),
        0,
      );

    const occupiedLockers =
      lockers.filter(
        (locker) =>
          locker.status ===
          LockerStatus.OCCUPIED,
      ).length;

    const outOfServiceLockers =
      lockers.filter(
        (locker) =>
          locker.status ===
          LockerStatus.OUT_OF_SERVICE,
      ).length;

    const lockerOccupancyRate =
      lockers.length > 0
        ? Math.round(
            (
              occupiedLockers /
              lockers.length
            ) * 100,
          )
        : 0;

    const staffMinutes =
      staffAttendance.reduce(
        (sum, record) =>
          sum +
          Number(
            record.durationMinutes || 0,
          ),
        0,
      );

    const alerts:
      IntelligenceAlert[] = [];

    if (expiringMembers.length > 0) {
      alerts.push({
        id: 'expiring-members',
        severity:
          expiringMembers.length >= 10
            ? 'critical'
            : 'warning',
        module: 'MEMBERS',
        title:
          'Üyeliği bitecek üyeler',
        description:
          `${expiringMembers.length} üyenin üyeliği 7 gün içinde sona erecek.`,
        actionLabel:
          'Üyeleri görüntüle',
        actionPath: '/members',
      });
    }

    if (inactiveMembers.length > 0) {
      alerts.push({
        id: 'inactive-members',
        severity:
          inactiveMembers.length >= 15
            ? 'critical'
            : 'warning',
        module: 'MEMBERS',
        title:
          'Uzun süredir gelmeyen üyeler',
        description:
          `${inactiveMembers.length} aktif üye son 15 gündür giriş yapmadı.`,
        actionLabel:
          'Üyeleri incele',
        actionPath: '/members',
      });
    }

    if (lowStockProducts.length > 0) {
      alerts.push({
        id: 'critical-stock',
        severity:
          lowStockProducts.length >= 5
            ? 'critical'
            : 'warning',
        module: 'CAFE',
        title:
          'Kritik kafe stoğu',
        description:
          `${lowStockProducts.length} ürün düşük stok seviyesinde.`,
        actionLabel:
          'Kafeyi aç',
        actionPath: '/cafe',
      });
    }

    const smsRemaining =
      Number(
        smsBalance?.balance || 0,
      );

    if (smsRemaining <= 250) {
      alerts.push({
        id: 'sms-balance',
        severity:
          smsRemaining <= 50
            ? 'critical'
            : 'warning',
        module: 'SMS',
        title:
          'SMS bakiyesi azalıyor',
        description:
          `${smsRemaining} adet SMS kredisi kaldı.`,
        actionLabel:
          'SMS panelini aç',
        actionPath: '/sms',
      });
    }

    if (lockerOccupancyRate >= 85) {
      alerts.push({
        id: 'locker-capacity',
        severity:
          lockerOccupancyRate >= 95
            ? 'critical'
            : 'warning',
        module: 'LOCKERS',
        title:
          'Dolap kapasitesi yüksek',
        description:
          `Dolapların %${lockerOccupancyRate} kadarı dolu.`,
        actionLabel:
          'Dolapları görüntüle',
        actionPath: '/lockers',
      });
    }

    if (outOfServiceLockers > 0) {
      alerts.push({
        id: 'locker-faults',
        severity: 'warning',
        module: 'LOCKERS',
        title:
          'Arızalı dolaplar var',
        description:
          `${outOfServiceLockers} dolap kullanım dışı.`,
        actionLabel:
          'Dolapları kontrol et',
        actionPath: '/lockers',
      });
    }

    if (
      weeklyExpense >
      weeklyIncome &&
      weeklyExpense > 0
    ) {
      alerts.push({
        id: 'finance-risk',
        severity: 'critical',
        module: 'FINANCE',
        title:
          'Haftalık gider yüksek',
        description:
          'Son 7 günlük gider, gelirden daha yüksek.',
        actionLabel:
          'Finansı incele',
        actionPath: '/finance',
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'all-good',
        severity: 'success',
        module: 'FINANCE',
        title:
          'Salon dengeli görünüyor',
        description:
          'Şu anda kritik seviyede bir operasyon uyarısı bulunmuyor.',
      });
    }

    const membersScore =
      this.clamp(
        100 -
          Math.min(
            35,
            expiringMembers.length * 3,
          ) -
          Math.min(
            35,
            inactiveMembers.length * 2,
          ),
      );

    const financeScore =
      weeklyIncome === 0 &&
      weeklyExpense === 0
        ? 75
        : this.clamp(
            70 +
              (
                (
                  weeklyIncome -
                  weeklyExpense
                ) /
                Math.max(
                  weeklyIncome,
                  weeklyExpense,
                  1,
                )
              ) *
                30,
          );

    const cafeScore =
      this.clamp(
        100 -
          lowStockProducts.length * 12,
      );

    const smsScore =
      smsRemaining >= 500
        ? 100
        : smsRemaining >= 250
          ? 85
          : smsRemaining >= 100
            ? 65
            : smsRemaining >= 50
              ? 45
              : 25;

    const lockerScore =
      this.clamp(
        100 -
          outOfServiceLockers * 12 -
          Math.max(
            0,
            lockerOccupancyRate - 80,
          ),
      );

    const staffScore =
      staffMinutes > 0
        ? 90
        : 75;

    const healthScore =
      Math.round(
        (
          membersScore * 0.25 +
          financeScore * 0.25 +
          cafeScore * 0.15 +
          smsScore * 0.1 +
          lockerScore * 0.15 +
          staffScore * 0.1
        ),
      );

    const suggestions:
      string[] = [];

    if (expiringMembers.length > 0) {
      suggestions.push(
        `Üyeliği bitecek ${expiringMembers.length} üyeyle iletişime geçin.`,
      );
    }

    if (inactiveMembers.length > 0) {
      suggestions.push(
        `Uzun süredir gelmeyen ${inactiveMembers.length} üyeye hatırlatma kampanyası hazırlayın.`,
      );
    }

    if (lowStockProducts.length > 0) {
      suggestions.push(
        `${lowStockProducts.length} kritik ürün için stok siparişi planlayın.`,
      );
    }

    if (smsRemaining <= 250) {
      suggestions.push(
        'SMS bakiyesini yenileyin.',
      );
    }

    if (lockerOccupancyRate >= 85) {
      suggestions.push(
        'Yoğun saatlerde dolap kullanımını kontrol edin.',
      );
    }

    if (
      weeklyIncome > weeklyExpense &&
      weeklyIncome > 0
    ) {
      suggestions.push(
        'Haftalık finans dengesi pozitif; gelir kaynaklarını koruyun.',
      );
    }

    return {
      generatedAt:
        new Date().toISOString(),

      healthScore: {
        total: healthScore,
        label:
          this.scoreLabel(
            healthScore,
          ),
        breakdown: {
          members:
            Math.round(
              membersScore,
            ),
          finance:
            Math.round(
              financeScore,
            ),
          cafe:
            Math.round(
              cafeScore,
            ),
          sms:
            Math.round(
              smsScore,
            ),
          lockers:
            Math.round(
              lockerScore,
            ),
          staff:
            Math.round(
              staffScore,
            ),
        },
      },

      summary: {
        totalMembers:
          members.length,
        activeMembers:
          activeMembers.length,
        expiringMembers:
          expiringMembers.length,
        inactiveMembers:
          inactiveMembers.length,
        criticalStock:
          lowStockProducts.length,
        smsBalance:
          smsRemaining,
        lockerOccupancyRate,
        outOfServiceLockers,
        todayIncome:
          Number(
            todayIncome.toFixed(2),
          ),
        todayExpense:
          Number(
            todayExpense.toFixed(2),
          ),
        todayCafeRevenue:
          Number(
            todayCafeRevenue.toFixed(
              2,
            ),
          ),
        weeklyIncome:
          Number(
            weeklyIncome.toFixed(2),
          ),
        weeklyExpense:
          Number(
            weeklyExpense.toFixed(2),
          ),
        weeklyStaffMinutes:
          staffMinutes,
      },

      alerts,
      suggestions,
    };
  }

  async healthScore(
    gymId: string,
  ) {
    const briefing =
      await this.briefing(gymId);

    return briefing.healthScore;
  }

  async alerts(
    gymId: string,
  ) {
    const briefing =
      await this.briefing(gymId);

    return {
      alerts:
        briefing.alerts,
      suggestions:
        briefing.suggestions,
    };
  }
}
