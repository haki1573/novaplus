import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  Not,
  Repository,
} from 'typeorm';
import { randomUUID } from 'crypto';

import { Member } from '../member/member.entity';
import { Gym } from '../gym/gym.entity';
import { FinanceService } from '../finance.service';
import { FinanceCategory } from '../finance.entity';

import {
  AccessCard,
  AccessCredentialStatus,
  AccessCredentialType,
} from './access-card.entity';

interface CreateStockItemData {
  type?: AccessCredentialType;
  code?: string;
  gymSalePrice?: number;
  note?: string | null;
}

interface BulkCreateStockData {
  type?: AccessCredentialType;
  quantity?: number;
  codes?: string[];
  codesText?: string;
  gymSalePrice?: number;
  note?: string | null;
}

interface UpdateStockItemData {
  code?: string;
  status?: AccessCredentialStatus;
  gymSalePrice?: number;
  note?: string | null;
}

interface AssignCredentialData {
  memberId?: number;
  cardId?: string;
  qrId?: string;
}

interface SellCredentialData
  extends AssignCredentialData {
  cardPrice?: number;
  qrPrice?: number;
  description?: string;
}

@Injectable()
export class AccessCardService {
  constructor(
    @InjectRepository(AccessCard)
    private readonly accessCardRepository:
      Repository<AccessCard>,

    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,

    @InjectRepository(Gym)
    private readonly gymRepository:
      Repository<Gym>,

    private readonly financeService:
      FinanceService,
  ) {}

  private async cleanupArchivedMemberCredentials(
    gymId: string,
  ): Promise<void> {
    /*
     * Eski sürümlerde üye arşivlendiğinde kart/QR kayıtları
     * ASSIGNED olarak kalmış veya memberId SET NULL olmuş olabilir.
     *
     * Bu sorgu:
     * - arşivlenmiş üyeye bağlı ASSIGNED kayıtları,
     * - artık üyeye bağlı olmayan (orphan) ASSIGNED kayıtları
     * CONSUMED durumuna geçirir.
     *
     * Finans ve satış gelir kayıtlarına dokunulmaz.
     */
    await this.accessCardRepository
      .createQueryBuilder()
      .update(AccessCard)
      .set({
        status:
          AccessCredentialStatus.CONSUMED,
        note: () =>
          `CASE
            WHEN note IS NULL OR TRIM(note) = ''
              THEN 'Arşivlenmiş/silinmiş üyeye ait olduğu için tüketildi.'
            ELSE note || ' | Arşivlenmiş/silinmiş üyeye ait olduğu için tüketildi.'
          END`,
      })
      .where(
        'gymId = :gymId',
        {
          gymId,
        },
      )
      .andWhere(
        'status = :assignedStatus',
        {
          assignedStatus:
            AccessCredentialStatus.ASSIGNED,
        },
      )
      .andWhere(
        `(
          memberId IS NULL
          OR memberId IN (
            SELECT id
            FROM member
            WHERE gymId = :gymId
              AND isArchived = 1
          )
        )`,
      )
      .execute();
  }

  async findAllByGym(
    gymId: string,
    type?: AccessCredentialType,
  ): Promise<AccessCard[]> {
    await this.cleanupArchivedMemberCredentials(
      gymId,
    );

    return this.accessCardRepository.find({
      where: {
        gymId,
        status: Not(
          AccessCredentialStatus.CONSUMED,
        ),
        ...(type ? { type } : {}),
      },
      relations: {
        member: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getAvailableByType(
    gymId: string,
    type: AccessCredentialType,
  ): Promise<AccessCard[]> {
    await this.cleanupArchivedMemberCredentials(
      gymId,
    );

    const normalizedType =
      this.normalizeType(type);

    return this.accessCardRepository.find({
      where: {
        gymId,
        type: normalizedType,
        status:
          AccessCredentialStatus.AVAILABLE,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getInventorySummary(
    gymId: string,
  ) {
    await this.cleanupArchivedMemberCredentials(
      gymId,
    );

    const items =
      await this.accessCardRepository.find({
        where: {
          gymId,
          status: Not(
            AccessCredentialStatus.CONSUMED,
          ),
        },
      });

    const count = (
      type: AccessCredentialType,
      status?: AccessCredentialStatus,
    ) =>
      items.filter(
        (item) =>
          item.type === type &&
          (!status ||
            item.status === status),
      ).length;

    return {
      cards: {
        total: count(
          AccessCredentialType.CARD,
        ),
        available: count(
          AccessCredentialType.CARD,
          AccessCredentialStatus.AVAILABLE,
        ),
        assigned: count(
          AccessCredentialType.CARD,
          AccessCredentialStatus.ASSIGNED,
        ),
      },
      qr: {
        total: count(
          AccessCredentialType.QR,
        ),
        available: count(
          AccessCredentialType.QR,
          AccessCredentialStatus.AVAILABLE,
        ),
        assigned: count(
          AccessCredentialType.QR,
          AccessCredentialStatus.ASSIGNED,
        ),
      },
    };
  }


  async getCloudInventory() {
    const [
      gyms,
      items,
    ] = await Promise.all([
      this.gymRepository.find({
        order: {
          name: 'ASC',
        },
      }),

      this.accessCardRepository.find({
        order: {
          soldToGymAt: 'DESC',
        },
      }),
    ]);

    const gymMap =
      new Map(
        gyms.map((gym) => [
          gym.id,
          gym,
        ]),
      );

    const rows =
      gyms.map((gym) => {
        const gymItems =
          items.filter(
            (item) =>
              item.gymId === gym.id,
          );

        const count = (
          type:
            AccessCredentialType,
          status?:
            AccessCredentialStatus,
        ) =>
          gymItems.filter(
            (item) =>
              item.type === type &&
              (
                !status ||
                item.status ===
                  status
              ),
          ).length;

        const revenue =
          gymItems.reduce(
            (sum, item) =>
              sum +
              Number(
                item.gymSalePrice || 0,
              ),
            0,
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

          cards: {
            total:
              count(
                AccessCredentialType.CARD,
              ),
            available:
              count(
                AccessCredentialType.CARD,
                AccessCredentialStatus.AVAILABLE,
              ),
            assigned:
              count(
                AccessCredentialType.CARD,
                AccessCredentialStatus.ASSIGNED,
              ),
            consumed:
              count(
                AccessCredentialType.CARD,
                AccessCredentialStatus.CONSUMED,
              ),
          },

          qr: {
            total:
              count(
                AccessCredentialType.QR,
              ),
            available:
              count(
                AccessCredentialType.QR,
                AccessCredentialStatus.AVAILABLE,
              ),
            assigned:
              count(
                AccessCredentialType.QR,
                AccessCredentialStatus.ASSIGNED,
              ),
            consumed:
              count(
                AccessCredentialType.QR,
                AccessCredentialStatus.CONSUMED,
              ),
          },

          revenue:
            Number(
              revenue.toFixed(2),
            ),

          lastSaleAt:
            gymItems
              .map(
                (item) =>
                  item.soldToGymAt,
              )
              .filter(
                (
                  value,
                ): value is Date =>
                  Boolean(value),
              )
              .sort(
                (a, b) =>
                  b.getTime() -
                  a.getTime(),
              )[0] || null,
        };
      });

    const total = (
      type:
        AccessCredentialType,
      status?:
        AccessCredentialStatus,
    ) =>
      items.filter(
        (item) =>
          item.type === type &&
          (
            !status ||
            item.status ===
              status
          ),
      ).length;

    const totalRevenue =
      items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.gymSalePrice || 0,
          ),
        0,
      );

    const recentSales =
      items
        .filter(
          (item) =>
            item.soldToGymAt,
        )
        .slice(0, 20)
        .map((item) => ({
          id:
            item.id,
          gymId:
            item.gymId,
          gymName:
            gymMap.get(
              item.gymId,
            )?.name ||
            'Bilinmeyen Salon',
          type:
            item.type,
          code:
            item.code,
          unitPrice:
            Number(
              item.gymSalePrice || 0,
            ),
          soldToGymAt:
            item.soldToGymAt,
          status:
            item.status,
        }));

    return {
      summary: {
        totalCards:
          total(
            AccessCredentialType.CARD,
          ),
        availableCards:
          total(
            AccessCredentialType.CARD,
            AccessCredentialStatus.AVAILABLE,
          ),
        assignedCards:
          total(
            AccessCredentialType.CARD,
            AccessCredentialStatus.ASSIGNED,
          ),
        totalQr:
          total(
            AccessCredentialType.QR,
          ),
        availableQr:
          total(
            AccessCredentialType.QR,
            AccessCredentialStatus.AVAILABLE,
          ),
        assignedQr:
          total(
            AccessCredentialType.QR,
            AccessCredentialStatus.ASSIGNED,
          ),
        totalRevenue:
          Number(
            totalRevenue.toFixed(2),
          ),
        gymCount:
          gyms.length,
      },

      gyms: rows,
      recentSales,
    };
  }

  async sellStockToGym(
    data: BulkCreateStockData & {
      gymId?: string;
    },
  ) {
    const gymId =
      String(
        data.gymId || '',
      ).trim();

    if (!gymId) {
      throw new BadRequestException(
        'Spor salonu seçmelisiniz.',
      );
    }

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

    const result =
      await this.bulkCreateStock(
        gymId,
        data,
      );

    return {
      ...result,
      gym: {
        id:
          gym.id,
        name:
          gym.name,
      },
    };
  }

  async createStockItem(
    gymId: string,
    data: CreateStockItemData,
  ): Promise<AccessCard> {
    const type =
      this.normalizeType(data.type);

    const code = this.normalizeCode(
      type,
      data.code,
    );

    await this.ensureCodeAvailable(
      gymId,
      code,
    );

    const item =
      this.accessCardRepository.create({
        gymId,
        type,
        code,
        memberId: null,
        member: null,
        status:
          AccessCredentialStatus.AVAILABLE,
        gymSalePrice:
          this.normalizePrice(
            data.gymSalePrice,
          ),
        soldToGymAt: new Date(),
        note:
          data.note?.trim() || null,
        assignedAt: null,
      });

    return this.accessCardRepository.save(
      item,
    );
  }

  async bulkCreateStock(
    gymId: string,
    data: BulkCreateStockData,
  ) {
    const type =
      this.normalizeType(data.type);

    const gymSalePrice =
      this.normalizePrice(
        data.gymSalePrice,
      );

    const soldToGymAt = new Date();
    const items: AccessCard[] = [];

    if (
      type ===
      AccessCredentialType.CARD
    ) {
      const codes =
        this.normalizeCardCodes(data);

      for (const code of codes) {
        await this.ensureCodeAvailable(
          gymId,
          code,
        );

        items.push(
          this.accessCardRepository.create({
            gymId,
            type,
            code,
            memberId: null,
            member: null,
            status:
              AccessCredentialStatus.AVAILABLE,
            gymSalePrice,
            soldToGymAt,
            note:
              data.note?.trim() || null,
            assignedAt: null,
          }),
        );
      }
    } else {
      const quantity = Number(
        data.quantity,
      );

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 5000
      ) {
        throw new BadRequestException(
          'QR adedi 1 ile 5000 arasında olmalıdır.',
        );
      }

      for (
        let index = 0;
        index < quantity;
        index += 1
      ) {
        items.push(
          this.accessCardRepository.create({
            gymId,
            type,
            code:
              `NOVAPLUS-QR-${randomUUID()}`,
            memberId: null,
            member: null,
            status:
              AccessCredentialStatus.AVAILABLE,
            gymSalePrice,
            soldToGymAt,
            note:
              data.note?.trim() || null,
            assignedAt: null,
          }),
        );
      }
    }

    await this.accessCardRepository.save(
      items,
    );

    return {
      message:
        `${items.length} adet ${
          type ===
          AccessCredentialType.CARD
            ? 'hazır kart'
            : 'QR'
        } salona tanımlandı.`,
      createdCount: items.length,
      totalGymSaleAmount:
        Number(
          (
            items.length *
            gymSalePrice
          ).toFixed(2),
        ),
    };
  }

  async updateForGym(
    gymId: string,
    id: string,
    data: UpdateStockItemData,
  ): Promise<AccessCard> {
    const item =
      await this.findOneForGym(
        gymId,
        id,
      );

    if (data.code !== undefined) {
      const code = this.normalizeCode(
        item.type,
        data.code,
      );

      await this.ensureCodeAvailable(
        gymId,
        code,
        item.id,
      );

      item.code = code;
    }

    if (data.status !== undefined) {
      if (
        item.status ===
        AccessCredentialStatus.CONSUMED
      ) {
        throw new BadRequestException(
          'Tüketilmiş kart veya QR tekrar aktif hale getirilemez.',
        );
      }

      item.status =
        this.normalizeStatus(
          data.status,
        );
    }

    if (
      data.gymSalePrice !== undefined
    ) {
      item.gymSalePrice =
        this.normalizePrice(
          data.gymSalePrice,
        );
    }

    if (data.note !== undefined) {
      item.note =
        data.note?.trim() || null;
    }

    return this.accessCardRepository.save(
      item,
    );
  }

  async assignToMember(
    gymId: string,
    data: AssignCredentialData,
  ) {
    const {
      member,
      items,
    } = await this.prepareAssignment(
      gymId,
      data,
    );

    for (const item of items) {
      item.memberId = member.id;
      item.member = member;
      item.status =
        AccessCredentialStatus.ASSIGNED;
      item.assignedAt = new Date();
    }

    await this.accessCardRepository.save(
      items,
    );

    return {
      message:
        'Kart/QR üyeye başarıyla tanımlandı.',
      assignedItems: items,
    };
  }

  async sellToMember(
    gymId: string,
    data: SellCredentialData,
  ) {
    const {
      member,
      items,
    } = await this.prepareAssignment(
      gymId,
      data,
    );

    let totalAmount = 0;
    const soldNames: string[] = [];

    for (const item of items) {
      const salePrice =
        item.type ===
        AccessCredentialType.CARD
          ? this.normalizeRequiredSalePrice(
              data.cardPrice,
              'Kart',
            )
          : this.normalizeRequiredSalePrice(
              data.qrPrice,
              'QR',
            );

      totalAmount += salePrice;

      soldNames.push(
        item.type ===
        AccessCredentialType.CARD
          ? 'Fiziksel Kart'
          : 'QR',
      );

      item.memberId = member.id;
      item.member = member;
      item.status =
        AccessCredentialStatus.ASSIGNED;
      item.assignedAt = new Date();
    }

    await this.accessCardRepository.save(
      items,
    );

    const soldCard = items.find(
      (item) =>
        item.type ===
        AccessCredentialType.CARD,
    );

    const soldQr = items.find(
      (item) =>
        item.type ===
        AccessCredentialType.QR,
    );

    if (soldCard) {
      await this.financeService.create(
        {
          title: 'Fiziksel Kart Satışı',
          amount:
            this.normalizeRequiredSalePrice(
              data.cardPrice,
              'Kart',
            ),
          type: 'income',
          category:
            FinanceCategory.CARD,
          description:
            data.description?.trim() ||
            `${this.getMemberName(
              member,
            )} adlı üyeye fiziksel kart satışı yapıldı.`,
        },
        gymId,
      );
    }

    if (soldQr) {
      await this.financeService.create(
        {
          title: 'QR Satışı',
          amount:
            this.normalizeRequiredSalePrice(
              data.qrPrice,
              'QR',
            ),
          type: 'income',
          category:
            FinanceCategory.QR,
          description:
            data.description?.trim() ||
            `${this.getMemberName(
              member,
            )} adlı üyeye QR satışı yapıldı.`,
        },
        gymId,
      );
    }

    return {
      message:
        'Satış tamamlandı ve finans gelirine eklendi.',
      totalAmount:
        Number(totalAmount.toFixed(2)),
      assignedItems: items,
    };
  }

  async unassignFromMember(
    gymId: string,
    id: string,
  ) {
    const item =
      await this.findOneForGym(
        gymId,
        id,
      );

    item.memberId = null;
    item.member = null;
    item.status =
      AccessCredentialStatus.AVAILABLE;
    item.assignedAt = null;

    return this.accessCardRepository.save(
      item,
    );
  }

  async updateStatusForGym(
    gymId: string,
    id: string,
    status: AccessCredentialStatus,
  ): Promise<AccessCard> {
    const item =
      await this.findOneForGym(
        gymId,
        id,
      );

    if (
      item.status ===
      AccessCredentialStatus.CONSUMED
    ) {
      throw new BadRequestException(
        'Tüketilmiş kart veya QR tekrar aktif hale getirilemez.',
      );
    }

    item.status =
      this.normalizeStatus(status);

    return this.accessCardRepository.save(
      item,
    );
  }

  async deleteForGym(
    gymId: string,
    id: string,
  ) {
    const item =
      await this.findOneForGym(
        gymId,
        id,
      );

    if (
      item.status ===
      AccessCredentialStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        'Üyeye atanmış ürün silinemez. Önce atamayı kaldırın.',
      );
    }

    await this.accessCardRepository.remove(
      item,
    );

    return {
      message:
        'Kart/QR kaydı başarıyla silindi.',
    };
  }

  async generateQrCode() {
    return {
      qrCode:
        `NOVAPLUS-QR-${randomUUID()}`,
    };
  }

  private normalizeCardCodes(
    data: BulkCreateStockData,
  ) {
    const fromArray =
      Array.isArray(data.codes)
        ? data.codes
        : [];

    const fromText = String(
      data.codesText || '',
    ).split(/\r?\n|,|;/);

    const codes = [
      ...fromArray,
      ...fromText,
    ]
      .map((value) =>
        String(value)
          .trim()
          .toUpperCase()
          .replace(/\s+/g, ''),
      )
      .filter(Boolean);

    const uniqueCodes = [
      ...new Set(codes),
    ];

    if (uniqueCodes.length === 0) {
      throw new BadRequestException(
        'En az bir hazır kart numarası girin.',
      );
    }

    if (uniqueCodes.length > 5000) {
      throw new BadRequestException(
        'Tek seferde en fazla 5000 kart tanımlanabilir.',
      );
    }

    for (const code of uniqueCodes) {
      if (code.length < 4) {
        throw new BadRequestException(
          `${code} geçerli bir kart numarası değil.`,
        );
      }
    }

    return uniqueCodes;
  }

  private async prepareAssignment(
    gymId: string,
    data: AssignCredentialData,
  ) {
    const memberId = Number(
      data.memberId,
    );

    if (
      !Number.isInteger(memberId) ||
      memberId <= 0
    ) {
      throw new BadRequestException(
        'Geçerli bir üye seçin.',
      );
    }

    const member =
      await this.findMemberForGym(
        gymId,
        memberId,
      );

    const ids = [
      data.cardId,
      data.qrId,
    ].filter(
      (value): value is string =>
        Boolean(value),
    );

    if (ids.length === 0) {
      throw new BadRequestException(
        'Kart veya QR seçmelisiniz.',
      );
    }

    const items =
      await this.accessCardRepository.find({
        where: {
          id: In(ids),
          gymId,
        },
      });

    if (items.length !== ids.length) {
      throw new NotFoundException(
        'Seçilen kart veya QR bulunamadı.',
      );
    }

    for (const item of items) {
      if (
        item.status !==
        AccessCredentialStatus.AVAILABLE
      ) {
        throw new BadRequestException(
          `${item.code} kullanılabilir durumda değil.`,
        );
      }

      if (
        data.cardId === item.id &&
        item.type !==
          AccessCredentialType.CARD
      ) {
        throw new BadRequestException(
          'Kart alanında QR seçilemez.',
        );
      }

      if (
        data.qrId === item.id &&
        item.type !==
          AccessCredentialType.QR
      ) {
        throw new BadRequestException(
          'QR alanında kart seçilemez.',
        );
      }
    }

    return {
      member,
      items,
    };
  }

  private async findOneForGym(
    gymId: string,
    id: string,
  ) {
    const item =
      await this.accessCardRepository.findOne({
        where: {
          id,
          gymId,
        },
        relations: {
          member: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Kart/QR kaydı bulunamadı.',
      );
    }

    return item;
  }

  private async findMemberForGym(
    gymId: string,
    memberId: number,
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

    return member;
  }

  private getMemberName(
    member: Member,
  ) {
    return (
      member.fullName ||
      member.name ||
      `Üye #${member.id}`
    );
  }

  private normalizeType(
    value?: AccessCredentialType,
  ) {
    if (
      value ===
        AccessCredentialType.CARD ||
      value === AccessCredentialType.QR
    ) {
      return value;
    }

    throw new BadRequestException(
      'Ürün türü CARD veya QR olmalıdır.',
    );
  }

  private normalizeStatus(
    value?: AccessCredentialStatus,
  ) {
    if (
      value &&
      Object.values(
        AccessCredentialStatus,
      ).includes(value)
    ) {
      return value;
    }

    throw new BadRequestException(
      'Geçersiz kart/QR durumu.',
    );
  }

  private normalizeCode(
    type: AccessCredentialType,
    value?: string,
  ) {
    const normalized = String(
      value || '',
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

    if (normalized) {
      return normalized;
    }

    if (
      type === AccessCredentialType.QR
    ) {
      return `NOVAPLUS-QR-${randomUUID()}`;
    }

    throw new BadRequestException(
      'Fiziksel kart numarası zorunludur.',
    );
  }

  private normalizePrice(
    value?: number,
  ) {
    const price = Number(value || 0);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new BadRequestException(
        'Fiyat sıfırdan küçük olamaz.',
      );
    }

    return Number(price.toFixed(2));
  }

  private normalizeRequiredSalePrice(
    value: number | undefined,
    label: string,
  ) {
    const price = Number(value);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw new BadRequestException(
        `${label} satış fiyatı sıfırdan büyük olmalıdır.`,
      );
    }

    return Number(price.toFixed(2));
  }

  private async ensureCodeAvailable(
    gymId: string,
    code: string,
    ignoredId?: string,
  ) {
    const existing =
      await this.accessCardRepository.findOne({
        where: {
          gymId,
          code,
        },
      });

    if (
      existing &&
      existing.id !== ignoredId
    ) {
      throw new BadRequestException(
        'Bu kod bu salonda zaten kullanılıyor.',
      );
    }
  }
}
