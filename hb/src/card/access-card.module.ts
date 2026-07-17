import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Member } from '../member/member.entity';
import { Gym } from '../gym/gym.entity';
import { FinanceModule } from '../finance.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

import { AccessCard } from './access-card.entity';
import { AccessCardService } from './access-card.service';
import {
  SuperAdminAccessCardController,
  SuperAdminCentralCardsController,
} from './super-admin-access-card.controller';
import { GymAccessCardController } from './gym-access-card.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccessCard,
      Member,
      Gym,
    ]),
    FinanceModule,
    AuditLogModule,
  ],

  controllers: [
    SuperAdminAccessCardController,
    SuperAdminCentralCardsController,
    GymAccessCardController,
  ],

  providers: [
    AccessCardService,
  ],

  exports: [
    AccessCardService,
  ],
})
export class AccessCardModule {}
