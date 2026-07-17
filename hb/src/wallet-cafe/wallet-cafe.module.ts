import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Member } from '../member/member.entity';
import { FinanceModule } from '../finance.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

import { MemberWallet } from './member-wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { CafeProduct } from './cafe-product.entity';
import { CafeSale } from './cafe-sale.entity';
import { CafeSaleItem } from './cafe-sale-item.entity';

import { WalletCafeService } from './wallet-cafe.service';
import { WalletCafeController } from './wallet-cafe.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      MemberWallet,
      WalletTransaction,
      CafeProduct,
      CafeSale,
      CafeSaleItem,
    ]),
    FinanceModule,
    AuditLogModule,
  ],

  controllers: [
    WalletCafeController,
  ],

  providers: [
    WalletCafeService,
  ],

  exports: [
    WalletCafeService,
  ],
})
export class WalletCafeModule {}
