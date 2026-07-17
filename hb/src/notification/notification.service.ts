import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AccessCard } from '../card/access-card.entity';
import { Gym } from '../gym/gym.entity';
import { Member } from '../member/member.entity';
import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import {
  Locker,
  LockerStatus,
} from '../locker/locker.entity';
import { CafeProduct } from '../wallet-cafe/cafe-product.entity';

import {
  Notification,
  NotificationCategory,
  NotificationSeverity,
} from './notification.entity';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository:
      Repository<Notification>,

    @InjectRepository(AccessCard)
    private readonly accessCardRepository:
      Repository<AccessCard>,

    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,

    @InjectRepository(GymSmsBalance)
    private readonly smsBalanceRepository:
      Repository<GymSmsBalance>,

    @InjectRepository(Locker)
    private readonly lockerRepository:
      Repository<Locker>,

    @InjectRepository(CafeProduct)
    private readonly cafeProductRepository:
      Repository<CafeProduct>,

    @InjectRepository(Gym)
    private readonly gymRepository:
      Repository<Gym>,

    private readonly realtimeService:
      RealtimeService,
  ) {}

  async list(
    gymId: string,
  ) {
    await this.refreshAutomaticNotifications(
      gymId,
    );

    return this.notificationRepository.find({
      where: {
        gymId,
        resolvedAt: IsNull(),
      },
      order: {
        isRead: 'ASC',
        createdAt: 'DESC',
      },
      take: 200,
    });
  }

  async summary(
    gymId: string,
  ) {
    await this.refreshAutomaticNotifications(
      gymId,
    );

    const notifications =
      await this.notificationRepository.find({
        where: {
          gymId,
          resolvedAt: IsNull(),
        },
      });

    return {
      total: notifications.length,
      unread: notifications.filter(
        (item) => !item.isRead,
      ).length,
      critical: notifications.filter(
        (item) =>
          item.severity ===
          NotificationSeverity.CRITICAL,
      ).length,
      warning: notifications.filter(
        (item) =>
          item.severity ===
          NotificationSeverity.WARNING,
      ).length,
    };
  }

  async markRead(
    gymId: string,
    id: string,
  ) {
    const notification =
      await this.notificationRepository.findOne({
        where: {
          id,
          gymId,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Bildirim bulunamadı.',
      );
    }

    notification.isRead = true;

    const saved =
      await this.notificationRepository.save(
        notification,
      );

    this.realtimeService.emit(
      gymId,
      'notification:updated',
      saved.id,
    );

    return saved;
  }

  async markAllRead(
    gymId: string,
  ) {
    await this.notificationRepository.update(
      {
        gymId,
        isRead: false,
        resolvedAt: IsNull(),
      },
      {
        isRead: true,
      },
    );

    this.realtimeService.emit(
      gymId,
      'notification:updated',
    );

    return {
      success: true,
      message:
        'Tüm bildirimler okundu olarak işaretlendi.',
    };
  }

  async resolve(
    gymId: string,
    id: string,
  ) {
    const notification =
      await this.notificationRepository.findOne({
        where: {
          id,
          gymId,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Bildirim bulunamadı.',
      );
    }

    notification.resolvedAt =
      new Date();

    const saved =
      await this.notificationRepository.save(
        notification,
      );

    this.realtimeService.emit(
      gymId,
      'notification:updated',
      saved.id,
    );

    return saved;
  }

  async createManual(
    gymId: string,
    data: {
      title: string;
      description: string;
      category?: NotificationCategory;
      severity?: NotificationSeverity;
      actionPath?: string;
    },
  ) {
    const notification =
      this.notificationRepository.create({
        gymId,
        title: data.title.trim(),
        description:
          data.description.trim(),
        category:
          data.category ??
          NotificationCategory.SYSTEM,
        severity:
          data.severity ??
          NotificationSeverity.INFO,
        isRead: false,
        sourceKey: null,
        actionPath:
          data.actionPath?.trim() || null,
        resolvedAt: null,
      });

    const saved =
      await this.notificationRepository.save(
        notification,
      );

    this.realtimeService.emit(
      gymId,
      'notification:new',
      saved.id,
    );

    return saved;
  }


  async listDeviceAlerts(
    gymId: string,
  ) {
    return this.notificationRepository.find({
      where: {
        gymId,
        category: NotificationCategory.DEVICE,
        resolvedAt: IsNull(),
      },
      order: {
        severity: 'DESC',
        createdAt: 'DESC',
      },
      take: 100,
    });
  }

  async upsertDeviceAlert(
    data: {
      gymId: string;
      deviceId: string;
      deviceName: string;
      alertType:
        | 'OFFLINE'
        | 'ERROR'
        | 'FIRMWARE';
      title: string;
      description: string;
      severity: NotificationSeverity;
    },
  ) {
    const sourceKey =
      `device:${data.deviceId}:${data.alertType}`;

    await this.upsertAutomatic({
      gymId: data.gymId,
      sourceKey,
      active: true,
      title: data.title,
      description: data.description,
      category: NotificationCategory.DEVICE,
      severity: data.severity,
      actionPath: '/device-center',
    });
  }

  async resolveDeviceAlert(
    gymId: string,
    deviceId: string,
    alertType:
      | 'OFFLINE'
      | 'ERROR'
      | 'FIRMWARE',
  ) {
    await this.resolveBySourceKey(
      gymId,
      `device:${deviceId}:${alertType}`,
    );
  }

  async refreshAutomaticNotifications(
    gymId: string,
  ) {
    await Promise.all([
      this.refreshAccessStock(gymId),
      this.refreshMemberships(gymId),
      this.refreshSmsBalance(gymId),
      this.refreshLockers(gymId),
      this.refreshCafeStock(gymId),
      this.refreshLicense(gymId),
    ]);
  }

  private async refreshAccessStock(
    gymId: string,
  ) {
    const cards =
      await this.accessCardRepository.find({
        where: {
          gymId,
        },
      });

    const availableCards = cards.filter(
      (item) =>
        item.type === 'CARD' &&
        item.status === 'AVAILABLE',
    ).length;

    const availableQr = cards.filter(
      (item) =>
        item.type === 'QR' &&
        item.status === 'AVAILABLE',
    ).length;

    await this.upsertAutomatic({
      gymId,
      sourceKey: 'access-card-stock',
      active: availableCards <= 10,
      title: 'Kart stoğu azalıyor',
      description:
        `Kullanılabilir fiziksel kart sayısı ${availableCards}.`,
      category:
        NotificationCategory.STOCK,
      severity:
        availableCards <= 5
          ? NotificationSeverity.CRITICAL
          : NotificationSeverity.WARNING,
      actionPath: '/access-cards',
    });

    await this.upsertAutomatic({
      gymId,
      sourceKey: 'access-qr-stock',
      active: availableQr <= 15,
      title: 'QR stoğu azalıyor',
      description:
        `Kullanılabilir QR sayısı ${availableQr}.`,
      category:
        NotificationCategory.STOCK,
      severity:
        availableQr <= 5
          ? NotificationSeverity.CRITICAL
          : NotificationSeverity.WARNING,
      actionPath: '/access-cards',
    });
  }

  private async refreshMemberships(
    gymId: string,
  ) {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(
      sevenDaysLater.getDate() + 7,
    );

    const members =
      await this.memberRepository.find({
        where: {
          gymId,
        },
      });

    const expiring = members.filter(
      (member) => {
        if (!member.membershipEnd) {
          return false;
        }

        const end = new Date(
          member.membershipEnd,
        );

        return (
          end >= now &&
          end <= sevenDaysLater
        );
      },
    );

    await this.upsertAutomatic({
      gymId,
      sourceKey:
        'membership-expiring-seven-days',
      active: expiring.length > 0,
      title:
        'Yakında bitecek üyelikler var',
      description:
        `Önümüzdeki 7 gün içinde ${expiring.length} üyeliğin süresi dolacak.`,
      category:
        NotificationCategory.MEMBERSHIP,
      severity:
        expiring.length >= 10
          ? NotificationSeverity.CRITICAL
          : NotificationSeverity.WARNING,
      actionPath: '/members',
    });
  }

  private async refreshSmsBalance(
    gymId: string,
  ) {
    const balance =
      await this.smsBalanceRepository.findOne({
        where: {
          gymId,
        },
      });

    const currentBalance =
      balance?.balance ?? 0;

    await this.upsertAutomatic({
      gymId,
      sourceKey: 'sms-low-balance',
      active: currentBalance <= 150,
      title: 'SMS bakiyesi azaldı',
      description:
        `Kalan SMS bakiyesi ${currentBalance}.`,
      category:
        NotificationCategory.SMS,
      severity:
        currentBalance <= 50
          ? NotificationSeverity.CRITICAL
          : NotificationSeverity.WARNING,
      actionPath: '/sms',
    });
  }

  private async refreshLockers(
    gymId: string,
  ) {
    const broken =
      await this.lockerRepository.count({
        where: {
          gymId,
          status:
            LockerStatus.OUT_OF_SERVICE,
        },
      });

    await this.upsertAutomatic({
      gymId,
      sourceKey: 'locker-out-of-service',
      active: broken > 0,
      title: 'Arızalı dolap bulunuyor',
      description:
        `${broken} dolap kullanım dışı durumda.`,
      category:
        NotificationCategory.LOCKER,
      severity:
        broken >= 3
          ? NotificationSeverity.CRITICAL
          : NotificationSeverity.WARNING,
      actionPath: '/lockers',
    });
  }

  private async refreshCafeStock(
    gymId: string,
  ) {
    const products =
      await this.cafeProductRepository.find({
        where: {
          gymId,
        },
      });

    const lowStock = products.filter(
      (product) =>
        Number(product.stockQuantity) <= Number(product.lowStockLimit),
    );

    await this.upsertAutomatic({
      gymId,
      sourceKey: 'cafe-low-stock',
      active: lowStock.length > 0,
      title: 'Kafe stoğu kritik',
      description:
        `${lowStock.length} ürün kritik stok seviyesinde.`,
      category:
        NotificationCategory.STOCK,
      severity:
        lowStock.length >= 5
          ? NotificationSeverity.CRITICAL
          : NotificationSeverity.WARNING,
      actionPath: '/cafe',
    });
  }

  private async refreshLicense(
    gymId: string,
  ) {
    const gym =
      await this.gymRepository.findOne({
        where: {
          id: gymId,
        },
      });

    if (
      !gym ||
      !gym.licenseEndDate
    ) {
      await this.resolveBySourceKey(
        gymId,
        'license-expiring',
      );

      return;
    }

    const now = new Date();
    const end = new Date(
      gym.licenseEndDate,
    );

    const days = Math.ceil(
      (end.getTime() -
        now.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    await this.upsertAutomatic({
      gymId,
      sourceKey: 'license-expiring',
      active: days <= 30,
      title:
        days < 0
          ? 'Lisans süresi doldu'
          : 'Lisans yenileme zamanı yaklaşıyor',
      description:
        days < 0
          ? 'Salon lisansının süresi doldu.'
          : `Salon lisansının bitmesine ${days} gün kaldı.`,
      category:
        NotificationCategory.LICENSE,
      severity:
        days <= 7
          ? NotificationSeverity.CRITICAL
          : NotificationSeverity.WARNING,
      actionPath: '/settings',
    });
  }

  private async upsertAutomatic(
    data: {
      gymId: string;
      sourceKey: string;
      active: boolean;
      title: string;
      description: string;
      category: NotificationCategory;
      severity: NotificationSeverity;
      actionPath: string;
    },
  ) {
    if (!data.active) {
      await this.resolveBySourceKey(
        data.gymId,
        data.sourceKey,
      );

      return;
    }

    let notification =
      await this.notificationRepository.findOne({
        where: {
          gymId: data.gymId,
          sourceKey: data.sourceKey,
          resolvedAt: IsNull(),
        },
      });

    if (!notification) {
      notification =
        this.notificationRepository.create({
          gymId: data.gymId,
          title: data.title,
          description:
            data.description,
          category:
            data.category,
          severity:
            data.severity,
          isRead: false,
          sourceKey:
            data.sourceKey,
          actionPath:
            data.actionPath,
          resolvedAt: null,
        });
    } else {
      notification.title =
        data.title;
      notification.description =
        data.description;
      notification.category =
        data.category;
      notification.severity =
        data.severity;
      notification.actionPath =
        data.actionPath;
    }

    await this.notificationRepository.save(
      notification,
    );
  }

  private async resolveBySourceKey(
    gymId: string,
    sourceKey: string,
  ) {
    const active =
      await this.notificationRepository.findOne({
        where: {
          gymId,
          sourceKey,
          resolvedAt: IsNull(),
        },
      });

    if (!active) {
      return;
    }

    active.resolvedAt =
      new Date();

    await this.notificationRepository.save(
      active,
    );
  }
}
