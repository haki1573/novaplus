import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entity
import { User } from './user.entity';
import { Gym } from './gym/gym.entity';
import { Package } from './package.entity';
import { Member } from './member/member.entity';
import { CheckIn } from './check-in/check-in.entity';
import { Finance } from './finance.entity';
import { AccessCard } from './card/access-card.entity';
import { MemberWallet } from './wallet-cafe/member-wallet.entity';
import { WalletTransaction } from './wallet-cafe/wallet-transaction.entity';
import { CafeProduct } from './wallet-cafe/cafe-product.entity';
import { CafeSale } from './wallet-cafe/cafe-sale.entity';
import { CafeSaleItem } from './wallet-cafe/cafe-sale-item.entity';
import { SmsPackage } from './sms/sms-package.entity';
import { GymSmsBalance } from './sms/gym-sms-balance.entity';
import { SmsHistory } from './sms/sms-history.entity';
import { Locker } from './locker/locker.entity';
import { LockerHistory } from './locker/locker-history.entity';
import { Notification } from './notification/notification.entity';
import { SmsPurchase } from './sms/sms-purchase.entity';
import { Staff } from './staff/staff.entity';
import { StaffAttendance } from './staff/staff-attendance.entity';
import { StaffPermission } from './staff/staff-permission.entity';
import { AuditLog } from './audit-log/audit-log.entity';
import { GymLicensePayment } from './super-admin/gym-license-payment.entity';
import { Organization } from './organization/organization.entity';
import { OrganizationUser } from './organization/organization-user.entity';
import { UserGymAccess } from './organization/user-gym-access.entity';
import { Turnstile } from './turnstile/turnstile.entity';
import { TurnstileEvent } from './turnstile/turnstile-event.entity';
import { Device } from './device/device.entity';
import { DeviceEvent } from './device-event/device-event.entity';

// Modules
import { AuthModule } from './auth/auth.module';
import { GymModule } from './gym/gym.module';
import { PackageModule } from './package.module';
import { MemberModule } from './member/member.module';
import { CheckInModule } from './check-in/check-in.module';
import { AnalyticsModule } from './analytics.module';
import { FinanceModule } from './finance.module';
import { AccessCardModule } from './card/access-card.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SetupModule } from './setup/setup.module';
import { WalletCafeModule } from './wallet-cafe/wallet-cafe.module';
import { SmsModule } from './sms/sms.module';
import { LockerModule } from './locker/locker.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StaffModule } from './staff/staff.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NovaAiModule } from './nova-ai/nova-ai.module';
import { TurnstileModule } from './turnstile/turnstile.module';
import { DeviceModule } from './device/device.module';
import { DeviceEventModule } from './device-event/device-event.module';
import { BackupModule } from './backup/backup.module';
import { RealtimeModule } from './realtime/realtime.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'database.db',
      enableWAL: true,
      statementCacheSize: 200,
      logging: false,

      entities: [
        User,
        Gym,
        Package,
        Member,
        CheckIn,
        Finance,
        AccessCard,
        MemberWallet,
        WalletTransaction,
        CafeProduct,
        CafeSale,
        CafeSaleItem,
        SmsPackage,
        GymSmsBalance,
        SmsHistory,
        Locker,
        LockerHistory,
        Notification,
        SmsPurchase,
        Staff,
        StaffAttendance,
        StaffPermission,
        AuditLog,
        GymLicensePayment,
        Organization,
        OrganizationUser,
        UserGymAccess,
        Turnstile,
        TurnstileEvent,
        Device,
        DeviceEvent,
      ],

      synchronize: true,
    }),

    AuthModule,
    GymModule,
    PackageModule,
    MemberModule,
    CheckInModule,
    AnalyticsModule,
    FinanceModule,
    AccessCardModule,
    SuperAdminModule,
    SetupModule,
    WalletCafeModule,
    SmsModule,
    LockerModule,
    NotificationModule,
    DashboardModule,
    StaffModule,
    ReportsModule,
    AuditLogModule,
    NovaAiModule,
    TurnstileModule,
    DeviceModule,
    DeviceEventModule,
    BackupModule,
    RealtimeModule,
    DemoModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}
