import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

import { CheckIn } from './check-in/check-in.entity';
import { Member } from './member/member.entity';
import { Package } from './package.entity';
import { Finance } from './finance.entity';
import { SuperAdminModule } from './super-admin/super-admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckIn,
      Member,
      Package,
      Finance,
    ]),
    SuperAdminModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}