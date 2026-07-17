import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AuditAction,
  AuditLog,
  AuditModule,
} from './audit-log.entity';

type CreateAuditInput = {
  gymId: string;
  userId?: string | null;
  userName?: string | null;
  module: AuditModule;
  action: AuditAction;
  description: string;
  entityType?: string | null;
  entityId?: string | number | null;
  amount?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  result?: 'SUCCESS' | 'FAILED';
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository:
      Repository<AuditLog>,
  ) {}

  async create(
    input: CreateAuditInput,
  ) {
    const log =
      this.repository.create({
        gymId: input.gymId,
        userId: input.userId || null,
        userName:
          input.userName || null,
        module: input.module,
        action: input.action,
        description:
          input.description,
        entityType:
          input.entityType || null,
        entityId:
          input.entityId !== undefined &&
          input.entityId !== null
            ? String(input.entityId)
            : null,
        amount:
          input.amount !== undefined &&
          input.amount !== null
            ? Number(input.amount)
            : null,
        ipAddress:
          input.ipAddress || null,
        userAgent:
          input.userAgent || null,
        result:
          input.result || 'SUCCESS',
        metadataJson:
          input.metadata
            ? JSON.stringify(
                input.metadata,
              )
            : null,
      });

    return this.repository.save(
      log,
    );
  }

  async list(
    gymId: string,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      module?: AuditModule;
      action?: AuditAction;
      search?: string;
      limit?: number;
    },
  ) {
    const query =
      this.repository
        .createQueryBuilder('log')
        .where(
          'log.gymId = :gymId',
          { gymId },
        )
        .orderBy(
          'log.createdAt',
          'DESC',
        );

    if (filters.dateFrom) {
      const from =
        new Date(
          `${filters.dateFrom}T00:00:00`,
        );

      if (
        Number.isNaN(
          from.getTime(),
        )
      ) {
        throw new BadRequestException(
          'Başlangıç tarihi geçersiz.',
        );
      }

      query.andWhere(
        'log.createdAt >= :from',
        {
          from,
        },
      );
    }

    if (filters.dateTo) {
      const to =
        new Date(
          `${filters.dateTo}T23:59:59.999`,
        );

      if (
        Number.isNaN(
          to.getTime(),
        )
      ) {
        throw new BadRequestException(
          'Bitiş tarihi geçersiz.',
        );
      }

      query.andWhere(
        'log.createdAt <= :to',
        {
          to,
        },
      );
    }

    if (filters.module) {
      query.andWhere(
        'log.module = :module',
        {
          module:
            filters.module,
        },
      );
    }

    if (filters.action) {
      query.andWhere(
        'log.action = :action',
        {
          action:
            filters.action,
        },
      );
    }

    if (
      filters.search?.trim()
    ) {
      query.andWhere(
        `(
          LOWER(log.description)
            LIKE :search
          OR LOWER(log.userName)
            LIKE :search
          OR LOWER(log.entityId)
            LIKE :search
          OR LOWER(log.entityType)
            LIKE :search
        )`,
        {
          search:
            `%${filters.search
              .trim()
              .toLowerCase()}%`,
        },
      );
    }

    const limit =
      Math.min(
        Math.max(
          Number(
            filters.limit || 500,
          ),
          1,
        ),
        2000,
      );

    return query
      .take(limit)
      .getMany();
  }

  async summary(
    gymId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const logs =
      await this.list(
        gymId,
        {
          dateFrom,
          dateTo,
          limit: 2000,
        },
      );

    const byModule =
      Object.values(
        AuditModule,
      ).map((module) => ({
        module,
        count:
          logs.filter(
            (item) =>
              item.module ===
              module,
          ).length,
      }));

    return {
      total: logs.length,
      success:
        logs.filter(
          (item) =>
            item.result ===
            'SUCCESS',
        ).length,
      failed:
        logs.filter(
          (item) =>
            item.result ===
            'FAILED',
        ).length,
      byModule,
      latest:
        logs[0] || null,
    };
  }

  async exportCsv(
    gymId: string,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      module?: AuditModule;
      action?: AuditAction;
      search?: string;
    },
  ) {
    const logs =
      await this.list(
        gymId,
        {
          ...filters,
          limit: 2000,
        },
      );

    const esc = (
      value: unknown,
    ) =>
      `"${String(
        value ?? '',
      ).replace(
        /"/g,
        '""',
      )}"`;

    const header = [
      'Tarih',
      'Kullanıcı',
      'Modül',
      'İşlem',
      'Açıklama',
      'Kayıt Türü',
      'Kayıt No',
      'Tutar',
      'IP',
      'Sonuç',
    ];

    const rows =
      logs.map((item) => [
        new Date(
          item.createdAt,
        ).toLocaleString(
          'tr-TR',
        ),
        item.userName || '',
        item.module,
        item.action,
        item.description,
        item.entityType || '',
        item.entityId || '',
        item.amount ?? '',
        item.ipAddress || '',
        item.result,
      ]);

    return [
      header.map(esc).join(';'),
      ...rows.map(
        (row) =>
          row.map(esc).join(';'),
      ),
    ].join('\r\n');
  }

  validateModule(
    value?: string,
  ) {
    if (!value) return undefined;

    if (
      !Object.values(
        AuditModule,
      ).includes(
        value as AuditModule,
      )
    ) {
      throw new BadRequestException(
        'Geçersiz modül filtresi.',
      );
    }

    return value as AuditModule;
  }

  validateAction(
    value?: string,
  ) {
    if (!value) return undefined;

    if (
      !Object.values(
        AuditAction,
      ).includes(
        value as AuditAction,
      )
    ) {
      throw new BadRequestException(
        'Geçersiz işlem filtresi.',
      );
    }

    return value as AuditAction;
  }
}
