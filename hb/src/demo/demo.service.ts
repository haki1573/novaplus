import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { DataSource } from 'typeorm';

import { Package } from '../package.entity';
import { Member } from '../member/member.entity';
import {
  Finance,
  FinanceCategory,
} from '../finance.entity';
import { CheckIn } from '../check-in/check-in.entity';

const DEMO_PREFIX = '[DEMO]';

@Injectable()
export class DemoService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async status(gymId: string) {
    const memberRepository =
      this.dataSource.getRepository(Member);

    const demoMemberCount =
      await memberRepository
        .createQueryBuilder('member')
        .where('member.gymId = :gymId', {
          gymId,
        })
        .andWhere(
          'member.email LIKE :emailPattern',
          {
            emailPattern:
              'demo.%@novaplus.local',
          },
        )
        .getCount();

    return {
      loaded: demoMemberCount > 0,
      demoMemberCount,
    };
  }

  async load(gymId: string) {
    const normalizedGymId =
      String(gymId || '').trim();

    if (!normalizedGymId) {
      throw new BadRequestException(
        'Demo verisi için spor salonu bilgisi bulunamadı.',
      );
    }

    await this.reset(normalizedGymId);

    return this.dataSource.transaction(
      async (manager) => {
        const packageRepository =
          manager.getRepository(Package);

        const memberRepository =
          manager.getRepository(Member);

        const financeRepository =
          manager.getRepository(Finance);

        const checkInRepository =
          manager.getRepository(CheckIn);

        const packages =
          await packageRepository.save([
            packageRepository.create({
              name: 'Demo Aylık Üyelik',
              price: 1250,
              durationMonths: 1,
              description:
                `${DEMO_PREFIX} Aylık üyelik paketi`,
              status: 'Aktif',
              gymId: normalizedGymId,
            }),
            packageRepository.create({
              name: 'Demo 3 Aylık Üyelik',
              price: 3200,
              durationMonths: 3,
              description:
                `${DEMO_PREFIX} 3 aylık üyelik paketi`,
              status: 'Aktif',
              gymId: normalizedGymId,
            }),
            packageRepository.create({
              name: 'Demo Yıllık Üyelik',
              price: 9900,
              durationMonths: 12,
              description:
                `${DEMO_PREFIX} Yıllık üyelik paketi`,
              status: 'Aktif',
              gymId: normalizedGymId,
            }),
          ]);

        const firstNames = [
          'Ahmet',
          'Mehmet',
          'Ayşe',
          'Elif',
          'Zeynep',
          'Mert',
          'Ece',
          'Can',
          'Deniz',
          'Selin',
          'Burak',
          'Derya',
          'Emre',
          'İrem',
          'Kaan',
          'Ceren',
          'Oğuz',
          'Melis',
          'Kerem',
          'Buse',
        ];

        const lastNames = [
          'Yılmaz',
          'Kaya',
          'Demir',
          'Şahin',
          'Çelik',
          'Aydın',
          'Arslan',
          'Koç',
          'Kurt',
          'Öztürk',
          'Aksoy',
          'Polat',
          'Güneş',
          'Yıldız',
          'Tekin',
        ];

        const now = new Date();
        const members: Member[] = [];

        for (let index = 1; index <= 120; index += 1) {
          const firstName =
            firstNames[
              (index - 1) %
              firstNames.length
            ];

          const lastName =
            lastNames[
              Math.floor(
                (index - 1) /
                firstNames.length,
              ) %
              lastNames.length
            ];

          const fullName =
            `${firstName} ${lastName}`;

          const selectedPackage =
            packages[
              (index - 1) %
              packages.length
            ];

          const membershipStart =
            new Date(now);

          membershipStart.setDate(
            membershipStart.getDate() -
              (index % 150),
          );

          const membershipEnd =
            new Date(now);

          let status = 'Aktif';

          if (index <= 12) {
            membershipEnd.setDate(
              membershipEnd.getDate() -
                ((index % 20) + 1),
            );
            status = 'Pasif';
          } else if (index <= 30) {
            membershipEnd.setDate(
              membershipEnd.getDate() +
                ((index % 7) + 1),
            );
          } else {
            membershipEnd.setMonth(
              membershipEnd.getMonth() +
                ((index % 10) + 1),
            );
          }

          members.push(
            memberRepository.create({
              name: fullName,
              fullName,
              phone:
                `05${String(
                  300000000 +
                    index * 7919,
                ).slice(-9)}`,
              email:
                `demo.${index}@novaplus.local`,
              status,
              isArchived: false,
              gymId: normalizedGymId,
              packageId:
                selectedPackage.id,
              package: selectedPackage,
              membershipStart,
              membershipEnd,
            }),
          );
        }

        const savedMembers =
          await memberRepository.save(
            members,
            {
              chunk: 50,
            },
          );

        const financeRecords: Finance[] =
          [];

        for (
          let dayOffset = 29;
          dayOffset >= 0;
          dayOffset -= 1
        ) {
          const createdAt =
            new Date(now);

          createdAt.setDate(
            createdAt.getDate() -
              dayOffset,
          );

          createdAt.setHours(
            9 + (dayOffset % 8),
            15,
            0,
            0,
          );

          const dailyMembershipIncome =
            4200 +
            ((dayOffset * 713) % 6900);

          financeRecords.push(
            financeRepository.create({
              gymId:
                normalizedGymId,
              title:
                `${DEMO_PREFIX} Üyelik Geliri`,
              amount:
                dailyMembershipIncome,
              type: 'income',
              category:
                FinanceCategory.MEMBERSHIP,
              description:
                `${DEMO_PREFIX} Demo üyelik satışları`,
              createdAt,
            }),
          );

          if (dayOffset % 2 === 0) {
            financeRecords.push(
              financeRepository.create({
                gymId:
                  normalizedGymId,
                title:
                  `${DEMO_PREFIX} Nova Café Satışı`,
                amount:
                  650 +
                  ((dayOffset * 89) %
                    1700),
                type: 'income',
                category:
                  FinanceCategory.CAFE,
                description:
                  `${DEMO_PREFIX} Demo kafe satışları`,
                createdAt:
                  new Date(
                    createdAt.getTime() +
                      3 * 60 * 60 * 1000,
                  ),
              }),
            );
          }

          if (dayOffset % 7 === 0) {
            financeRecords.push(
              financeRepository.create({
                gymId:
                  normalizedGymId,
                title:
                  `${DEMO_PREFIX} İşletme Gideri`,
                amount:
                  1800 +
                  ((dayOffset * 137) %
                    2500),
                type: 'expense',
                category:
                  dayOffset % 14 === 0
                    ? FinanceCategory.ELECTRICITY
                    : FinanceCategory.SUPPLIES,
                description:
                  `${DEMO_PREFIX} Demo işletme gideri`,
                createdAt:
                  new Date(
                    createdAt.getTime() +
                      6 * 60 * 60 * 1000,
                  ),
              }),
            );
          }
        }

        await financeRepository.save(
          financeRecords,
          {
            chunk: 100,
          },
        );

        const checkIns: CheckIn[] = [];

        for (
          let dayOffset = 13;
          dayOffset >= 0;
          dayOffset -= 1
        ) {
          const dailyCount =
            24 +
            ((dayOffset * 11) % 38);

          for (
            let position = 0;
            position < dailyCount;
            position += 1
          ) {
            const member =
              savedMembers[
                (
                  dayOffset * 17 +
                  position * 7
                ) %
                savedMembers.length
              ];

            const checkInTime =
              new Date(now);

            checkInTime.setDate(
              checkInTime.getDate() -
                dayOffset,
            );

            checkInTime.setHours(
              7 +
                ((position * 3) % 15),
              (position * 13) % 60,
              0,
              0,
            );

            const checkOutTime =
              new Date(
                checkInTime.getTime() +
                  (45 +
                    ((position * 17) %
                      95)) *
                    60 *
                    1000,
              );

            checkIns.push(
              checkInRepository.create({
                gymId:
                  normalizedGymId,
                memberId: member.id,
                member,
                accessCardId: null,
                accessCard: null,
                accessType:
                  position % 3 === 0
                    ? 'QR'
                    : 'CARD',
                accessCode:
                  `${DEMO_PREFIX}-${member.id}`,
                turnstileId: null,
                checkInTime,
                checkOutTime:
                  dayOffset === 0 &&
                  position <
                    Math.min(
                      8,
                      dailyCount,
                    )
                    ? null
                    : checkOutTime,
              }),
            );
          }
        }

        await checkInRepository.save(
          checkIns,
          {
            chunk: 100,
          },
        );

        return {
          success: true,
          message:
            'Demo verileri başarıyla yüklendi.',
          summary: {
            packages:
              packages.length,
            members:
              savedMembers.length,
            financeRecords:
              financeRecords.length,
            checkIns:
              checkIns.length,
          },
        };
      },
    );
  }

  async reset(gymId: string) {
    const normalizedGymId =
      String(gymId || '').trim();

    if (!normalizedGymId) {
      throw new BadRequestException(
        'Demo verisi için spor salonu bilgisi bulunamadı.',
      );
    }

    return this.dataSource.transaction(
      async (manager) => {
        const packageRepository =
          manager.getRepository(Package);

        const memberRepository =
          manager.getRepository(Member);

        const financeRepository =
          manager.getRepository(Finance);

        const checkInRepository =
          manager.getRepository(CheckIn);

        const demoMembers =
          await memberRepository
            .createQueryBuilder('member')
            .where(
              'member.gymId = :gymId',
              {
                gymId:
                  normalizedGymId,
              },
            )
            .andWhere(
              'member.email LIKE :emailPattern',
              {
                emailPattern:
                  'demo.%@novaplus.local',
              },
            )
            .getMany();

        const demoMemberIds =
          demoMembers.map(
            (member) => member.id,
          );

        if (
          demoMemberIds.length > 0
        ) {
          await checkInRepository
            .createQueryBuilder()
            .delete()
            .from(CheckIn)
            .where(
              'gymId = :gymId',
              {
                gymId:
                  normalizedGymId,
              },
            )
            .andWhere(
              'memberId IN (:...memberIds)',
              {
                memberIds:
                  demoMemberIds,
              },
            )
            .execute();

          await memberRepository
            .createQueryBuilder()
            .delete()
            .from(Member)
            .where(
              'id IN (:...memberIds)',
              {
                memberIds:
                  demoMemberIds,
              },
            )
            .execute();
        }

        await financeRepository
          .createQueryBuilder()
          .delete()
          .from(Finance)
          .where(
            'gymId = :gymId',
            {
              gymId:
                normalizedGymId,
            },
          )
          .andWhere(
            `(
              title LIKE :prefix OR
              description LIKE :prefix
            )`,
            {
              prefix:
                `${DEMO_PREFIX}%`,
            },
          )
          .execute();

        await packageRepository
          .createQueryBuilder()
          .delete()
          .from(Package)
          .where(
            'gymId = :gymId',
            {
              gymId:
                normalizedGymId,
            },
          )
          .andWhere(
            'description LIKE :prefix',
            {
              prefix:
                `${DEMO_PREFIX}%`,
            },
          )
          .execute();

        return {
          success: true,
          message:
            'Demo verileri temizlendi.',
          removedMembers:
            demoMemberIds.length,
        };
      },
    );
  }
}
