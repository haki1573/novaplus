import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Member } from './member.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';

import { Package } from '../package.entity';
import { Finance } from '../finance.entity';
import { MemberWallet } from '../wallet-cafe/member-wallet.entity';
import { AccessCard } from '../card/access-card.entity';
import { CheckIn } from '../check-in/check-in.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      Package,
      Finance,
      MemberWallet,
      AccessCard,
      CheckIn,
    ]),
  ],

  controllers: [
    MemberController,
  ],

  providers: [
    MemberService,
  ],

  exports: [
    MemberService,
  ],
})
export class MemberModule {}
