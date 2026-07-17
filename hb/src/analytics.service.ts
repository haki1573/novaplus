import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { CheckIn } from './check-in/check-in.entity';
import { Member } from './member/member.entity';
import { Package } from './package.entity';
import { Finance } from './finance.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInRepository: Repository<CheckIn>,

    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,

    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,

    @InjectRepository(Finance)
    private readonly financeRepository: Repository<Finance>,
  ) {}

  private getDayStart(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private getDayEnd(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  private async updateExpiredMembers(
    gymId: string,
  ): Promise<void> {
    await this.memberRepository.update(
      {
        gymId,
        membershipEnd: LessThan(new Date()),
        status: 'Aktif',
      },
      {
        status: 'Pasif',
      },
    );
  }

  private sumByType(
    records: Finance[],
    type: 'income' | 'expense',
  ): number {
    return records
      .filter((record) => record.type === type)
      .reduce(
        (sum, record) =>
          sum + Number(record.amount),
        0,
      );
  }

  async getDashboardStats(gymId: string) {
    await this.updateExpiredMembers(gymId);

    const now = new Date();
    const todayStart = this.getDayStart(now);
    const todayEnd = this.getDayEnd(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayStart =
      this.getDayStart(yesterday);
    const yesterdayEnd =
      this.getDayEnd(yesterday);

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(
      sevenDaysLater.getDate() + 7,
    );
    sevenDaysLater.setHours(23, 59, 59, 999);

    const [
      totalMembers,
      activeMembers,
      totalPackages,
      totalCheckIns,
      todayCheckIns,
      yesterdayCheckIns,
      expiringMemberships,
      financeRecords,
      recentCheckIns,
      recentFinanceRecords,
      membersWithPackages,
    ] = await Promise.all([
      this.memberRepository.count({
        where: { gymId },
      }),

      this.memberRepository.count({
        where: {
          gymId,
          status: 'Aktif',
        },
      }),

      this.packageRepository.count({
        where: { gymId },
      }),

      this.checkInRepository.count({
        where: { gymId },
      }),

      this.checkInRepository.count({
        where: {
          gymId,
          checkInTime: Between(
            todayStart,
            todayEnd,
          ),
        },
      }),

      this.checkInRepository.count({
        where: {
          gymId,
          checkInTime: Between(
            yesterdayStart,
            yesterdayEnd,
          ),
        },
      }),

      this.memberRepository.count({
        where: {
          gymId,
          status: 'Aktif',
          membershipEnd: Between(
            now,
            sevenDaysLater,
          ),
        },
      }),

      this.financeRepository.find({
        where: { gymId },
        order: { createdAt: 'ASC' },
      }),

      this.checkInRepository.find({
        where: { gymId },
        relations: { member: true },
        order: { checkInTime: 'DESC' },
        take: 8,
      }),

      this.financeRepository.find({
        where: { gymId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),

      this.memberRepository.find({
        where: { gymId },
        relations: { package: true },
      }),
    ]);

    const todayRecords = financeRecords.filter(
      (record) => {
        const createdAt = new Date(record.createdAt);

        return (
          createdAt >= todayStart &&
          createdAt <= todayEnd
        );
      },
    );

    const yesterdayRecords = financeRecords.filter(
      (record) => {
        const createdAt = new Date(record.createdAt);

        return (
          createdAt >= yesterdayStart &&
          createdAt <= yesterdayEnd
        );
      },
    );

    const monthlyRecords = financeRecords.filter(
      (record) => {
        const createdAt = new Date(record.createdAt);

        return (
          createdAt >= monthStart &&
          createdAt <= monthEnd
        );
      },
    );

    const totalIncome =
      this.sumByType(financeRecords, 'income');

    const totalExpense =
      this.sumByType(financeRecords, 'expense');

    const todayIncome =
      this.sumByType(todayRecords, 'income');

    const todayExpense =
      this.sumByType(todayRecords, 'expense');

    const yesterdayIncome =
      this.sumByType(yesterdayRecords, 'income');

    const yesterdayExpense =
      this.sumByType(yesterdayRecords, 'expense');

    const monthlyIncome =
      this.sumByType(monthlyRecords, 'income');

    const monthlyExpense =
      this.sumByType(monthlyRecords, 'expense');

    const packageMap = new Map<string, number>();

    for (const member of membersWithPackages) {
      const packageName =
        member.package?.name || 'Paketsiz';

      packageMap.set(
        packageName,
        (packageMap.get(packageName) || 0) + 1,
      );
    }

    const packageDistribution = Array.from(
      packageMap.entries(),
    )
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalMembers,
      activeMembers,
      passiveMembers:
        totalMembers - activeMembers,
      totalPackages,
      totalCheckIns,
      todayCheckIns,
      yesterdayCheckIns,
      checkInDifference:
        todayCheckIns - yesterdayCheckIns,
      expiringMemberships,

      totalIncome,
      totalExpense,
      balance:
        totalIncome - totalExpense,

      todayIncome,
      todayExpense,
      todayBalance:
        todayIncome - todayExpense,

      yesterdayIncome,
      yesterdayExpense,
      incomeDifference:
        todayIncome - yesterdayIncome,

      monthlyIncome,
      monthlyExpense,
      monthlyBalance:
        monthlyIncome - monthlyExpense,

      packageDistribution,
      recentCheckIns,
      recentFinanceRecords,
    };
  }

  async getHourlyDensity(gymId: string) {
    const now = new Date();
    const todayStart = this.getDayStart(now);
    const todayEnd = this.getDayEnd(now);

    const logs = await this.checkInRepository.find({
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
    });

    const density = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        label:
          `${String(hour).padStart(2, '0')}:00`,
        count: 0,
      }),
    );

    for (const log of logs) {
      const hour =
        new Date(log.checkInTime).getHours();

      density[hour].count += 1;
    }

    return density;
  }

  async getLastSevenDaysFinance(gymId: string) {
    const today = new Date();
    const firstDay = new Date(today);

    firstDay.setDate(
      firstDay.getDate() - 6,
    );
    firstDay.setHours(0, 0, 0, 0);

    const records = await this.financeRepository.find({
      where: {
        gymId,
        createdAt: MoreThanOrEqual(firstDay),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(firstDay);

        date.setDate(
          firstDay.getDate() + index,
        );

        const dayStart =
          this.getDayStart(date);
        const dayEnd =
          this.getDayEnd(date);

        const dayRecords = records.filter(
          (record) => {
            const createdAt =
              new Date(record.createdAt);

            return (
              createdAt >= dayStart &&
              createdAt <= dayEnd
            );
          },
        );

        return {
          date: date.toISOString(),
          label: date.toLocaleDateString(
            'tr-TR',
            { weekday: 'short' },
          ),
          income:
            this.sumByType(
              dayRecords,
              'income',
            ),
          expense:
            this.sumByType(
              dayRecords,
              'expense',
            ),
        };
      },
    );
  }
}
