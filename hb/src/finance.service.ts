import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  Repository,
} from 'typeorm';

import {
  Finance,
  FinanceCategory,
  FinanceType,
} from './finance.entity';

type PeriodKey =
  | 'today'
  | 'week'
  | 'month';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Finance)
    private readonly financeRepository:
      Repository<Finance>,
  ) {}

  private normalizeType(
    value: unknown,
  ): 'income' | 'expense' {
    return value ===
      FinanceType.EXPENSE
      ? 'expense'
      : 'income';
  }

  private normalizeCategory(
    value: unknown,
  ): FinanceCategory {
    if (
      typeof value === 'string' &&
      Object.values(
        FinanceCategory,
      ).includes(
        value as FinanceCategory,
      )
    ) {
      return value as FinanceCategory;
    }

    return FinanceCategory.OTHER;
  }

  private getDayStart(
    date: Date,
  ): Date {
    const result =
      new Date(date);

    result.setHours(
      0,
      0,
      0,
      0,
    );

    return result;
  }

  private getDayEnd(
    date: Date,
  ): Date {
    const result =
      new Date(date);

    result.setHours(
      23,
      59,
      59,
      999,
    );

    return result;
  }

  private getPeriodRange(
    period: PeriodKey,
  ) {
    const now = new Date();

    if (period === 'today') {
      return {
        start:
          this.getDayStart(
            now,
          ),
        end:
          this.getDayEnd(
            now,
          ),
      };
    }

    if (period === 'week') {
      const start =
        this.getDayStart(
          now,
        );

      const day =
        start.getDay();

      const diff =
        day === 0
          ? -6
          : 1 - day;

      start.setDate(
        start.getDate() +
          diff,
      );

      return {
        start,
        end:
          this.getDayEnd(
            now,
          ),
      };
    }

    return {
      start: new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      ),
      end:
        this.getDayEnd(
          now,
        ),
    };
  }

  private calculateTotals(
    records: Finance[],
  ) {
    const totalIncome =
      records
        .filter(
          (record) =>
            record.type ===
            'income',
        )
        .reduce(
          (sum, record) =>
            sum +
            Number(
              record.amount,
            ),
          0,
        );

    const totalExpense =
      records
        .filter(
          (record) =>
            record.type ===
            'expense',
        )
        .reduce(
          (sum, record) =>
            sum +
            Number(
              record.amount,
            ),
          0,
        );

    return {
      totalIncome,
      totalExpense,
      balance:
        totalIncome -
        totalExpense,
    };
  }


  async findPage(
    gymId: string,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      type?: 'all' | 'income' | 'expense';
      category?: 'all' | FinanceCategory;
    },
  ) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = Math.min(
      200,
      Math.max(10, Number(options.pageSize || 100)),
    );
    const search = String(options.search || '').trim().toLowerCase();

    const query = this.financeRepository
      .createQueryBuilder('finance')
      .where('finance.gymId = :gymId', { gymId });

    if (search) {
      query.andWhere(
        `(
          LOWER(finance.title) LIKE :search OR
          LOWER(COALESCE(finance.description, '')) LIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    if (options.type && options.type !== 'all') {
      query.andWhere('finance.type = :type', {
        type: options.type,
      });
    }

    if (options.category && options.category !== 'all') {
      query.andWhere('finance.category = :category', {
        category: options.category,
      });
    }

    const [items, total] = await query
      .orderBy('finance.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }


  async findAll(
    gymId: string,
  ): Promise<Finance[]> {
    return this.financeRepository.find({
      where: { gymId },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(
    id: number,
    gymId: string,
  ): Promise<Finance> {
    const finance =
      await this.financeRepository.findOne({
        where: {
          id,
          gymId,
        },
      });

    if (!finance) {
      throw new NotFoundException(
        'Finans kaydı bulunamadı.',
      );
    }

    return finance;
  }

  async create(
    data: Partial<Finance>,
    gymId: string,
  ): Promise<Finance> {
    const title =
      data.title?.trim();

    const amount =
      Number(data.amount);

    if (!title) {
      throw new BadRequestException(
        'Finans kaydı başlığı zorunludur.',
      );
    }

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        'Tutar sıfırdan büyük olmalıdır.',
      );
    }

    const finance =
      this.financeRepository.create({
        gymId,
        title,
        amount,
        type:
          this.normalizeType(
            data.type,
          ),
        category:
          this.normalizeCategory(
            data.category,
          ),
        description:
          typeof data.description === 'string'
            ? data.description.trim() || null
            : null,
      });

    return this.financeRepository.save(
      finance,
    );
  }

  async update(
    id: number,
    data: Partial<Finance>,
    gymId: string,
  ): Promise<Finance> {
    const finance =
      await this.findOne(
        id,
        gymId,
      );

    if (
      data.title !==
      undefined
    ) {
      const title =
        data.title.trim();

      if (!title) {
        throw new BadRequestException(
          'Finans kaydı başlığı boş olamaz.',
        );
      }

      finance.title =
        title;
    }

    if (
      data.amount !==
      undefined
    ) {
      const amount =
        Number(
          data.amount,
        );

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        throw new BadRequestException(
          'Tutar sıfırdan büyük olmalıdır.',
        );
      }

      finance.amount =
        amount;
    }

    if (
      data.type !==
      undefined
    ) {
      finance.type =
        this.normalizeType(
          data.type,
        );
    }

    if (
      data.category !==
      undefined
    ) {
      finance.category =
        this.normalizeCategory(
          data.category,
        );
    }

    if (
      data.description !==
      undefined
    ) {
      finance.description =
        typeof data.description === 'string'
          ? data.description.trim() || null
          : null;
    }

    return this.financeRepository.save(
      finance,
    );
  }

  async remove(
    id: number,
    gymId: string,
  ) {
    const finance =
      await this.findOne(
        id,
        gymId,
      );

    await this.financeRepository.remove(
      finance,
    );

    return {
      message:
        'Finans kaydı silindi.',
    };
  }

  async getTotalIncome(
    gymId: string,
  ) {
    const records =
      await this.financeRepository.find({
        where: {
          gymId,
          type:
            'income',
        },
      });

    return {
      totalIncome:
        this.calculateTotals(
          records,
        ).totalIncome,
    };
  }

  async getTotalExpense(
    gymId: string,
  ) {
    const records =
      await this.financeRepository.find({
        where: {
          gymId,
          type:
            'expense',
        },
      });

    return {
      totalExpense:
        this.calculateTotals(
          records,
        ).totalExpense,
    };
  }

  async getBalance(
    gymId: string,
  ) {
    const records =
      await this.findAll(
        gymId,
      );

    return this.calculateTotals(
      records,
    );
  }

  async getPeriodSummary(
    gymId: string,
    period: PeriodKey,
  ) {
    const range =
      this.getPeriodRange(
        period,
      );

    const records =
      await this.financeRepository.find({
        where: {
          gymId,
          createdAt:
            Between(
              range.start,
              range.end,
            ),
        },
        order: {
          createdAt:
            'DESC',
        },
      });

    return {
      period,
      start:
        range.start,
      end:
        range.end,
      recordCount:
        records.length,
      ...this.calculateTotals(
        records,
      ),
    };
  }

  async getOverview(
    gymId: string,
  ) {
    const [
      today,
      week,
      month,
      allTime,
    ] = await Promise.all([
      this.getPeriodSummary(
        gymId,
        'today',
      ),
      this.getPeriodSummary(
        gymId,
        'week',
      ),
      this.getPeriodSummary(
        gymId,
        'month',
      ),
      this.getBalance(
        gymId,
      ),
    ]);

    return {
      today,
      week,
      month,
      allTime,
    };
  }

  async getMonthComparison(
    gymId: string,
  ) {
    const now = new Date();

    const currentStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const currentEnd =
      this.getDayEnd(now);

    const previousStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
      0,
      0,
      0,
      0,
    );

    const previousEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const [
      currentRecords,
      previousRecords,
    ] = await Promise.all([
      this.financeRepository.find({
        where: {
          gymId,
          createdAt: Between(
            currentStart,
            currentEnd,
          ),
        },
      }),
      this.financeRepository.find({
        where: {
          gymId,
          createdAt: Between(
            previousStart,
            previousEnd,
          ),
        },
      }),
    ]);

    const current =
      this.calculateTotals(
        currentRecords,
      );

    const previous =
      this.calculateTotals(
        previousRecords,
      );

    const calculateChange = (
      currentValue: number,
      previousValue: number,
    ) => {
      if (previousValue === 0) {
        return currentValue === 0
          ? 0
          : 100;
      }

      return Number(
        (
          ((currentValue -
            previousValue) /
            previousValue) *
          100
        ).toFixed(1),
      );
    };

    return {
      currentMonth: {
        start: currentStart,
        end: currentEnd,
        ...current,
      },
      previousMonth: {
        start: previousStart,
        end: previousEnd,
        ...previous,
      },
      changes: {
        incomePercent:
          calculateChange(
            current.totalIncome,
            previous.totalIncome,
          ),
        expensePercent:
          calculateChange(
            current.totalExpense,
            previous.totalExpense,
          ),
        balancePercent:
          calculateChange(
            current.balance,
            previous.balance,
          ),
      },
    };
  }

  async getTopIncomeCategory(
    gymId: string,
    period:
      | 'today'
      | 'week'
      | 'month' =
      'month',
  ) {
    const distribution =
      await this.getCategoryDistribution(
        gymId,
        period,
      );

    const topCategory =
      distribution.income[0] ||
      null;

    const totalIncome =
      distribution.income.reduce(
        (sum, item) =>
          sum + item.amount,
        0,
      );

    return {
      period,
      totalIncome,
      topCategory:
        topCategory
          ? {
              ...topCategory,
              sharePercent:
                totalIncome > 0
                  ? Number(
                      (
                        (topCategory.amount /
                          totalIncome) *
                        100
                      ).toFixed(1),
                    )
                  : 0,
            }
          : null,
    };
  }



  async getCategoryDistribution(
    gymId: string,
    period: PeriodKey,
  ) {
    const range =
      this.getPeriodRange(
        period,
      );

    const records =
      await this.financeRepository.find({
        where: {
          gymId,
          createdAt:
            Between(
              range.start,
              range.end,
            ),
        },
      });

    const income =
      Object.values(
        FinanceCategory,
      ).map(
        (category) => ({
          category,
          amount:
            records
              .filter(
                (record) =>
                  record.type ===
                    'income' &&
                  record.category ===
                    category,
              )
              .reduce(
                (
                  sum,
                  record,
                ) =>
                  sum +
                  Number(
                    record.amount,
                  ),
                0,
              ),
        }),
      )
        .filter(
          (item) =>
            item.amount > 0,
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount,
        );

    const expense =
      Object.values(
        FinanceCategory,
      ).map(
        (category) => ({
          category,
          amount:
            records
              .filter(
                (record) =>
                  record.type ===
                    'expense' &&
                  record.category ===
                    category,
              )
              .reduce(
                (
                  sum,
                  record,
                ) =>
                  sum +
                  Number(
                    record.amount,
                  ),
                0,
              ),
        }),
      )
        .filter(
          (item) =>
            item.amount > 0,
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount,
        );

    return {
      period,
      start:
        range.start,
      end:
        range.end,
      income,
      expense,
    };
  }
}
