import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  In,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import {
  Gym,
} from '../gym/gym.entity';

import {
  Turnstile,
  TurnstileDirection,
  TurnstileStatus,
} from './turnstile.entity';

import {
  TurnstileEvent,
  TurnstileEventDirection,
  TurnstileEventResult,
} from './turnstile-event.entity';

import {
  TURNSTILE_PROVIDER,
} from './turnstile-provider.interface';

import type {
  TurnstileProvider,
} from './turnstile-provider.interface';

interface TurnstileInput {
  name?: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  location?: string | null;
  direction?: TurnstileDirection;
  firmwareVersion?: string | null;
  isActive?: boolean;
}

@Injectable()
export class TurnstileService {
  constructor(
    @InjectRepository(Turnstile)
    private readonly turnstileRepository:
      Repository<Turnstile>,

    @InjectRepository(TurnstileEvent)
    private readonly eventRepository:
      Repository<TurnstileEvent>,

    @InjectRepository(Gym)
    private readonly gymRepository:
      Repository<Gym>,

    @Inject(TURNSTILE_PROVIDER)
    private readonly provider:
      TurnstileProvider,
  ) {}


  async getOrganizationDashboard(
    organizationId: string,
    authorizedGymIds?: string[],
    accessAllGyms = false,
  ) {
    const organization =
      String(
        organizationId || '',
      ).trim();

    if (!organization) {
      throw new BadRequestException(
        'Kullanıcı bir işletmeye bağlı değil.',
      );
    }

    const gyms =
      await this.gymRepository.find({
        where: {
          organizationId:
            organization,
        },
        order: {
          name: 'ASC',
        },
      });

    const visibleGyms =
      accessAllGyms
        ? gyms
        : gyms.filter(
            (gym) =>
              (
                authorizedGymIds ||
                []
              ).includes(gym.id),
          );

    if (
      visibleGyms.length === 0
    ) {
      return {
        organizationId:
          organization,
        summary: {
          totalGyms: 0,
          totalTurnstiles: 0,
          online: 0,
          offline: 0,
          maintenance: 0,
          approvedToday: 0,
          rejectedToday: 0,
        },
        gyms: [],
        recentEvents: [],
      };
    }

    const gymIds =
      visibleGyms.map(
        (gym) => gym.id,
      );

    const todayStart =
      new Date();

    todayStart.setHours(
      0,
      0,
      0,
      0,
    );

    const [
      turnstiles,
      events,
    ] = await Promise.all([
      this.turnstileRepository.find({
        where: {
          gymId:
            In(gymIds),
        },
        order: {
          name: 'ASC',
        },
      }),

      this.eventRepository.find({
        where: {
          gymId:
            In(gymIds),
          createdAt:
            MoreThanOrEqual(
              todayStart,
            ),
        },
        order: {
          createdAt: 'DESC',
        },
        take: 500,
      }),
    ]);

    const gymRows =
      visibleGyms.map(
        (gym) => {
          const gymTurnstiles =
            turnstiles.filter(
              (item) =>
                item.gymId ===
                gym.id,
            );

          const gymEvents =
            events.filter(
              (item) =>
                item.gymId ===
                gym.id,
            );

          return {
            gymId:
              gym.id,
            gymName:
              gym.name,
            city:
              gym.city,
            isActive:
              gym.isActive,
            summary: {
              total:
                gymTurnstiles.length,
              online:
                gymTurnstiles.filter(
                  (item) =>
                    item.status ===
                    TurnstileStatus.ONLINE,
                ).length,
              offline:
                gymTurnstiles.filter(
                  (item) =>
                    item.status ===
                    TurnstileStatus.OFFLINE,
                ).length,
              maintenance:
                gymTurnstiles.filter(
                  (item) =>
                    item.status ===
                    TurnstileStatus.MAINTENANCE,
                ).length,
              approvedToday:
                gymEvents.filter(
                  (item) =>
                    item.result ===
                    TurnstileEventResult.APPROVED,
                ).length,
              rejectedToday:
                gymEvents.filter(
                  (item) =>
                    item.result ===
                    TurnstileEventResult.REJECTED,
                ).length,
            },
            turnstiles:
              gymTurnstiles,
          };
        },
      );

    return {
      organizationId:
        organization,
      summary: {
        totalGyms:
          visibleGyms.length,
        totalTurnstiles:
          turnstiles.length,
        online:
          turnstiles.filter(
            (item) =>
              item.status ===
              TurnstileStatus.ONLINE,
          ).length,
        offline:
          turnstiles.filter(
            (item) =>
              item.status ===
              TurnstileStatus.OFFLINE,
          ).length,
        maintenance:
          turnstiles.filter(
            (item) =>
              item.status ===
              TurnstileStatus.MAINTENANCE,
          ).length,
        approvedToday:
          events.filter(
            (item) =>
              item.result ===
              TurnstileEventResult.APPROVED,
          ).length,
        rejectedToday:
          events.filter(
            (item) =>
              item.result ===
              TurnstileEventResult.REJECTED,
          ).length,
      },
      gyms:
        gymRows,
      recentEvents:
        events.slice(0, 50),
    };
  }

  async getDashboard(
    gymId: string,
  ) {
    const turnstiles =
      await this.turnstileRepository.find({
        where: {
          gymId,
        },
        order: {
          name: 'ASC',
        },
      });

    const todayStart =
      new Date();

    todayStart.setHours(
      0,
      0,
      0,
      0,
    );

    const events =
      await this.eventRepository.find({
        where: {
          gymId,
          createdAt:
            MoreThanOrEqual(todayStart),
        },
        order: {
          createdAt: 'DESC',
        },
        take: 200,
      });

    return {
      summary: {
        total:
          turnstiles.length,
        online:
          turnstiles.filter(
            (item) =>
              item.status ===
              TurnstileStatus.ONLINE,
          ).length,
        offline:
          turnstiles.filter(
            (item) =>
              item.status ===
              TurnstileStatus.OFFLINE,
          ).length,
        maintenance:
          turnstiles.filter(
            (item) =>
              item.status ===
              TurnstileStatus.MAINTENANCE,
          ).length,
        approvedToday:
          events.filter(
            (item) =>
              item.result ===
              TurnstileEventResult.APPROVED,
          ).length,
        rejectedToday:
          events.filter(
            (item) =>
              item.result ===
              TurnstileEventResult.REJECTED,
          ).length,
      },
      turnstiles,
      recentEvents:
        events.slice(0, 30),
    };
  }

  async getAllForGym(
    gymId: string,
  ) {
    return this.turnstileRepository.find({
      where: {
        gymId,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async create(
    gymId: string,
    input: TurnstileInput,
  ) {
    const gym =
      await this.gymRepository.findOne({
        where: {
          id: gymId,
        },
      });

    if (!gym) {
      throw new NotFoundException(
        'Spor salonu bulunamadı.',
      );
    }

    const name =
      String(
        input.name || '',
      ).trim();

    if (!name) {
      throw new BadRequestException(
        'Turnike adı zorunludur.',
      );
    }

    const existing =
      await this.turnstileRepository.findOne({
        where: {
          gymId,
          name,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Bu isimde bir turnike zaten bulunuyor.',
      );
    }

    const turnstile =
      this.turnstileRepository.create({
        organizationId:
          gym.organizationId || null,
        gymId,
        name,
        brand:
          input.brand?.trim() || null,
        model:
          input.model?.trim() || null,
        serialNumber:
          input.serialNumber?.trim() ||
          null,
        ipAddress:
          input.ipAddress?.trim() || null,
        macAddress:
          input.macAddress?.trim() || null,
        location:
          input.location?.trim() || null,
        direction:
          input.direction &&
          Object.values(
            TurnstileDirection,
          ).includes(
            input.direction,
          )
            ? input.direction
            : TurnstileDirection.BOTH,
        status:
          TurnstileStatus.OFFLINE,
        firmwareVersion:
          input.firmwareVersion?.trim() ||
          null,
        isActive:
          input.isActive !== false,
        lastHeartbeatAt: null,
        lastPassageAt: null,
        latencyMs: null,
        lastError: null,
        emergencyOpenUntil: null,
      });

    return this.turnstileRepository.save(
      turnstile,
    );
  }

  async heartbeat(
    gymId: string,
    turnstileId: string,
    data: {
      latencyMs?: number;
      firmwareVersion?: string | null;
      error?: string | null;
    },
  ) {
    const turnstile =
      await this.findForGym(
        gymId,
        turnstileId,
      );

    turnstile.status =
      TurnstileStatus.ONLINE;

    turnstile.lastHeartbeatAt =
      new Date();

    turnstile.latencyMs =
      Number.isFinite(
        Number(data.latencyMs),
      )
        ? Number(data.latencyMs)
        : null;

    if (
      data.firmwareVersion !==
      undefined
    ) {
      turnstile.firmwareVersion =
        data.firmwareVersion?.trim() ||
        null;
    }

    turnstile.lastError =
      data.error?.trim() || null;

    return this.turnstileRepository.save(
      turnstile,
    );
  }

  async updateStatus(
    gymId: string,
    turnstileId: string,
    status: TurnstileStatus,
  ) {
    if (
      !Object.values(
        TurnstileStatus,
      ).includes(status)
    ) {
      throw new BadRequestException(
        'Geçersiz turnike durumu.',
      );
    }

    const turnstile =
      await this.findForGym(
        gymId,
        turnstileId,
      );

    turnstile.status = status;

    return this.turnstileRepository.save(
      turnstile,
    );
  }

  async openGate(
    gymId: string,
    turnstileId: string,
    userId: string | null,
    reason?: string,
  ) {
    const turnstile =
      await this.findForGym(
        gymId,
        turnstileId,
      );

    const result =
      await this.provider.openGate({
        turnstileId:
          turnstile.id,
        ipAddress:
          turnstile.ipAddress,
        serialNumber:
          turnstile.serialNumber,
        reason:
          reason?.trim() || null,
      });

    await this.eventRepository.save(
      this.eventRepository.create({
        organizationId:
          turnstile.organizationId,
        gymId,
        turnstileId:
          turnstile.id,
        turnstileName:
          turnstile.name,
        memberId: null,
        memberName: null,
        credentialId: null,
        credentialType: null,
        credentialCode: null,
        direction:
          TurnstileEventDirection.MANUAL_OPEN,
        result:
          result.success
            ? TurnstileEventResult.APPROVED
            : TurnstileEventResult.ERROR,
        reason:
          reason?.trim() ||
          result.message,
        openedByUserId:
          userId,
        metadataJson: null,
      }),
    );

    return result;
  }

  async emergencyOpenAll(
    gymId: string,
    userId: string | null,
    reason?: string,
  ) {
    const turnstiles =
      await this.turnstileRepository.find({
        where: {
          gymId,
          isActive: true,
        },
      });

    if (
      turnstiles.length === 0
    ) {
      throw new BadRequestException(
        'Açılacak aktif turnike bulunamadı.',
      );
    }

    const until =
      new Date(
        Date.now() +
          10 * 60 * 1000,
      );

    const results: Array<{
      turnstileId: string;
      turnstileName: string;
      success: boolean;
      message: string;
    }> = [];

    for (const turnstile of turnstiles) {
      const result =
        await this.provider.openGate({
          turnstileId:
            turnstile.id,
          ipAddress:
            turnstile.ipAddress,
          serialNumber:
            turnstile.serialNumber,
          reason:
            reason?.trim() ||
            'Acil durum açma',
        });

      turnstile.emergencyOpenUntil =
        until;

      await this.turnstileRepository.save(
        turnstile,
      );

      await this.eventRepository.save(
        this.eventRepository.create({
          organizationId:
            turnstile.organizationId,
          gymId,
          turnstileId:
            turnstile.id,
          turnstileName:
            turnstile.name,
          memberId: null,
          memberName: null,
          credentialId: null,
          credentialType: null,
          credentialCode: null,
          direction:
            TurnstileEventDirection.EMERGENCY_OPEN,
          result:
            result.success
              ? TurnstileEventResult.APPROVED
              : TurnstileEventResult.ERROR,
          reason:
            reason?.trim() ||
            'Acil durum açma',
          openedByUserId:
            userId,
          metadataJson:
            JSON.stringify({
              emergencyOpenUntil:
                until,
            }),
        }),
      );

      results.push({
        turnstileId:
          turnstile.id,
        turnstileName:
          turnstile.name,
        ...result,
      });
    }

    return {
      message:
        'Acil durum açma komutu tüm aktif turnikelere gönderildi.',
      emergencyOpenUntil:
        until,
      results,
    };
  }

  async recordPassage(
    input: {
      gymId: string;
      turnstileId: string;
      memberId?: number | null;
      memberName?: string | null;
      credentialId?: string | null;
      credentialType?: string | null;
      credentialCode?: string | null;
      direction:
        TurnstileEventDirection;
      result:
        TurnstileEventResult;
      reason?: string | null;
    },
  ) {
    const turnstile =
      await this.findForGym(
        input.gymId,
        input.turnstileId,
      );

    turnstile.lastPassageAt =
      new Date();

    await this.turnstileRepository.save(
      turnstile,
    );

    return this.eventRepository.save(
      this.eventRepository.create({
        organizationId:
          turnstile.organizationId,
        gymId:
          input.gymId,
        turnstileId:
          turnstile.id,
        turnstileName:
          turnstile.name,
        memberId:
          input.memberId || null,
        memberName:
          input.memberName || null,
        credentialId:
          input.credentialId || null,
        credentialType:
          input.credentialType || null,
        credentialCode:
          input.credentialCode || null,
        direction:
          input.direction,
        result:
          input.result,
        reason:
          input.reason || null,
        openedByUserId: null,
        metadataJson: null,
      }),
    );
  }

  private async findForGym(
    gymId: string,
    id: string,
  ) {
    const turnstile =
      await this.turnstileRepository.findOne({
        where: {
          id,
          gymId,
        },
      });

    if (!turnstile) {
      throw new NotFoundException(
        'Turnike bulunamadı.',
      );
    }

    return turnstile;
  }
}
