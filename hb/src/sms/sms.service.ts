import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Gym } from '../gym/gym.entity';
import { Member } from '../member/member.entity';

import { SmsPackage } from './sms-package.entity';
import { GymSmsBalance } from './gym-sms-balance.entity';
import {
  SmsHistory,
  SmsRecipientType,
  SmsStatus,
} from './sms-history.entity';

import { SmsPurchase } from './sms-purchase.entity';
import {
  SMS_PROVIDER,
} from './providers/sms-provider.interface';

import type {
  SmsProvider,
} from './providers/sms-provider.interface';

@Injectable()
export class SmsService {
  constructor(
    @InjectRepository(SmsPackage)
    private readonly packageRepository:
      Repository<SmsPackage>,

    @InjectRepository(GymSmsBalance)
    private readonly balanceRepository:
      Repository<GymSmsBalance>,

    @InjectRepository(SmsHistory)
    private readonly historyRepository:
      Repository<SmsHistory>,

    @InjectRepository(Gym)
    private readonly gymRepository:
      Repository<Gym>,

    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,

    @InjectRepository(SmsPurchase)
    private readonly purchaseRepository:
      Repository<SmsPurchase>,

    @Inject(SMS_PROVIDER)
    private readonly smsProvider:
      SmsProvider,
  ) {}

  async listPackages() {
    return this.packageRepository.find({
      where: {
        isActive: true,
      },
      order: {
        smsCount: 'ASC',
      },
    });
  }

  async createPackage(data: {
    name?: string;
    smsCount?: number;
    price?: number;
    description?: string;
  }) {
    const name = String(
      data.name || '',
    ).trim();

    const smsCount = Number(
      data.smsCount,
    );

    const price = Number(
      data.price,
    );

    if (!name) {
      throw new BadRequestException(
        'Paket adı zorunludur.',
      );
    }

    if (
      !Number.isInteger(smsCount) ||
      smsCount <= 0
    ) {
      throw new BadRequestException(
        'SMS adedi pozitif tam sayı olmalıdır.',
      );
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new BadRequestException(
        'Paket fiyatı geçersiz.',
      );
    }

    const existing =
      await this.packageRepository.findOne({
        where: {
          name,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Bu isimde SMS paketi zaten var.',
      );
    }

    const smsPackage =
      this.packageRepository.create({
        name,
        smsCount,
        price,
        description:
          data.description?.trim() || null,
        isActive: true,
      });

    return this.packageRepository.save(
      smsPackage,
    );
  }

  async getGymBalance(
    gymId: string,
  ) {
    await this.findGymOrFail(gymId);

    return this.getOrCreateBalance(
      gymId,
    );
  }

  async addBalance(
    gymId: string,
    data: {
      packageId?: string;
      smsCount?: number;
      amount?: number;
      description?: string;
      soldByUserId?: string | null;
    },
  ) {
    await this.findGymOrFail(gymId);

    let smsCount = Number(
      data.smsCount || 0,
    );

    let smsPackage:
      | SmsPackage
      | null = null;

    if (data.packageId) {
      smsPackage =
        await this.packageRepository.findOne({
          where: {
            id: data.packageId,
            isActive: true,
          },
        });

      if (!smsPackage) {
        throw new NotFoundException(
          'SMS paketi bulunamadı.',
        );
      }

      smsCount =
        smsPackage.smsCount;
    }

    if (
      !Number.isInteger(smsCount) ||
      smsCount <= 0
    ) {
      throw new BadRequestException(
        'Yüklenecek SMS adedi pozitif tam sayı olmalıdır.',
      );
    }

    const balance =
      await this.getOrCreateBalance(
        gymId,
      );

    balance.balance += smsCount;
    balance.totalPurchased +=
      smsCount;

    const saved =
      await this.balanceRepository.save(
        balance,
      );

    const amount =
      smsPackage
        ? Number(smsPackage.price)
        : Number(data.amount || 0);

    const purchase =
      this.purchaseRepository.create({
        gymId,
        packageId:
          smsPackage?.id || null,
        packageName:
          smsPackage?.name ||
          `Özel ${smsCount} SMS`,
        smsCount,
        amount:
          Number.isFinite(amount) &&
          amount >= 0
            ? amount
            : 0,
        description:
          data.description?.trim() ||
          null,
        soldByUserId:
          data.soldByUserId || null,
      });

    const savedPurchase =
      await this.purchaseRepository.save(
        purchase,
      );

    return {
      message:
        `${smsCount} SMS başarıyla salona yüklendi.`,
      package:
        smsPackage
          ? {
              id: smsPackage.id,
              name: smsPackage.name,
              smsCount:
                smsPackage.smsCount,
              price: smsPackage.price,
            }
          : null,
      balance: saved,
      purchase: savedPurchase,
    };
  }

  async sendSms(
    gymId: string,
    userId: string | null,
    data: {
      memberId?: number;
      phone?: string;
      message?: string;
    },
  ) {
    const message = String(
      data.message || '',
    ).trim();

    if (!message) {
      throw new BadRequestException(
        'SMS mesajı boş olamaz.',
      );
    }

    if (message.length > 612) {
      throw new BadRequestException(
        'SMS mesajı en fazla 612 karakter olabilir.',
      );
    }

    let member:
      | Member
      | null = null;

    let phone = String(
      data.phone || '',
    ).trim();

    let recipientType =
      SmsRecipientType.MANUAL;

    if (data.memberId) {
      member =
        await this.memberRepository.findOne({
          where: {
            id: Number(data.memberId),
            gymId,
          },
        });

      if (!member) {
        throw new NotFoundException(
          'Üye bulunamadı.',
        );
      }

      phone =
        member.phone?.trim() || '';

      recipientType =
        SmsRecipientType.MEMBER;
    }

    if (!phone) {
      throw new BadRequestException(
        'Gönderilecek telefon numarası bulunamadı.',
      );
    }

    const smsCost =
      this.calculateSmsCost(message);

    const balance =
      await this.getOrCreateBalance(
        gymId,
      );

    if (balance.balance < smsCost) {
      throw new BadRequestException(
        `Yetersiz SMS bakiyesi. Bu mesaj için ${smsCost} SMS gerekiyor.`,
      );
    }

    const queuedAt = new Date();

    const providerResult =
      await this.smsProvider.send({
        phone,
        message,
      });

    const completedAt = new Date();

    const history =
      this.historyRepository.create({
        gymId,
        memberId:
          member?.id || null,
        phone,
        message,
        recipientType,
        status: providerResult.success
          ? SmsStatus.SENT
          : SmsStatus.FAILED,
        smsCost,
        provider:
          providerResult.provider ||
          this.smsProvider.name,
        providerMessageId:
          providerResult.messageId,
        errorCode:
          providerResult.errorCode,
        errorMessage:
          providerResult.errorMessage,
        retryCount: 0,
        queuedAt,
        sentAt: providerResult.success
          ? completedAt
          : null,
        deliveredAt: null,
        failedAt: providerResult.success
          ? null
          : completedAt,
        sentByUserId: userId,
      });

    const savedHistory =
      await this.historyRepository.save(
        history,
      );

    if (!providerResult.success) {
      return {
        success: false,
        message:
          providerResult.errorMessage ||
          'SMS sağlayıcısı mesajı gönderemedi.',
        provider:
          providerResult.provider ||
          this.smsProvider.name,
        smsCost: 0,
        remainingBalance:
          balance.balance,
        history: savedHistory,
      };
    }

    balance.balance -= smsCost;
    balance.totalUsed += smsCost;

    await this.balanceRepository.save(
      balance,
    );

    return {
      success: true,
      message:
        'SMS başarıyla sağlayıcıya gönderildi.',
      provider:
        providerResult.provider,
      smsCost,
      remainingBalance:
        balance.balance,
      history: savedHistory,
    };
  }

  async getAllGymBalances() {
    const gyms =
      await this.gymRepository.find({
        order: {
          name: 'ASC',
        },
      });

    const balances =
      await this.balanceRepository.find();

    const balanceMap = new Map(
      balances.map((item) => [
        item.gymId,
        item,
      ]),
    );

    return gyms.map((gym) => {
      const balance =
        balanceMap.get(gym.id);

      return {
        gym: {
          id: gym.id,
          name: gym.name,
          city: gym.city,
          isActive: gym.isActive,
        },
        balance:
          balance?.balance || 0,
        totalPurchased:
          balance?.totalPurchased || 0,
        totalUsed:
          balance?.totalUsed || 0,
        lowBalance:
          (balance?.balance || 0) <= 150,
        criticalBalance:
          (balance?.balance || 0) <= 50,
      };
    });
  }

  async getPurchases() {
    const purchases =
      await this.purchaseRepository.find({
        order: {
          createdAt: 'DESC',
        },
        take: 500,
      });

    const gymIds = [
      ...new Set(
        purchases.map(
          (item) => item.gymId,
        ),
      ),
    ];

    const gyms =
      gymIds.length > 0
        ? await this.gymRepository
            .createQueryBuilder('gym')
            .where(
              'gym.id IN (:...gymIds)',
              {
                gymIds,
              },
            )
            .getMany()
        : [];

    const gymMap = new Map(
      gyms.map((gym) => [
        gym.id,
        gym,
      ]),
    );

    return purchases.map(
      (purchase) => ({
        ...purchase,
        gym:
          gymMap.get(
            purchase.gymId,
          ) || null,
      }),
    );
  }

  async getSalesSummary() {
    const purchases =
      await this.purchaseRepository.find();

    const totalRevenue =
      purchases.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0,
      );

    const totalSmsSold =
      purchases.reduce(
        (sum, item) =>
          sum + Number(item.smsCount || 0),
        0,
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPurchases =
      purchases.filter(
        (item) =>
          new Date(item.createdAt) >= today,
      );

    return {
      totalRevenue,
      totalSmsSold,
      totalSales:
        purchases.length,
      todayRevenue:
        todayPurchases.reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0,
        ),
      todaySmsSold:
        todayPurchases.reduce(
          (sum, item) =>
            sum +
            Number(item.smsCount || 0),
          0,
        ),
    };
  }

  async sendBulkSms(
    gymId: string,
    userId: string | null,
    data: {
      message?: string;
      memberIds?: number[];
      target?: 'SELECTED' | 'ALL_ACTIVE' | 'EXPIRING';
    },
  ) {
    const message = String(
      data.message || '',
    ).trim();

    if (!message) {
      throw new BadRequestException(
        'SMS mesajı boş olamaz.',
      );
    }

    if (message.length > 612) {
      throw new BadRequestException(
        'SMS mesajı en fazla 612 karakter olabilir.',
      );
    }

    const target =
      data.target || 'SELECTED';

    let members: Member[] = [];

    if (target === 'SELECTED') {
      const memberIds = Array.isArray(
        data.memberIds,
      )
        ? [
            ...new Set(
              data.memberIds
                .map(Number)
                .filter(
                  (value) =>
                    Number.isInteger(value) &&
                    value > 0,
                ),
            ),
          ]
        : [];

      if (memberIds.length === 0) {
        throw new BadRequestException(
          'En az bir üye seçmelisiniz.',
        );
      }

      members =
        await this.memberRepository
          .createQueryBuilder('member')
          .where(
            'member.gymId = :gymId',
            {
              gymId,
            },
          )
          .andWhere(
            'member.id IN (:...memberIds)',
            {
              memberIds,
            },
          )
          .getMany();
    } else if (
      target === 'ALL_ACTIVE'
    ) {
      members =
        await this.memberRepository.find({
          where: {
            gymId,
            status: 'Aktif',
          },
        });
    } else if (
      target === 'EXPIRING'
    ) {
      const now = new Date();
      const sevenDaysLater =
        new Date();
      sevenDaysLater.setDate(
        sevenDaysLater.getDate() + 7,
      );

      const allMembers =
        await this.memberRepository.find({
          where: {
            gymId,
          },
        });

      members = allMembers.filter(
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
    } else {
      throw new BadRequestException(
        'Toplu SMS hedefi geçersiz.',
      );
    }

    const validMembers =
      members.filter(
        (member) =>
          Boolean(
            String(
              member.phone || '',
            ).trim(),
          ),
      );

    if (validMembers.length === 0) {
      throw new BadRequestException(
        'Gönderime uygun telefon numarası bulunan üye yok.',
      );
    }

    const smsCostPerRecipient =
      this.calculateSmsCost(message);

    const totalCost =
      smsCostPerRecipient *
      validMembers.length;

    const balance =
      await this.getOrCreateBalance(
        gymId,
      );

    if (balance.balance < totalCost) {
      throw new BadRequestException(
        `Yetersiz SMS bakiyesi. Bu gönderim için ${totalCost} SMS gerekiyor, mevcut bakiye ${balance.balance}.`,
      );
    }

    const providerResults =
      await Promise.all(
        validMembers.map(
          async (member) => ({
            member,
            result:
              await this.smsProvider.send({
                phone:
                  member.phone.trim(),
                message,
              }),
          }),
        ),
      );

    const successfulResults =
      providerResults.filter(
        (item) => item.result.success,
      );

    const failedResults =
      providerResults.filter(
        (item) => !item.result.success,
      );

    const completedAt = new Date();

    const histories =
      providerResults.map(
        ({ member, result }) =>
          this.historyRepository.create({
            gymId,
            memberId: member.id,
            phone: member.phone.trim(),
            message,
            recipientType:
              SmsRecipientType.BULK,
            status: result.success
              ? SmsStatus.SENT
              : SmsStatus.FAILED,
            smsCost:
              smsCostPerRecipient,
            provider:
              result.provider ||
              this.smsProvider.name,
            providerMessageId:
              result.messageId,
            errorCode:
              result.errorCode,
            errorMessage:
              result.errorMessage,
            retryCount: 0,
            queuedAt: completedAt,
            sentAt: result.success
              ? completedAt
              : null,
            deliveredAt: null,
            failedAt: result.success
              ? null
              : completedAt,
            sentByUserId: userId,
          }),
      );

    if (histories.length > 0) {
      await this.historyRepository.save(
        histories,
      );
    }

    const chargedCost =
      successfulResults.length *
      smsCostPerRecipient;

    balance.balance -= chargedCost;
    balance.totalUsed += chargedCost;

    await this.balanceRepository.save(
      balance,
    );

    return {
      success:
        successfulResults.length > 0,
      message:
        `${successfulResults.length} üyeye SMS gönderildi, ${failedResults.length} gönderim başarısız oldu.`,
      provider:
        this.smsProvider.name,
      recipientCount:
        successfulResults.length,
      failedCount:
        failedResults.length,
      skippedCount:
        members.length -
        validMembers.length,
      smsCostPerRecipient,
      totalCost: chargedCost,
      remainingBalance:
        balance.balance,
      failures:
        failedResults.map(
          ({ member, result }) => ({
            memberId: member.id,
            phone: member.phone,
            errorCode:
              result.errorCode,
            errorMessage:
              result.errorMessage,
          }),
        ),
    };
  }

  async getGymStatusSummary(
    gymId: string,
  ) {
    const histories =
      await this.historyRepository.find({
        where: { gymId },
      });

    const summary = {
      total: histories.length,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      totalSmsCost: 0,
      successRate: 0,
    };

    for (const item of histories) {
      summary.totalSmsCost +=
        Number(item.smsCost || 0);

      if (item.status === SmsStatus.PENDING) {
        summary.pending += 1;
      } else if (item.status === SmsStatus.SENT) {
        summary.sent += 1;
      } else if (item.status === SmsStatus.DELIVERED) {
        summary.delivered += 1;
      } else if (item.status === SmsStatus.FAILED) {
        summary.failed += 1;
      }
    }

    const successful =
      summary.sent + summary.delivered;

    summary.successRate =
      summary.total > 0
        ? Number(
            (
              (successful / summary.total) *
              100
            ).toFixed(2),
          )
        : 0;

    return summary;
  }

  async retrySms(
    gymId: string,
    historyId: string,
    userId: string | null,
  ) {
    const history =
      await this.historyRepository.findOne({
        where: {
          id: historyId,
          gymId,
        },
      });

    if (!history) {
      throw new NotFoundException(
        'SMS geçmiş kaydı bulunamadı.',
      );
    }

    if (history.status !== SmsStatus.FAILED) {
      throw new BadRequestException(
        'Yalnızca başarısız SMS kayıtları yeniden gönderilebilir.',
      );
    }

    if (history.retryCount >= 3) {
      throw new BadRequestException(
        'Bu SMS için en fazla 3 yeniden gönderim yapılabilir.',
      );
    }

    const balance =
      await this.getOrCreateBalance(gymId);

    if (balance.balance < history.smsCost) {
      throw new BadRequestException(
        `Yetersiz SMS bakiyesi. Yeniden gönderim için ${history.smsCost} SMS gerekiyor.`,
      );
    }

    history.status = SmsStatus.PENDING;
    history.retryCount += 1;
    history.queuedAt = new Date();
    history.sentAt = null;
    history.deliveredAt = null;
    history.failedAt = null;
    history.errorCode = null;
    history.errorMessage = null;
    history.sentByUserId = userId;

    await this.historyRepository.save(history);

    const providerResult =
      await this.smsProvider.send({
        phone: history.phone,
        message: history.message,
      });

    const completedAt = new Date();

    history.provider =
      providerResult.provider ||
      this.smsProvider.name;
    history.providerMessageId =
      providerResult.messageId;
    history.errorCode =
      providerResult.errorCode;
    history.errorMessage =
      providerResult.errorMessage;

    if (providerResult.success) {
      history.status = SmsStatus.SENT;
      history.sentAt = completedAt;
      history.failedAt = null;

      balance.balance -= history.smsCost;
      balance.totalUsed += history.smsCost;

      await this.balanceRepository.save(
        balance,
      );
    } else {
      history.status = SmsStatus.FAILED;
      history.sentAt = null;
      history.failedAt = completedAt;
    }

    const savedHistory =
      await this.historyRepository.save(
        history,
      );

    return {
      success: providerResult.success,
      message: providerResult.success
        ? 'SMS yeniden gönderildi.'
        : providerResult.errorMessage ||
          'SMS yeniden gönderilemedi.',
      retryCount: savedHistory.retryCount,
      remainingBalance: balance.balance,
      history: savedHistory,
    };
  }

  async getGymHistory(
    gymId: string,
  ) {
    return this.historyRepository.find({
      where: {
        gymId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 200,
    });
  }

  private calculateSmsCost(
    message: string,
  ) {
    return Math.max(
      1,
      Math.ceil(message.length / 153),
    );
  }

  private async getOrCreateBalance(
    gymId: string,
  ) {
    let balance =
      await this.balanceRepository.findOne({
        where: {
          gymId,
        },
      });

    if (!balance) {
      balance =
        this.balanceRepository.create({
          gymId,
          balance: 0,
          totalPurchased: 0,
          totalUsed: 0,
        });

      balance =
        await this.balanceRepository.save(
          balance,
        );
    }

    return balance;
  }

  private async findGymOrFail(
    gymId: string,
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

    return gym;
  }
}
