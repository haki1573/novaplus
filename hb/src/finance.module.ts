import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogModule } from './audit-log/audit-log.module';

import { Finance } from './finance.entity';
import { FinanceController } from './finance.controller';
import { SuperAdminFinanceController } from './super-admin-finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Finance,
    ]),
    AuditLogModule,
  ],

  controllers: [
    FinanceController,
    SuperAdminFinanceController,
  ],

  providers: [
    FinanceService,
  ],

  exports: [
    FinanceService,
  ],
})
export class FinanceModule {}
