import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnalyticsModule } from '../analytics.module';
import { AuthModule } from '../auth/auth.module';
import { AccessCardModule } from '../card/access-card.module';
import { CheckIn } from '../check-in/check-in.entity';
import { LockerModule } from '../locker/locker.module';
import { NotificationModule } from '../notification/notification.module';
import { NovaAiModule } from '../nova-ai/nova-ai.module';
import { SmsModule } from '../sms/sms.module';
import { StaffAttendance } from '../staff/staff-attendance.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { CafeSale } from '../wallet-cafe/cafe-sale.entity';
import { WalletCafeModule } from '../wallet-cafe/wallet-cafe.module';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      StaffAttendance,
      CafeSale,
      CheckIn,
    ]),

    AuthModule,
    AnalyticsModule,
    AccessCardModule,
    LockerModule,
    NotificationModule,
    NovaAiModule,
    SmsModule,
    WalletCafeModule,
  ],

  controllers: [
    DashboardController,
  ],

  providers: [
    DashboardService,
  ],

  exports: [
    DashboardService,
  ],
})
export class DashboardModule {}
