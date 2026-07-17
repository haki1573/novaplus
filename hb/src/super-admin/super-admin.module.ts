import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SuperAdminController } from './super-admin.controller';
import { SuperAdminStaffController } from './super-admin-staff.controller';
import { SuperAdminService } from './super-admin.service';

import { Gym } from '../gym/gym.entity';
import { User } from '../user.entity';
import { AuthModule } from '../auth/auth.module';
import { GymLicensePayment } from './gym-license-payment.entity';
import { AccessCard } from '../card/access-card.entity';
import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import { Organization } from '../organization/organization.entity';
import { OrganizationUser } from '../organization/organization-user.entity';
import { UserGymAccess } from '../organization/user-gym-access.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Gym,
      User,
      GymLicensePayment,
      AccessCard,
      GymSmsBalance,
      Organization,
      OrganizationUser,
      UserGymAccess,
    ]),
    AuthModule,
  ],

  controllers: [
    SuperAdminController,
    SuperAdminStaffController,
  ],

  providers: [
    SuperAdminService,
  ],

  exports: [
    SuperAdminService,
  ],
})
export class SuperAdminModule {}
