import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { Member } from '../member/member.entity';
import { FinanceService } from '../finance.service';
import { FinanceCategory } from '../finance.entity';

import { MemberWallet } from './member-wallet.entity';
import {
  WalletTransaction,
  WalletTransactionType,
} from './wallet-transaction.entity';
import {
  CafeDrinkCategory,
  CafeProduct,
} from './cafe-product.entity';
import {
  CafePaymentMethod,
  CafeSale,
} from './cafe-sale.entity';
import { CafeSaleItem } from './cafe-sale-item.entity';
import { RealtimeService } from '../realtime/realtime.service';

interface ProductInput {
  name?: string;
  category?: CafeDrinkCategory;
  organizationId?: string | null;
  salePrice?: number;
  stockQuantity?: number;
  lowStockLimit?: number;
  barcode?: string | null;
  isActive?: boolean;
}

interface SaleItemInput {
  productId?: string;
  quantity?: number;
}

interface CreateSaleInput {
  memberId?: number;
  organizationId?: string | null;
  paymentMethod?: CafePaymentMethod;
  items?: SaleItemInput[];
  note?: string;
}

@Injectable()
export class WalletCafeService {
  constructor(
    @InjectRepository(MemberWallet)
    private readonly walletRepository:
      Repository<MemberWallet>,

    @InjectRepository(WalletTransaction)
    private readonly transactionRepository:
      Repository<WalletTransaction>,

    @InjectRepository(CafeProduct)
    private readonly productRepository:
      Repository<CafeProduct>,

    @InjectRepository(CafeSale)
    private readonly saleRepository:
      Repository<CafeSale>,

    @InjectRepository(CafeSaleItem)
    private readonly saleItemRepository:
      Repository<CafeSaleItem>,

    @InjectRepository(Member)
    private readonly memberRepository:
      Repository<Member>,

    private readonly financeService:
      FinanceService,

    private readonly dataSource:
      DataSource,

    private readonly realtimeService:
      RealtimeService,
  ) {}

  async getSummary(
    gymId: string,
  ) {
    const [
      wallets,
      products,
      todaySales,
    ] = await Promise.all([
      this.walletRepository.find({
        where: {
          gymId,
        },
      }),

      this.productRepository.find({
        where: {
          gymId,
        },
      }),

      this.saleRepository.find({
        where: {
          gymId,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 500,
      }),
    ]);

    const totalBalance =
      wallets.reduce(
        (sum, wallet) =>
          sum +
          Number(wallet.balance || 0),
        0,
      );

    const walletsWithBalance =
      wallets.filter(
        (wallet) =>
          Number(wallet.balance || 0) > 0,
      );

    const activeProducts =
      products.filter(
        (product) =>
          product.isActive,
      );

    const lowStockProducts =
      activeProducts.filter(
        (product) =>
          Number(
            product.stockQuantity || 0,
          ) <=
          Number(
            product.lowStockLimit || 0,
          ),
      );

    const totalStock =
      activeProducts.reduce(
        (sum, product) =>
          sum +
          Number(
            product.stockQuantity || 0,
          ),
        0,
      );

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

    const todaysSales =
      todaySales.filter(
        (sale) => {
          const createdAt =
            new Date(
              sale.createdAt,
            );

          return (
            createdAt >= todayStart &&
            createdAt <= todayEnd
          );
        },
      );

    const todayRevenue =
      todaysSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.totalAmount || 0,
          ),
        0,
      );

    return {
      wallet: {
        totalBalance:
          Number(
            totalBalance.toFixed(2),
          ),
        memberCount:
          walletsWithBalance.length,
        totalWallets:
          wallets.length,
        averageBalance:
          walletsWithBalance.length > 0
            ? Number(
                (
                  totalBalance /
                  walletsWithBalance.length
                ).toFixed(2),
              )
            : 0,
      },

      cafe: {
        totalProducts:
          products.length,
        activeProducts:
          activeProducts.length,
        lowStockProducts:
          lowStockProducts.length,
        totalStock,
        todaySales:
          todaysSales.length,
        todayRevenue:
          Number(
            todayRevenue.toFixed(2),
          ),
      },
    };
  }

  async getMemberWallet(
    gymId: string,
    memberId: number,
  ) {
    const member =
      await this.findMemberForGym(
        gymId,
        memberId,
      );

    let wallet =
      await this.walletRepository.findOne({
        where: {
          gymId,
          memberId,
        },
      });

    if (!wallet) {
      wallet =
        await this.walletRepository.save(
          this.walletRepository.create({
            gymId,
            organizationId: null,
            memberId,
            member,
            balance: 0,
          }),
        );
    }

    const transactions =
      await this.transactionRepository.find({
        where: {
          gymId,
          memberId,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 100,
      });

    return {
      wallet,
      member: {
        id: member.id,
        fullName:
          member.fullName ||
          member.name,
        phone: member.phone,
      },
      transactions,
    };
  }

  async topUp(
    gymId: string,
    memberId: number,
    rawAmount: number,
    description?: string,
  ) {
    const amount =
      this.normalizePositiveMoney(
        rawAmount,
        'Yüklenecek bakiye',
      );

    const member =
      await this.findMemberForGym(
        gymId,
        memberId,
      );

    const result =
      await this.dataSource.transaction(
        async (manager) => {
          const walletRepo =
            manager.getRepository(
              MemberWallet,
            );

          const transactionRepo =
            manager.getRepository(
              WalletTransaction,
            );

          let wallet =
            await walletRepo.findOne({
              where: {
                gymId,
                memberId,
              },
            });

          if (!wallet) {
            wallet = walletRepo.create({
              gymId,
              memberId,
              member,
              balance: 0,
            });
          }

          const before =
            Number(wallet.balance || 0);

          wallet.balance =
            Number(
              (before + amount).toFixed(2),
            );

          const savedWallet =
            await walletRepo.save(wallet);

          const transaction =
            transactionRepo.create({
              gymId,
              organizationId:
                savedWallet.organizationId,
              memberId,
              type:
                WalletTransactionType.TOP_UP,
              amount,
              balanceBefore: before,
              balanceAfter:
                savedWallet.balance,
              description:
                description?.trim() ||
                'Üye bakiyesi yüklendi.',
              referenceId: null,
            });

          await transactionRepo.save(
            transaction,
          );

          return {
            wallet: savedWallet,
            transaction,
          };
        },
      );

    // Para kasaya bakiye yükleme anında girer.
    // Bu nedenle finans geliri burada bir kez oluşturulur.
    await this.financeService.create(
      {
        title: 'Üye Cüzdan Yüklemesi',
        amount,
        type: 'income',
        category:
          FinanceCategory.WALLET,
        description:
          description?.trim() ||
          `${member.fullName || member.name} için cüzdan yüklemesi`,
      },
      gymId,
    );

    this.realtimeService.emit(
      gymId,
      'wallet:topup',
      result.transaction.id,
    );

    return {
      message:
        'Bakiye başarıyla yüklendi.',
      ...result,
    };
  }

  async getProducts(
    gymId: string,
  ) {
    return this.productRepository.find({
      where: {
        gymId,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async createProduct(
    gymId: string,
    input: ProductInput,
  ) {
    const name =
      String(input.name || '').trim();

    if (!name) {
      throw new BadRequestException(
        'Ürün adı zorunludur.',
      );
    }

    const existing =
      await this.productRepository.findOne({
        where: {
          gymId,
          name,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Bu isimde bir ürün zaten var.',
      );
    }

    const product =
      this.productRepository.create({
        gymId,
        organizationId:
          input.organizationId || null,
        name,
        category:
          input.category &&
          Object.values(
            CafeDrinkCategory,
          ).includes(
            input.category,
          )
            ? input.category
            : CafeDrinkCategory.OTHER,
        salePrice:
          this.normalizePositiveMoney(
            input.salePrice,
            'Satış fiyatı',
          ),
        stockQuantity:
          this.normalizeNonNegativeInteger(
            input.stockQuantity,
            'Stok miktarı',
          ),
        lowStockLimit:
          this.normalizeNonNegativeInteger(
            input.lowStockLimit ?? 5,
            'Düşük stok sınırı',
          ),
        barcode:
          input.barcode?.trim() || null,
        isActive:
          input.isActive !== false,
      });

    return this.productRepository.save(
      product,
    );
  }

  async updateProduct(
    gymId: string,
    id: string,
    input: ProductInput,
  ) {
    const product =
      await this.productRepository.findOne({
        where: {
          id,
          gymId,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Ürün bulunamadı.',
      );
    }

    if (input.name !== undefined) {
      const name =
        input.name.trim();

      if (!name) {
        throw new BadRequestException(
          'Ürün adı boş olamaz.',
        );
      }

      product.name = name;
    }

    if (
      input.category !== undefined
    ) {
      if (
        !Object.values(
          CafeDrinkCategory,
        ).includes(
          input.category,
        )
      ) {
        throw new BadRequestException(
          'Geçersiz içecek kategorisi.',
        );
      }

      product.category =
        input.category;
    }

    if (
      input.salePrice !== undefined
    ) {
      product.salePrice =
        this.normalizePositiveMoney(
          input.salePrice,
          'Satış fiyatı',
        );
    }

    if (
      input.stockQuantity !== undefined
    ) {
      product.stockQuantity =
        this.normalizeNonNegativeInteger(
          input.stockQuantity,
          'Stok miktarı',
        );
    }

    if (
      input.lowStockLimit !== undefined
    ) {
      product.lowStockLimit =
        this.normalizeNonNegativeInteger(
          input.lowStockLimit,
          'Düşük stok sınırı',
        );
    }

    if (input.barcode !== undefined) {
      product.barcode =
        input.barcode?.trim() || null;
    }

    if (
      typeof input.isActive ===
      'boolean'
    ) {
      product.isActive =
        input.isActive;
    }

    return this.productRepository.save(
      product,
    );
  }

  async createSale(
    gymId: string,
    input: CreateSaleInput,
  ) {
    const items =
      Array.isArray(input.items)
        ? input.items
        : [];

    if (items.length === 0) {
      throw new BadRequestException(
        'Sepette en az bir ürün olmalıdır.',
      );
    }

    const paymentMethod =
      CafePaymentMethod.MEMBER_BALANCE;

    if (
      input.paymentMethod &&
      input.paymentMethod !==
        CafePaymentMethod.MEMBER_BALANCE
    ) {
      throw new BadRequestException(
        'Nova Café satışlarında yalnızca üye cüzdanı kullanılabilir.',
      );
    }

    const memberId =
      input.memberId !== undefined
        ? Number(input.memberId)
        : null;

    if (
      paymentMethod ===
        CafePaymentMethod.MEMBER_BALANCE &&
      (!memberId ||
        !Number.isInteger(memberId))
    ) {
      throw new BadRequestException(
        'Bakiyeden tahsilat için üye seçin.',
      );
    }

    const member = memberId
      ? await this.findMemberForGym(
          gymId,
          memberId,
        )
      : null;

    const saleResult =
      await this.dataSource.transaction(
        async (manager) => {
          const productRepo =
            manager.getRepository(
              CafeProduct,
            );

          const saleRepo =
            manager.getRepository(CafeSale);

          const itemRepo =
            manager.getRepository(
              CafeSaleItem,
            );

          const walletRepo =
            manager.getRepository(
              MemberWallet,
            );

          const walletTransactionRepo =
            manager.getRepository(
              WalletTransaction,
            );

          const preparedItems: Array<{
            product: CafeProduct;
            quantity: number;
            totalPrice: number;
          }> = [];

          let totalAmount = 0;

          for (const rawItem of items) {
            const productId =
              String(
                rawItem.productId || '',
              );

            const quantity =
              this.normalizePositiveInteger(
                rawItem.quantity,
                'Ürün adedi',
              );

            const product =
              await productRepo.findOne({
                where: {
                  id: productId,
                  gymId,
                  isActive: true,
                },
              });

            if (!product) {
              throw new NotFoundException(
                'Sepetteki ürünlerden biri bulunamadı.',
              );
            }

            if (
              product.stockQuantity <
              quantity
            ) {
              throw new BadRequestException(
                `${product.name} için yeterli stok yok.`,
              );
            }

            const totalPrice =
              Number(
                (
                  Number(
                    product.salePrice,
                  ) * quantity
                ).toFixed(2),
              );

            totalAmount += totalPrice;

            preparedItems.push({
              product,
              quantity,
              totalPrice,
            });
          }

          totalAmount =
            Number(totalAmount.toFixed(2));

          let walletAfter:
            | MemberWallet
            | null = null;

          const sale =
            await saleRepo.save(
              saleRepo.create({
                gymId,
                organizationId:
                  input.organizationId ||
                  null,
                memberId,
                totalAmount,
                paymentMethod,
                note:
                  input.note?.trim() ||
                  null,
              }),
            );

          for (const prepared of preparedItems) {
            prepared.product.stockQuantity -=
              prepared.quantity;

            await productRepo.save(
              prepared.product,
            );

            await itemRepo.save(
              itemRepo.create({
                saleId: sale.id,
                productId:
                  prepared.product.id,
                productName:
                  prepared.product.name,
                quantity:
                  prepared.quantity,
                unitPrice:
                  prepared.product
                    .salePrice,
                totalPrice:
                  prepared.totalPrice,
              }),
            );
          }

          if (
            paymentMethod ===
            CafePaymentMethod.MEMBER_BALANCE
          ) {
            const wallet =
              await walletRepo.findOne({
                where: {
                  gymId,
                  memberId:
                    memberId as number,
                },
              });

            if (!wallet) {
              throw new BadRequestException(
                'Üyenin cüzdanı bulunamadı.',
              );
            }

            const before =
              Number(wallet.balance || 0);

            if (before < totalAmount) {
              throw new BadRequestException(
                'Üye bakiyesi yetersiz.',
              );
            }

            wallet.balance =
              Number(
                (
                  before - totalAmount
                ).toFixed(2),
              );

            walletAfter =
              await walletRepo.save(wallet);

            await walletTransactionRepo.save(
              walletTransactionRepo.create({
                gymId,
                organizationId:
                  wallet.organizationId,
                memberId:
                  memberId as number,
                type:
                  WalletTransactionType.PURCHASE,
                amount: totalAmount,
                balanceBefore: before,
                balanceAfter:
                  walletAfter.balance,
                description:
                  input.note?.trim() ||
                  'Kafe alışverişi',
                referenceId: sale.id,
              }),
            );
          }

          return {
            sale,
            walletAfter,
          };
        },
      );

    await this.financeService.create(
      {
        title: 'Nova Café Satışı',
        amount: Number(saleResult.sale.totalAmount || 0),
        type: 'income',
        category: FinanceCategory.CAFE,
        description: member
          ? `${member.fullName || member.name} adına Nova Café satışı`
          : 'Nova Café satışı',
      },
      gymId,
    );

    this.realtimeService.emit(
      gymId,
      'cafe:sale',
      saleResult.sale.id,
    );

    // Kafe satışı finans hareketi olarak kaydedilir.
    return {
      message:
        'Satış başarıyla tamamlandı.',
      ...saleResult,
    };
  }


  async getFavoriteProducts(
    gymId: string,
  ) {
    const since =
      new Date();

    since.setDate(
      since.getDate() - 30,
    );

    const sales =
      await this.saleRepository.find({
        where: {
          gymId,
          createdAt:
            MoreThanOrEqual(since),
        },
        order: {
          createdAt: 'DESC',
        },
      });

    if (sales.length === 0) {
      return this.productRepository.find({
        where: {
          gymId,
          isActive: true,
        },
        order: {
          stockQuantity: 'DESC',
        },
        take: 8,
      });
    }

    const items =
      await this.saleItemRepository.find({
        where: {
          saleId: In(
            sales.map(
              (sale) => sale.id,
            ),
          ),
        },
      });

    const totals =
      new Map<string, number>();

    for (const item of items) {
      totals.set(
        item.productId,
        (
          totals.get(item.productId) ||
          0
        ) + Number(item.quantity || 0),
      );
    }

    const ids =
      [...totals.entries()]
        .sort(
          (a, b) =>
            b[1] - a[1],
        )
        .slice(0, 8)
        .map(([id]) => id);

    if (ids.length === 0) {
      return [];
    }

    const products =
      await this.productRepository.find({
        where: {
          id: In(ids),
          gymId,
          isActive: true,
        },
      });

    return ids
      .map(
        (id) =>
          products.find(
            (product) =>
              product.id === id,
          ),
      )
      .filter(
        (
          product,
        ): product is CafeProduct =>
          Boolean(product),
      );
  }

  async getLowStockProducts(
    gymId: string,
  ) {
    const products =
      await this.productRepository.find({
        where: {
          gymId,
          isActive: true,
        },
        order: {
          stockQuantity: 'ASC',
        },
      });

    return products.filter(
      (product) =>
        Number(
          product.stockQuantity || 0,
        ) <=
        Number(
          product.lowStockLimit || 0,
        ),
    );
  }

  async getSales(
    gymId: string,
  ) {
    return this.saleRepository.find({
      where: {
        gymId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 200,
    });
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

  private normalizePositiveMoney(
    value: number | undefined,
    label: string,
  ) {
    const amount = Number(value);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }

    return Number(amount.toFixed(2));
  }

  private normalizeNonNegativeInteger(
    value: number | undefined,
    label: string,
  ) {
    const numberValue =
      Number(value ?? 0);

    if (
      !Number.isInteger(numberValue) ||
      numberValue < 0
    ) {
      throw new BadRequestException(
        `${label} sıfır veya daha büyük tam sayı olmalıdır.`,
      );
    }

    return numberValue;
  }

  private normalizePositiveInteger(
    value: number | undefined,
    label: string,
  ) {
    const numberValue = Number(value);

    if (
      !Number.isInteger(numberValue) ||
      numberValue <= 0
    ) {
      throw new BadRequestException(
        `${label} sıfırdan büyük tam sayı olmalıdır.`,
      );
    }

    return numberValue;
  }
}
