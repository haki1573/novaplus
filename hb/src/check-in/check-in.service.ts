import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';

import { Member } from '../member/member.entity';

import {
  AccessCard,
  AccessCredentialStatus,
} from '../card/access-card.entity';

import { LockerService } from '../locker/locker.service';
import { StaffService } from '../staff/staff.service';
import { CheckIn } from './check-in.entity';
import { TurnstileService } from '../turnstile/turnstile.service';
import {
  TurnstileEventDirection,
  TurnstileEventResult,
} from '../turnstile/turnstile-event.entity';
import { RealtimeService } from '../realtime/realtime.service';

type AssignedCredential = AccessCard & {
  member: Member;
  memberId: number;
};

@Injectable()
export class CheckInService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,

    @InjectRepository(CheckIn)
    private readonly checkInRepository:
      Repository<CheckIn>,

    @InjectRepository(AccessCard)
    private readonly accessCardRepository:
      Repository<AccessCard>,

    private readonly lockerService:
      LockerService,

    private readonly staffService:
      StaffService,

    private readonly turnstileService:
      TurnstileService,

    private readonly realtimeService:
      RealtimeService,
  ) {}

  async scan(
    gymId: string,
    rawCode: string,
    turnstileId?: string | null,
  ) {
    const staffResult =
      await this.staffService.scanAttendance(
        gymId,
        rawCode,
      );

    if (staffResult) {
      return {
        ...staffResult,
        checkIn: {
          id: staffResult.attendance.id,
          checkInTime:
            staffResult.attendance.checkInTime,
          checkOutTime:
            staffResult.attendance.checkOutTime,
          durationMinutes:
            staffResult.attendance.durationMinutes,
          accessType:
            staffResult.attendance.accessType,
          accessCode:
            staffResult.attendance.accessCode,
          member: {
            id: 0,
            fullName:
              staffResult.staff.fullName,
            phone:
              staffResult.staff.phone,
            status: 'Personel',
            membershipEnd: null,
          },
          staff: {
            id: staffResult.staff.id,
            fullName:
              staffResult.staff.fullName,
            role:
              staffResult.staff.role,
          },
        },
      };
    }

    const credential =
      await this.findCredential(
        gymId,
        rawCode,
      );

    const member = credential.member;

    if (
      String(member.status)
        .toLocaleLowerCase('tr-TR') !==
      'aktif'
    ) {
      throw new BadRequestException(
        'Üyenin durumu aktif değil.',
      );
    }

    if (
      member.membershipEnd &&
      new Date(member.membershipEnd) <
        new Date()
    ) {
      throw new BadRequestException(
        'Üyenin üyelik süresi dolmuş.',
      );
    }

    const activeVisit =
      await this.checkInRepository.findOne({
        where: {
          gymId,
          memberId: member.id,
          checkOutTime: IsNull(),
        },
        order: {
          checkInTime: 'DESC',
        },
      });

    if (activeVisit) {
      throw new BadRequestException(
        'Bu üye zaten salonun içinde görünüyor. Çıkış modunu kullanın.',
      );
    }

    const duplicateLimit =
      new Date(
        Date.now() - 10 * 1000,
      );

    const recentCheckIn =
      await this.checkInRepository.findOne({
        where: {
          gymId,
          memberId: member.id,
          checkInTime:
            MoreThan(duplicateLimit),
        },
        order: {
          checkInTime: 'DESC',
        },
      });

    if (recentCheckIn) {
      throw new BadRequestException(
        'Bu üye kısa süre önce giriş yaptı.',
      );
    }

    const checkIn =
      this.checkInRepository.create({
        gymId,
        memberId: member.id,
        member,
        accessCardId: credential.id,
        accessCard: credential,
        accessType: credential.type,
        accessCode: credential.code,
        turnstileId:
          turnstileId || null,
        checkOutTime: null,
      });

    const saved =
      await this.checkInRepository.save(
        checkIn,
      );

    if (turnstileId) {
      await this.turnstileService.recordPassage({
        gymId,
        turnstileId,
        memberId: member.id,
        memberName:
          member.fullName ||
          member.name,
        credentialId:
          credential.id,
        credentialType:
          credential.type,
        credentialCode:
          credential.code,
        direction:
          TurnstileEventDirection.ENTRY,
        result:
          TurnstileEventResult.APPROVED,
        reason:
          'Giriş başarılı.',
      });
    }

    this.realtimeService.emit(
      gymId,
      'checkin:new',
      saved.id,
    );

    return {
      success: true,
      message: 'Giriş başarılı.',
      action: 'CHECK_IN',
      checkIn: {
        id: saved.id,
        checkInTime:
          saved.checkInTime,
        checkOutTime: null,
        accessType:
          saved.accessType,
        accessCode:
          saved.accessCode,
        member: {
          id: member.id,
          fullName:
            member.fullName ||
            member.name,
          phone: member.phone,
          status: member.status,
          membershipEnd:
            member.membershipEnd,
        },
      },
    };
  }

  async checkout(
    gymId: string,
    rawCode: string,
    userId: string | null,
    turnstileId?: string | null,
  ) {
    const staffResult =
      await this.staffService.scanAttendance(
        gymId,
        rawCode,
      );

    if (staffResult) {
      return {
        ...staffResult,
        checkIn: {
          id: staffResult.attendance.id,
          checkInTime:
            staffResult.attendance.checkInTime,
          checkOutTime:
            staffResult.attendance.checkOutTime,
          durationMinutes:
            staffResult.attendance.durationMinutes,
          accessType:
            staffResult.attendance.accessType,
          accessCode:
            staffResult.attendance.accessCode,
          member: {
            id: 0,
            fullName:
              staffResult.staff.fullName,
            phone:
              staffResult.staff.phone,
            status: 'Personel',
            membershipEnd: null,
          },
          staff: {
            id: staffResult.staff.id,
            fullName:
              staffResult.staff.fullName,
            role:
              staffResult.staff.role,
          },
        },
      };
    }

    const credential =
      await this.findCredential(
        gymId,
        rawCode,
      );

    const member = credential.member;

    const activeVisit =
      await this.checkInRepository.findOne({
        where: {
          gymId,
          memberId: member.id,
          checkOutTime: IsNull(),
        },
        order: {
          checkInTime: 'DESC',
        },
      });

    if (!activeVisit) {
      throw new BadRequestException(
        'Bu üyenin açık giriş kaydı bulunamadı.',
      );
    }

    const checkOutTime =
      new Date();

    activeVisit.checkOutTime =
      checkOutTime;

    const saved =
      await this.checkInRepository.save(
        activeVisit,
      );

    const lockerResult =
      await this.lockerService
        .releaseMemberLocker(
          gymId,
          member.id,
          userId,
        );

    const durationMinutes =
      Math.max(
        0,
        Math.round(
          (checkOutTime.getTime() -
            new Date(
              saved.checkInTime,
            ).getTime()) /
            60000,
        ),
      );

    if (turnstileId) {
      await this.turnstileService.recordPassage({
        gymId,
        turnstileId,
        memberId: member.id,
        memberName:
          member.fullName ||
          member.name,
        credentialId:
          credential.id,
        credentialType:
          credential.type,
        credentialCode:
          credential.code,
        direction:
          TurnstileEventDirection.EXIT,
        result:
          TurnstileEventResult.APPROVED,
        reason:
          'Çıkış başarılı.',
      });
    }

    this.realtimeService.emit(
      gymId,
      'checkout:new',
      saved.id,
    );

    return {
      success: true,
      message:
        lockerResult.released
          ? 'Çıkış başarılı. Üyenin dolabı boşaltıldı ve şifresi sıfırlandı.'
          : 'Çıkış başarılı.',
      action: 'CHECK_OUT',
      lockerReleased:
        lockerResult.released,
      checkIn: {
        id: saved.id,
        checkInTime:
          saved.checkInTime,
        checkOutTime,
        durationMinutes,
        accessType:
          saved.accessType,
        accessCode:
          saved.accessCode,
        member: {
          id: member.id,
          fullName:
            member.fullName ||
            member.name,
          phone: member.phone,
          status: member.status,
          membershipEnd:
            member.membershipEnd,
        },
      },
    };
  }

  async memberCheckIn(
    memberId: number,
    gymId: string,
  ) {
    const member =
      await this.memberRepository.findOne({
        where: {
          id: memberId,
          gymId,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Üye bulunamadı veya bu salona ait değil.',
      );
    }

    throw new BadRequestException(
      'Manuel giriş kapatıldı. Kart veya QR okutun.',
    );
  }


  async getTodaySummary(
    gymId: string,
  ) {
    const now = new Date();

    const todayStart =
      new Date(now);

    todayStart.setHours(
      0,
      0,
      0,
      0,
    );

    const todayEnd =
      new Date(now);

    todayEnd.setHours(
      23,
      59,
      59,
      999,
    );

    const [
      rawSummary,
      currentlyInside,
    ] = await Promise.all([
      this.checkInRepository
        .createQueryBuilder(
          'checkIn',
        )
        .select(
          'COUNT(checkIn.id)',
          'todayEntries',
        )
        .addSelect(
          `SUM(
            CASE
              WHEN checkIn.checkOutTime IS NOT NULL
              THEN 1
              ELSE 0
            END
          )`,
          'todayExits',
        )
        .addSelect(
          `SUM(
            CASE
              WHEN checkIn.accessType = 'CARD'
              THEN 1
              ELSE 0
            END
          )`,
          'cardEntries',
        )
        .addSelect(
          `SUM(
            CASE
              WHEN checkIn.accessType = 'QR'
              THEN 1
              ELSE 0
            END
          )`,
          'qrEntries',
        )
        .addSelect(
          `AVG(
            CASE
              WHEN checkIn.checkOutTime IS NOT NULL
              THEN (
                julianday(checkIn.checkOutTime) -
                julianday(checkIn.checkInTime)
              ) * 1440
              ELSE NULL
            END
          )`,
          'averageVisitMinutes',
        )
        .addSelect(
          'MAX(checkIn.checkInTime)',
          'lastEntryAt',
        )
        .where(
          'checkIn.gymId = :gymId',
          {
            gymId,
          },
        )
        .andWhere(
          'checkIn.checkInTime BETWEEN :todayStart AND :todayEnd',
          {
            todayStart,
            todayEnd,
          },
        )
        .getRawOne<{
          todayEntries:
            string | number | null;
          todayExits:
            string | number | null;
          cardEntries:
            string | number | null;
          qrEntries:
            string | number | null;
          averageVisitMinutes:
            string | number | null;
          lastEntryAt:
            string | null;
        }>(),

      this.checkInRepository.count({
        where: {
          gymId,
          checkOutTime:
            IsNull(),
        },
      }),
    ]);

    return {
      todayEntries:
        Number(
          rawSummary?.todayEntries ||
            0,
        ),
      currentlyInside,
      todayExits:
        Number(
          rawSummary?.todayExits ||
            0,
        ),
      cardEntries:
        Number(
          rawSummary?.cardEntries ||
            0,
        ),
      qrEntries:
        Number(
          rawSummary?.qrEntries ||
            0,
        ),
      averageVisitMinutes:
        Math.max(
          0,
          Math.round(
            Number(
              rawSummary
                ?.averageVisitMinutes ||
                0,
            ),
          ),
        ),
      lastEntryAt:
        rawSummary?.lastEntryAt ||
        null,
    };
  }

  async getGymLogs(
    gymId: string,
  ) {
    return this.checkInRepository.find({
      where: {
        gymId,
      },
      relations: {
        member: true,
      },
      order: {
        checkInTime: 'DESC',
      },
      take: 200,
    });
  }

  private async findCredential(
    gymId: string,
    rawCode: string,
  ): Promise<AssignedCredential> {
    const code = String(
      rawCode || '',
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

    if (!code) {
      throw new BadRequestException(
        'Kart veya QR kodu boş olamaz.',
      );
    }

    const credential =
      await this.accessCardRepository.findOne({
        where: {
          gymId,
          code,
          status:
            AccessCredentialStatus.ASSIGNED,
        },
        relations: {
          member: true,
        },
      });

    if (!credential) {
      throw new NotFoundException(
        'Bu salona atanmış aktif kart veya QR bulunamadı.',
      );
    }

    if (
      !credential.member ||
      credential.memberId === null
    ) {
      throw new BadRequestException(
        'Kart veya QR herhangi bir üyeye atanmış değil.',
      );
    }

    if (
      String(credential.member.gymId) !==
      String(gymId)
    ) {
      throw new BadRequestException(
        'Bu erişim kaydı başka bir spor salonuna ait.',
      );
    }

    return credential as AssignedCredential;
  }
}
