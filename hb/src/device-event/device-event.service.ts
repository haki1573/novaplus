import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DeviceEvent,
  DeviceEventSeverity,
  DeviceEventType,
} from './device-event.entity';

type CreateDeviceEventInput = {
  gymId: string;
  organizationId?: string | null;
  deviceId?: string | null;
  deviceName: string;
  deviceType: string;
  eventType: DeviceEventType;
  severity?: DeviceEventSeverity;
  title: string;
  description: string;
  previousValue?: string | null;
  currentValue?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class DeviceEventService {
  constructor(
    @InjectRepository(DeviceEvent)
    private readonly repository:
      Repository<DeviceEvent>,
  ) {}

  async create(
    input: CreateDeviceEventInput,
  ) {
    const event = this.repository.create({
      gymId: input.gymId,
      organizationId:
        input.organizationId ?? null,
      deviceId: input.deviceId ?? null,
      deviceName: input.deviceName,
      deviceType: input.deviceType,
      eventType: input.eventType,
      severity:
        input.severity ??
        DeviceEventSeverity.INFO,
      title: input.title,
      description: input.description,
      previousValue:
        input.previousValue ?? null,
      currentValue:
        input.currentValue ?? null,
      metadata: input.metadata ?? null,
    });

    return this.repository.save(event);
  }

  async list(
    gymId: string,
    filters: {
      deviceId?: string;
      deviceType?: string;
      eventType?: DeviceEventType;
      severity?: DeviceEventSeverity;
      limit?: number;
    },
  ) {
    const query =
      this.repository
        .createQueryBuilder('event')
        .where(
          'event.gymId = :gymId',
          { gymId },
        )
        .orderBy(
          'event.createdAt',
          'DESC',
        );

    if (filters.deviceId) {
      query.andWhere(
        'event.deviceId = :deviceId',
        {
          deviceId:
            filters.deviceId,
        },
      );
    }

    if (filters.deviceType) {
      query.andWhere(
        'event.deviceType = :deviceType',
        {
          deviceType:
            filters.deviceType,
        },
      );
    }

    if (filters.eventType) {
      query.andWhere(
        'event.eventType = :eventType',
        {
          eventType:
            filters.eventType,
        },
      );
    }

    if (filters.severity) {
      query.andWhere(
        'event.severity = :severity',
        {
          severity:
            filters.severity,
        },
      );
    }

    const limit = Math.min(
      Math.max(
        Number(filters.limit ?? 200),
        1,
      ),
      1000,
    );

    return query.take(limit).getMany();
  }

  async summary(
    gymId: string,
  ) {
    const last24Hours = new Date(
      Date.now() -
        24 * 60 * 60 * 1000,
    );

    const events = await this.repository
      .createQueryBuilder('event')
      .where(
        'event.gymId = :gymId',
        { gymId },
      )
      .andWhere(
        'event.createdAt >= :last24Hours',
        { last24Hours },
      )
      .orderBy(
        'event.createdAt',
        'DESC',
      )
      .getMany();

    return {
      totalLast24Hours: events.length,
      criticalLast24Hours:
        events.filter(
          (event) =>
            event.severity ===
            DeviceEventSeverity.CRITICAL,
        ).length,
      warningsLast24Hours:
        events.filter(
          (event) =>
            event.severity ===
            DeviceEventSeverity.WARNING,
        ).length,
      latest: events.slice(0, 10),
    };
  }
}
