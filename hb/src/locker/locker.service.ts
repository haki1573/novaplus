import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { Member } from '../member/member.entity';

import {
  Locker,
  LockerStatus,
} from './locker.entity';

import {
  LockerAction,
  LockerHistory,
} from './locker-history.entity';

@Injectable()
export class LockerService {
  constructor(
    @InjectRepository(Locker)
    private readonly lockerRepository:
      Repository<Locker>,

    @InjectRepository(LockerHistory)
    private readonly historyRepository:
      Repository<LockerHistory>,

    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,
  ) {}

  async listLockers(
    gymId: string,
  ) {
    const lockers =
      await this.lockerRepository.find({
        where: {
          gymId,
        },
        order: {
          number: 'ASC',
        },
      });

    const memberIds = lockers
      .map((locker) => locker.memberId)
      .filter(
        (value): value is number =>
          typeof value === 'number',
      );

    const members =
      memberIds.length > 0
        ? await this.memberRepository
            .createQueryBuilder('member')
            .where(
              'member.id IN (:...memberIds)',
              {
                memberIds,
              },
            )
            .andWhere(
              'member.gymId = :gymId',
              {
                gymId,
              },
            )
            .getMany()
        : [];

    const memberMap = new Map(
      members.map((member) => [
        member.id,
        member,
      ]),
    );

    return lockers.map((locker) => ({
      ...locker,
      member:
        locker.memberId !== null
          ? memberMap.get(
              locker.memberId,
            ) || null
          : null,
    }));
  }

  async getSummary(
    gymId: string,
  ) {
    const lockers =
      await this.lockerRepository.find({
        where: {
          gymId,
        },
      });

    return {
      total: lockers.length,
      available: lockers.filter(
        (locker) =>
          locker.status ===
          LockerStatus.AVAILABLE,
      ).length,
      occupied: lockers.filter(
        (locker) =>
          locker.status ===
          LockerStatus.OCCUPIED,
      ).length,
      outOfService: lockers.filter(
        (locker) =>
          locker.status ===
          LockerStatus.OUT_OF_SERVICE,
      ).length,
    };
  }

  async createLocker(
    gymId: string,
    userId: string | null,
    data: {
      number?: string;
      notes?: string;
    },
  ) {
    const number = String(
      data.number || '',
    ).trim();

    if (!number) {
      throw new BadRequestException(
        'Dolap numarası zorunludur.',
      );
    }

    const existing =
      await this.lockerRepository.findOne({
        where: {
          gymId,
          number,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Bu dolap numarası zaten kayıtlı.',
      );
    }

    const locker =
      this.lockerRepository.create({
        gymId,
        number,
        status:
          LockerStatus.AVAILABLE,
        memberId: null,
        accessCode: null,
        qrToken: null,
        assignedAt: null,
        releasedAt: null,
        notes:
          data.notes?.trim() || null,
        isLocked: false,
      });

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId: null,
      action:
        LockerAction.CREATED,
      description:
        `Dolap ${saved.number} oluşturuldu.`,
      performedByUserId: userId,
    });

    return saved;
  }

  async assignLocker(
    gymId: string,
    userId: string | null,
    lockerId: string,
    memberId: number,
  ) {
    const locker =
      await this.findLockerOrFail(
        gymId,
        lockerId,
      );

    if (
      locker.status ===
      LockerStatus.OUT_OF_SERVICE
    ) {
      throw new BadRequestException(
        'Arızalı dolap üyeye atanamaz.',
      );
    }

    if (
      locker.status ===
      LockerStatus.OCCUPIED
    ) {
      throw new BadRequestException(
        'Bu dolap şu anda dolu.',
      );
    }

    const member =
      await this.memberRepository.findOne({
        where: {
          id: memberId,
          gymId,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Üye bulunamadı.',
      );
    }

    const existingMemberLocker =
      await this.lockerRepository.findOne({
        where: {
          gymId,
          memberId,
          status:
            LockerStatus.OCCUPIED,
        },
      });

    if (existingMemberLocker) {
      throw new BadRequestException(
        'Bu üyeye zaten bir dolap atanmış.',
      );
    }

    locker.memberId = memberId;
    locker.status =
      LockerStatus.OCCUPIED;
    locker.accessCode =
      this.generateAccessCode();
    locker.qrToken =
      this.generateQrToken();
    locker.assignedAt =
      new Date();
    locker.releasedAt = null;
    locker.isLocked = true;

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId,
      action:
        LockerAction.ASSIGNED,
      description:
        `${saved.number} numaralı dolap ${member.fullName} adlı üyeye atandı.`,
      performedByUserId: userId,
    });

    return {
      message:
        'Dolap üyeye başarıyla atandı.',
      locker: saved,
      member: {
        id: member.id,
        fullName:
          member.fullName,
        phone: member.phone,
      },
    };
  }

  async openLocker(
    gymId: string,
    userId: string | null,
    lockerId: string,
    data: {
      accessCode?: string;
      qrToken?: string;
    },
  ) {
    const locker =
      await this.findLockerOrFail(
        gymId,
        lockerId,
      );

    if (
      locker.status !==
      LockerStatus.OCCUPIED
    ) {
      throw new BadRequestException(
        'Dolap aktif kullanımda değil.',
      );
    }

    const accessCode = String(
      data.accessCode || '',
    ).trim();

    const qrToken = String(
      data.qrToken || '',
    ).trim();

    const codeMatches =
      accessCode &&
      locker.accessCode === accessCode;

    const qrMatches =
      qrToken &&
      locker.qrToken === qrToken;

    if (
      !codeMatches &&
      !qrMatches
    ) {
      throw new BadRequestException(
        'Dolap şifresi veya QR bilgisi geçersiz.',
      );
    }

    locker.isLocked = false;

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId:
        saved.memberId,
      action:
        LockerAction.OPENED,
      description:
        `${saved.number} numaralı dolap açıldı.`,
      performedByUserId: userId,
    });

    return {
      success: true,
      message:
        'Dolap açıldı.',
      locker: saved,
    };
  }

  async openByQr(
    gymId: string,
    userId: string | null,
    qrToken: string,
  ) {
    const normalizedToken =
      String(qrToken || '').trim();

    if (!normalizedToken) {
      throw new BadRequestException(
        'QR anahtarı boş olamaz.',
      );
    }

    const locker =
      await this.lockerRepository.findOne({
        where: {
          gymId,
          qrToken: normalizedToken,
          status:
            LockerStatus.OCCUPIED,
        },
      });

    if (!locker) {
      throw new NotFoundException(
        'Bu QR anahtarına bağlı aktif dolap bulunamadı.',
      );
    }

    locker.isLocked = false;

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId:
        saved.memberId,
      action:
        LockerAction.OPENED,
      description:
        `${saved.number} numaralı dolap QR ile açıldı.`,
      performedByUserId: userId,
    });

    return {
      success: true,
      message:
        `${saved.number} numaralı dolap açıldı.`,
      locker: saved,
    };
  }

  async createMultipleLockers(
    gymId: string,
    userId: string | null,
    data: {
      prefix?: string;
      startNumber?: number;
      count?: number;
    },
  ) {
    const prefix =
      String(data.prefix || '')
        .trim()
        .toUpperCase();

    const startNumber =
      Number(data.startNumber);

    const count =
      Number(data.count);

    if (
      !Number.isInteger(startNumber) ||
      startNumber < 1
    ) {
      throw new BadRequestException(
        'Başlangıç numarası pozitif tam sayı olmalıdır.',
      );
    }

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 200
    ) {
      throw new BadRequestException(
        'Tek seferde 1 ile 200 arasında dolap oluşturabilirsiniz.',
      );
    }

    const created: Locker[] = [];

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const number =
        `${prefix}${prefix ? '-' : ''}${startNumber + index}`;

      const existing =
        await this.lockerRepository.findOne({
          where: {
            gymId,
            number,
          },
        });

      if (existing) {
        continue;
      }

      const locker =
        this.lockerRepository.create({
          gymId,
          number,
          status:
            LockerStatus.AVAILABLE,
          memberId: null,
          accessCode: null,
          qrToken: null,
          assignedAt: null,
          releasedAt: null,
          notes: null,
          isLocked: false,
        });

      const saved =
        await this.lockerRepository.save(
          locker,
        );

      created.push(saved);

      await this.addHistory({
        gymId,
        lockerId: saved.id,
        memberId: null,
        action:
          LockerAction.CREATED,
        description:
          `Dolap ${saved.number} toplu oluşturma ile eklendi.`,
        performedByUserId: userId,
      });
    }

    return {
      success: true,
      createdCount: created.length,
      skippedCount:
        count - created.length,
      lockers: created,
    };
  }

  async lockLocker(
    gymId: string,
    userId: string | null,
    lockerId: string,
  ) {
    const locker =
      await this.findLockerOrFail(
        gymId,
        lockerId,
      );

    if (
      locker.status !==
      LockerStatus.OCCUPIED
    ) {
      throw new BadRequestException(
        'Dolap aktif kullanımda değil.',
      );
    }

    locker.isLocked = true;

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId:
        saved.memberId,
      action:
        LockerAction.LOCKED,
      description:
        `${saved.number} numaralı dolap kilitlendi.`,
      performedByUserId: userId,
    });

    return {
      success: true,
      message:
        'Dolap kilitlendi.',
      locker: saved,
    };
  }

  async releaseLocker(
    gymId: string,
    userId: string | null,
    lockerId: string,
  ) {
    const locker =
      await this.findLockerOrFail(
        gymId,
        lockerId,
      );

    const oldMemberId =
      locker.memberId;

    locker.memberId = null;
    locker.status =
      LockerStatus.AVAILABLE;
    locker.accessCode = null;
    locker.qrToken = null;
    locker.assignedAt = null;
    locker.releasedAt =
      new Date();
    locker.isLocked = false;

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId:
        oldMemberId,
      action:
        LockerAction.RELEASED,
      description:
        `${saved.number} numaralı dolap boşaltıldı ve şifresi sıfırlandı.`,
      performedByUserId: userId,
    });

    return {
      success: true,
      message:
        'Dolap boşaltıldı ve erişim bilgileri sıfırlandı.',
      locker: saved,
    };
  }

  async updateStatus(
    gymId: string,
    userId: string | null,
    lockerId: string,
    status: LockerStatus,
  ) {
    const locker =
      await this.findLockerOrFail(
        gymId,
        lockerId,
      );

    if (
      !Object.values(
        LockerStatus,
      ).includes(status)
    ) {
      throw new BadRequestException(
        'Dolap durumu geçersiz.',
      );
    }

    if (
      status ===
      LockerStatus.OUT_OF_SERVICE
    ) {
      locker.memberId = null;
      locker.accessCode = null;
      locker.qrToken = null;
      locker.assignedAt = null;
      locker.isLocked = false;
    }

    locker.status = status;

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId:
        saved.memberId,
      action:
        status ===
        LockerStatus.OUT_OF_SERVICE
          ? LockerAction.OUT_OF_SERVICE
          : LockerAction.RETURNED_TO_SERVICE,
      description:
        `${saved.number} numaralı dolabın durumu ${status} olarak güncellendi.`,
      performedByUserId: userId,
    });

    return saved;
  }

  async releaseMemberLocker(
    gymId: string,
    memberId: number,
    userId: string | null,
  ) {
    const locker =
      await this.lockerRepository.findOne({
        where: {
          gymId,
          memberId,
          status:
            LockerStatus.OCCUPIED,
        },
      });

    if (!locker) {
      return {
        released: false,
        locker: null,
      };
    }

    const oldMemberId =
      locker.memberId;

    locker.memberId = null;
    locker.status =
      LockerStatus.AVAILABLE;
    locker.accessCode = null;
    locker.qrToken = null;
    locker.assignedAt = null;
    locker.releasedAt =
      new Date();
    locker.isLocked = false;

    const saved =
      await this.lockerRepository.save(
        locker,
      );

    await this.addHistory({
      gymId,
      lockerId: saved.id,
      memberId:
        oldMemberId,
      action:
        LockerAction.RELEASED,
      description:
        `${saved.number} numaralı dolap üye çıkışıyla otomatik boşaltıldı ve erişim bilgileri sıfırlandı.`,
      performedByUserId: userId,
    });

    return {
      released: true,
      locker: saved,
    };
  }

  async getHistory(
    gymId: string,
  ) {
    return this.historyRepository.find({
      where: {
        gymId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 300,
    });
  }

  private async findLockerOrFail(
    gymId: string,
    lockerId: string,
  ) {
    const locker =
      await this.lockerRepository.findOne({
        where: {
          id: lockerId,
          gymId,
        },
      });

    if (!locker) {
      throw new NotFoundException(
        'Dolap bulunamadı.',
      );
    }

    return locker;
  }

  private generateAccessCode() {
    return String(
      Math.floor(
        100000 +
          Math.random() * 900000,
      ),
    );
  }

  private generateQrToken() {
    return randomBytes(24).toString(
      'hex',
    );
  }

  private addHistory(data: {
    gymId: string;
    lockerId: string;
    memberId: number | null;
    action: LockerAction;
    description: string | null;
    performedByUserId:
      | string
      | null;
  }) {
    const history =
      this.historyRepository.create(
        data,
      );

    return this.historyRepository.save(
      history,
    );
  }
}
