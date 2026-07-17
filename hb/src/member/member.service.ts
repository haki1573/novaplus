import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Member } from './member.entity';
import { CheckIn } from '../check-in/check-in.entity';
import { Package } from '../package.entity';
import {
  Finance,
  FinanceCategory,
} from '../finance.entity';
import { MemberWallet } from '../wallet-cafe/member-wallet.entity';
import {
  AccessCard,
  AccessCredentialStatus,
} from '../card/access-card.entity';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,

    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,

    @InjectRepository(Finance)
    private readonly financeRepository: Repository<Finance>,

    @InjectRepository(MemberWallet)
    private readonly walletRepository: Repository<MemberWallet>,

    @InjectRepository(AccessCard)
    private readonly accessCardRepository: Repository<AccessCard>,

    @InjectRepository(CheckIn)
    private readonly checkInRepository: Repository<CheckIn>,

    private readonly realtimeService: RealtimeService,
  ) {}

  private async consumeMemberCredentials(
    memberId: number,
    gymId?: string,
  ): Promise<void> {
    const query =
      this.accessCardRepository
        .createQueryBuilder()
        .update(AccessCard)
        .set({
          status:
            AccessCredentialStatus.CONSUMED,
          note: () =>
            `CASE
              WHEN note IS NULL OR TRIM(note) = ''
                THEN 'Üye arşivlendiği için tüketildi.'
              ELSE note || ' | Üye arşivlendiği için tüketildi.'
            END`,
        })
        .where(
          'memberId = :memberId',
          {
            memberId,
          },
        )
        .andWhere(
          'status = :status',
          {
            status:
              AccessCredentialStatus.ASSIGNED,
          },
        );

    if (gymId) {
      query.andWhere(
        'gymId = :gymId',
        {
          gymId,
        },
      );
    }

    await query.execute();
  }

  private calculateMembershipEnd(
    startDate: Date,
    durationMonths: number,
  ): Date {
    const endDate = new Date(startDate);

    endDate.setMonth(
      endDate.getMonth() + Number(durationMonths),
    );

    return endDate;
  }

  private async updateExpiredMembers(): Promise<void> {
    await this.memberRepository
      .createQueryBuilder()
      .update(Member)
      .set({
        status: 'Pasif',
      })
      .where(
        'membershipEnd IS NOT NULL',
      )
      .andWhere(
        'membershipEnd < :now',
        {
          now: new Date(),
        },
      )
      .andWhere(
        'isArchived = :isArchived',
        {
          isArchived: false,
        },
      )
      .andWhere(
        'status != :passiveStatus',
        {
          passiveStatus: 'Pasif',
        },
      )
      .execute();
  }

  private async findPackageForGym(
    packageId: string,
    gymId?: string,
  ): Promise<Package> {
    const selectedPackage =
      await this.packageRepository.findOne({
        where: {
          id: packageId,
        },
      });

    if (!selectedPackage) {
      throw new NotFoundException(
        'Seçilen paket bulunamadı.',
      );
    }

    if (
      gymId &&
      String(selectedPackage.gymId) !==
        String(gymId)
    ) {
      throw new BadRequestException(
        'Seçilen paket bu spor salonuna ait değil.',
      );
    }

    return selectedPackage;
  }

  private async findMemberForGym(
    id: number,
    gymId: string,
    includePackage = false,
  ): Promise<Member> {
    const member =
      await this.memberRepository.findOne({
        where: {
          id,
          gymId,
          isArchived: false,
        },
        relations: includePackage
          ? {
              package: true,
            }
          : undefined,
      });

    if (!member) {
      throw new NotFoundException(
        'Üye bulunamadı veya bu spor salonuna ait değil.',
      );
    }

    return member;
  }

  private async createFinanceRecord(
    member: Member,
    selectedPackage: Package,
    operation:
      | 'Üyelik Ödemesi'
      | 'Üyelik Yenileme',
  ): Promise<void> {
    const financeRecord = new Finance();

    financeRecord.gymId = String(
      member.gymId ||
        selectedPackage.gymId ||
        'default-gym',
    );

    financeRecord.title =
      `${member.fullName} - ${operation}`;

    financeRecord.amount = Number(
      selectedPackage.price,
    );

    financeRecord.type = 'income';
    financeRecord.category =
      FinanceCategory.MEMBERSHIP;

    financeRecord.description =
      `${selectedPackage.name} paketi - ` +
      `${selectedPackage.durationMonths} aylık ` +
      (operation === 'Üyelik Yenileme'
        ? 'yenileme'
        : 'üyelik');

    await this.financeRepository.save(
      financeRecord,
    );
  }

  private getRemainingDays(
    membershipEnd?: Date | null,
  ): number | null {
    if (!membershipEnd) {
      return null;
    }

    return Math.ceil(
      (
        new Date(
          membershipEnd,
        ).getTime() -
        Date.now()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );
  }

  private getDaysSinceLastCheckIn(
    lastCheckInAt?: Date | null,
  ): number | null {
    if (!lastCheckInAt) {
      return null;
    }

    return Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          new Date(
            lastCheckInAt,
          ).getTime()
        ) /
          (
            1000 *
            60 *
            60 *
            24
          ),
      ),
    );
  }

  async findAll(): Promise<
    Array<Member & {
      walletBalance: number;
    }>
  > {
    await this.updateExpiredMembers();

    const [
      members,
      wallets,
    ] = await Promise.all([
      this.memberRepository.find({
        where: {
          isArchived: false,
        },
        relations: {
          package: true,
        },
        order: {
          id: 'DESC',
        },
      }),

      this.walletRepository.find(),
    ]);

    const walletMap = new Map(
      wallets.map((wallet) => [
        wallet.memberId,
        Number(wallet.balance || 0),
      ]),
    );

    return members.map((member) => ({
      ...member,
      walletBalance:
        walletMap.get(member.id) || 0,
    }));
  }

  async findAllByGym(
    gymId: string,
  ): Promise<
    Array<
      Member & {
        walletBalance: number;
        cardCode: string | null;
        qrCode: string | null;
        remainingDays: number | null;
        lastCheckInAt: Date | null;
        daysSinceLastCheckIn: number | null;
        expiresWithinSevenDays: boolean;
        inactiveForThirtyDays: boolean;
      }
    >
  > {
    await this.updateExpiredMembers();

    const [
      members,
      wallets,
      credentials,
    ] = await Promise.all([
      this.memberRepository.find({
        where: {
          gymId,
          isArchived: false,
        },
        relations: {
          package: true,
        },
        order: {
          id: 'DESC',
        },
      }),

      this.walletRepository.find({
        where: {
          gymId,
        },
      }),

      this.accessCardRepository.find({
        where: {
          gymId,
          status:
            AccessCredentialStatus.ASSIGNED,
        },
      }),
    ]);

    const memberIds =
      members.map(
        (member) => member.id,
      );

    const lastCheckIns =
      memberIds.length > 0
        ? await this.checkInRepository
            .createQueryBuilder(
              'checkIn',
            )
            .select(
              'checkIn.memberId',
              'memberId',
            )
            .addSelect(
              'MAX(checkIn.checkInTime)',
              'lastCheckInAt',
            )
            .where(
              'checkIn.gymId = :gymId',
              { gymId },
            )
            .andWhere(
              'checkIn.memberId IN (:...memberIds)',
              { memberIds },
            )
            .groupBy(
              'checkIn.memberId',
            )
            .getRawMany<{
              memberId: number;
              lastCheckInAt: string;
            }>()
        : [];

    const walletMap =
      new Map(
        wallets.map(
          (wallet) => [
            wallet.memberId,
            Number(
              wallet.balance || 0,
            ),
          ],
        ),
      );

    const credentialMap =
      new Map<
        number,
        {
          cardCode: string | null;
          qrCode: string | null;
        }
      >();

    for (
      const credential of
      credentials
    ) {
      if (!credential.memberId) {
        continue;
      }

      const current =
        credentialMap.get(
          credential.memberId,
        ) || {
          cardCode: null,
          qrCode: null,
        };

      if (
        credential.type ===
        'CARD'
      ) {
        current.cardCode =
          credential.code;
      }

      if (
        credential.type ===
        'QR'
      ) {
        current.qrCode =
          credential.code;
      }

      credentialMap.set(
        credential.memberId,
        current,
      );
    }

    const lastCheckInMap =
      new Map(
        lastCheckIns.map(
          (item) => [
            Number(
              item.memberId,
            ),
            new Date(
              item.lastCheckInAt,
            ),
          ],
        ),
      );

    return members.map(
      (member) => {
        const access =
          credentialMap.get(
            member.id,
          ) || {
            cardCode: null,
            qrCode: null,
          };

        const remainingDays =
          this.getRemainingDays(
            member.membershipEnd,
          );

        const lastCheckInAt =
          lastCheckInMap.get(
            member.id,
          ) || null;

        const daysSinceLastCheckIn =
          this.getDaysSinceLastCheckIn(
            lastCheckInAt,
          );

        return {
          ...member,
          walletBalance:
            walletMap.get(
              member.id,
            ) || 0,
          cardCode:
            access.cardCode,
          qrCode:
            access.qrCode,
          remainingDays,
          lastCheckInAt,
          daysSinceLastCheckIn,
          expiresWithinSevenDays:
            remainingDays !== null &&
            remainingDays >= 0 &&
            remainingDays <= 7,
          inactiveForThirtyDays:
            daysSinceLastCheckIn ===
              null ||
            daysSinceLastCheckIn >=
              30,
        };
      },
    );
  }


  async findPageByGym(
    gymId: string,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
    },
  ) {
    await this.updateExpiredMembers();

    const page = Math.max(
      1,
      Number(options.page || 1),
    );

    const pageSize = Math.min(
      200,
      Math.max(
        10,
        Number(
          options.pageSize || 100,
        ),
      ),
    );

    const search = String(
      options.search || '',
    )
      .trim()
      .toLocaleLowerCase('tr-TR');

    const filter = String(
      options.status || 'all',
    );

    const now = new Date();

    const sevenDaysLater =
      new Date(
        now.getTime() +
          7 *
            24 *
            60 *
            60 *
            1000,
      );

    const thirtyDaysAgo =
      new Date(
        now.getTime() -
          30 *
            24 *
            60 *
            60 *
            1000,
      );

    const query =
      this.memberRepository
        .createQueryBuilder(
          'member',
        )
        .leftJoinAndSelect(
          'member.package',
          'package',
        )
        .where(
          'member.gymId = :gymId',
          {
            gymId,
          },
        )
        .andWhere(
          'member.isArchived = :isArchived',
          {
            isArchived: false,
          },
        );

    if (search) {
      query.andWhere(
        `(
          LOWER(member.fullName) LIKE :search OR
          LOWER(member.phone) LIKE :search OR
          LOWER(member.email) LIKE :search OR
          EXISTS (
            SELECT 1
            FROM access_cards accessSearch
            WHERE accessSearch.memberId = member.id
              AND accessSearch.gymId = :gymId
              AND accessSearch.status = :assignedStatus
              AND LOWER(accessSearch.code) LIKE :search
          )
        )`,
        {
          search: `%${search}%`,
          assignedStatus:
            AccessCredentialStatus.ASSIGNED,
        },
      );
    }

    if (filter === 'active') {
      query.andWhere(
        'member.status = :activeStatus',
        {
          activeStatus: 'Aktif',
        },
      );
    } else if (
      filter === 'expired'
    ) {
      query.andWhere(
        'member.status != :activeStatus',
        {
          activeStatus: 'Aktif',
        },
      );
    } else if (
      filter === 'expiring'
    ) {
      query
        .andWhere(
          'member.membershipEnd IS NOT NULL',
        )
        .andWhere(
          'member.membershipEnd BETWEEN :now AND :sevenDaysLater',
          {
            now,
            sevenDaysLater,
          },
        );
    } else if (
      filter === 'inactive'
    ) {
      query.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM check_ins recentCheckIn
          WHERE recentCheckIn.memberId = member.id
            AND recentCheckIn.gymId = :gymId
            AND recentCheckIn.checkInTime >= :thirtyDaysAgo
        )`,
        {
          thirtyDaysAgo,
        },
      );
    } else if (
      filter === 'no-card'
    ) {
      query.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM access_cards noCard
          WHERE noCard.memberId = member.id
            AND noCard.gymId = :gymId
            AND noCard.type = 'CARD'
            AND noCard.status = :assignedStatus
        )`,
        {
          assignedStatus:
            AccessCredentialStatus.ASSIGNED,
        },
      );
    } else if (
      filter === 'no-qr'
    ) {
      query.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM access_cards noQr
          WHERE noQr.memberId = member.id
            AND noQr.gymId = :gymId
            AND noQr.type = 'QR'
            AND noQr.status = :assignedStatus
        )`,
        {
          assignedStatus:
            AccessCredentialStatus.ASSIGNED,
        },
      );
    } else if (
      filter === 'wallet'
    ) {
      query.andWhere(
        `EXISTS (
          SELECT 1
          FROM member_wallets walletFilter
          WHERE walletFilter.memberId = member.id
            AND walletFilter.gymId = :gymId
            AND walletFilter.balance > 0
        )`,
      );
    }

    const [
      members,
      total,
    ] = await query
      .orderBy(
        'member.id',
        'DESC',
      )
      .skip(
        (page - 1) *
          pageSize,
      )
      .take(pageSize)
      .getManyAndCount();

    const memberIds =
      members.map(
        (member) =>
          member.id,
      );

    if (
      memberIds.length === 0
    ) {
      return {
        items: [],
        total,
        page,
        pageSize,
        totalPages:
          Math.max(
            1,
            Math.ceil(
              total /
                pageSize,
            ),
          ),
      };
    }

    const [
      wallets,
      credentials,
      lastCheckIns,
    ] = await Promise.all([
      this.walletRepository.find({
        where: {
          gymId,
          memberId:
            In(memberIds),
        },
      }),

      this.accessCardRepository.find({
        where: {
          gymId,
          memberId:
            In(memberIds),
          status:
            AccessCredentialStatus.ASSIGNED,
        },
      }),

      this.checkInRepository
        .createQueryBuilder(
          'checkIn',
        )
        .select(
          'checkIn.memberId',
          'memberId',
        )
        .addSelect(
          'MAX(checkIn.checkInTime)',
          'lastCheckInAt',
        )
        .where(
          'checkIn.gymId = :gymId',
          {
            gymId,
          },
        )
        .andWhere(
          'checkIn.memberId IN (:...memberIds)',
          {
            memberIds,
          },
        )
        .groupBy(
          'checkIn.memberId',
        )
        .getRawMany<{
          memberId:
            number | string;
          lastCheckInAt:
            string;
        }>(),
    ]);

    const walletMap =
      new Map(
        wallets.map(
          (wallet) => [
            wallet.memberId,
            Number(
              wallet.balance || 0,
            ),
          ],
        ),
      );

    const accessMap =
      new Map<
        number,
        {
          cardCode:
            string | null;
          qrCode:
            string | null;
        }
      >();

    for (
      const credential of
      credentials
    ) {
      if (
        credential.memberId ===
        null
      ) {
        continue;
      }

      const current =
        accessMap.get(
          credential.memberId,
        ) || {
          cardCode: null,
          qrCode: null,
        };

      if (
        String(
          credential.type,
        ) === 'CARD'
      ) {
        current.cardCode =
          credential.code;
      }

      if (
        String(
          credential.type,
        ) === 'QR'
      ) {
        current.qrCode =
          credential.code;
      }

      accessMap.set(
        credential.memberId,
        current,
      );
    }

    const lastCheckInMap =
      new Map(
        lastCheckIns.map(
          (item) => [
            Number(
              item.memberId,
            ),
            new Date(
              item.lastCheckInAt,
            ),
          ],
        ),
      );

    const items =
      members.map(
        (member) => {
          const access =
            accessMap.get(
              member.id,
            ) || {
              cardCode: null,
              qrCode: null,
            };

          const remainingDays =
            this.getRemainingDays(
              member.membershipEnd,
            );

          const lastCheckInAt =
            lastCheckInMap.get(
              member.id,
            ) || null;

          const daysSinceLastCheckIn =
            this.getDaysSinceLastCheckIn(
              lastCheckInAt,
            );

          return {
            ...member,
            walletBalance:
              walletMap.get(
                member.id,
              ) || 0,
            cardCode:
              access.cardCode,
            qrCode:
              access.qrCode,
            remainingDays,
            lastCheckInAt,
            daysSinceLastCheckIn,
            expiresWithinSevenDays:
              remainingDays !==
                null &&
              remainingDays >= 0 &&
              remainingDays <= 7,
            inactiveForThirtyDays:
              daysSinceLastCheckIn ===
                null ||
              daysSinceLastCheckIn >=
                30,
          };
        },
      );

    return {
      items,
      total,
      page,
      pageSize,
      totalPages:
        Math.max(
          1,
          Math.ceil(
            total /
              pageSize,
          ),
        ),
    };
  }


  async create(
    data: Partial<Member>,
  ): Promise<Member> {
    return this.createMember(data);
  }

  async createForGym(
    gymId: string,
    data: Partial<Member>,
  ): Promise<Member> {
    return this.createMember({
      ...data,
      gymId,
    });
  }

  private async createMember(
    data: Partial<Member>,
  ): Promise<Member> {
    const fullName = String(
      data.fullName || data.name || '',
    ).trim();

    if (!fullName) {
      throw new BadRequestException(
        'Üye adı zorunludur.',
      );
    }

    const gymId = data.gymId
      ? String(data.gymId)
      : undefined;

    let selectedPackage: Package | null =
      null;

    if (data.packageId) {
      selectedPackage =
        await this.findPackageForGym(
          String(data.packageId),
          gymId,
        );
    }

    const membershipStart =
      data.membershipStart
        ? new Date(data.membershipStart)
        : new Date();

    const member = new Member();

    member.name = fullName;
    member.fullName = fullName;
    member.phone = data.phone || '';
    member.email = data.email || '';
    member.status = 'Aktif';
    member.isArchived = false;
    member.gymId = gymId;
    member.packageId =
      selectedPackage?.id || undefined;
    member.membershipStart =
      membershipStart;

    if (data.membershipEnd) {
      member.membershipEnd = new Date(
        data.membershipEnd,
      );
    } else if (selectedPackage) {
      member.membershipEnd =
        this.calculateMembershipEnd(
          membershipStart,
          selectedPackage.durationMonths,
        );
    } else {
      member.membershipEnd = null;
    }

    const savedMember =
      await this.memberRepository.save(
        member,
      );

    if (selectedPackage) {
      await this.createFinanceRecord(
        savedMember,
        selectedPackage,
        'Üyelik Ödemesi',
      );
    }

    this.realtimeService.emit(
      savedMember.gymId,
      'member:created',
      savedMember.id,
    );

    return savedMember;
  }

  async updateMember(
    id: number,
    updateData: Partial<Member>,
  ): Promise<Member> {
    const member =
      await this.memberRepository.findOne({
        where: {
          id,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Üye bulunamadı.',
      );
    }

    return this.applyMemberUpdate(
      member,
      updateData,
    );
  }

  async updateMemberForGym(
    gymId: string,
    id: number,
    updateData: Partial<Member>,
  ): Promise<Member> {
    const member =
      await this.findMemberForGym(
        id,
        gymId,
      );

    return this.applyMemberUpdate(
      member,
      updateData,
      gymId,
    );
  }

  private async applyMemberUpdate(
    member: Member,
    updateData: Partial<Member>,
    gymId?: string,
  ): Promise<Member> {
    if (
      updateData.fullName !== undefined ||
      updateData.name !== undefined
    ) {
      const fullName = String(
        updateData.fullName ||
          updateData.name ||
          '',
      ).trim();

      if (!fullName) {
        throw new BadRequestException(
          'Üye adı zorunludur.',
        );
      }

      member.fullName = fullName;
      member.name = fullName;
    }

    if (updateData.phone !== undefined) {
      member.phone = updateData.phone;
    }

    if (updateData.email !== undefined) {
      member.email = updateData.email;
    }

    if (updateData.status !== undefined) {
      member.status = updateData.status;
    }

    if (updateData.membershipStart) {
      member.membershipStart = new Date(
        updateData.membershipStart,
      );
    }

    if (
      updateData.packageId !== undefined
    ) {
      if (updateData.packageId) {
        const selectedPackage =
          await this.findPackageForGym(
            String(updateData.packageId),
            gymId ||
              (member.gymId
                ? String(member.gymId)
                : undefined),
          );

        const newStartDate = new Date();

        member.packageId =
          selectedPackage.id;
        member.membershipStart =
          newStartDate;
        member.membershipEnd =
          this.calculateMembershipEnd(
            newStartDate,
            selectedPackage.durationMonths,
          );
        member.status = 'Aktif';
      } else {
        member.packageId = undefined;
        member.membershipEnd = null;
      }
    }

    if (
      updateData.membershipEnd !== undefined
    ) {
      member.membershipEnd =
        updateData.membershipEnd
          ? new Date(
              updateData.membershipEnd,
            )
          : null;
    }

    if (
      member.membershipEnd &&
      member.membershipEnd < new Date()
    ) {
      member.status = 'Pasif';
    }

    return this.memberRepository.save(
      member,
    );
  }

  async renewMembership(
    id: number,
  ): Promise<Member> {
    const member =
      await this.memberRepository.findOne({
        where: {
          id,
        },
        relations: {
          package: true,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Üye bulunamadı.',
      );
    }

    return this.renewMember(member);
  }

  async renewMembershipForGym(
    gymId: string,
    id: number,
  ): Promise<Member> {
    const member =
      await this.findMemberForGym(
        id,
        gymId,
        true,
      );

    return this.renewMember(member);
  }

  private async renewMember(
    member: Member,
  ): Promise<Member> {
    if (!member.package) {
      throw new BadRequestException(
        'Üyenin yenilenecek bir paketi yok.',
      );
    }

    if (
      member.gymId &&
      String(member.package.gymId) !==
        String(member.gymId)
    ) {
      throw new BadRequestException(
        'Üyenin paketi bu spor salonuna ait değil.',
      );
    }

    const startDate = new Date();

    member.membershipStart = startDate;
    member.membershipEnd =
      this.calculateMembershipEnd(
        startDate,
        member.package.durationMonths,
      );
    member.status = 'Aktif';

    const savedMember =
      await this.memberRepository.save(
        member,
      );

    await this.createFinanceRecord(
      savedMember,
      member.package,
      'Üyelik Yenileme',
    );

    this.realtimeService.emit(
      savedMember.gymId,
      'member:updated',
      savedMember.id,
    );

    return savedMember;
  }

  async deleteMember(
    id: number,
  ): Promise<void> {
    const member =
      await this.memberRepository.findOne({
        where: {
          id,
          isArchived: false,
        },
      });

    if (!member) {
      throw new NotFoundException(
        'Üye bulunamadı.',
      );
    }

    await this.consumeMemberCredentials(
      member.id,
      member.gymId
        ? String(member.gymId)
        : undefined,
    );

    member.isArchived = true;
    member.status = 'Pasif';

    await this.memberRepository.save(
      member,
    );
  }

  async deleteMemberForGym(
    gymId: string,
    id: number,
  ): Promise<void> {
    const member =
      await this.findMemberForGym(
        id,
        gymId,
      );

    await this.consumeMemberCredentials(
      member.id,
      member.gymId
        ? String(member.gymId)
        : undefined,
    );

    member.isArchived = true;
    member.status = 'Pasif';

    await this.memberRepository.save(
      member,
    );
  }
}
