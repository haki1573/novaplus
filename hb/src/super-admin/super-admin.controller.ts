import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SuperAdminService } from './super-admin.service';

import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { UserRole } from '../user.entity';
import {
  GymBillingCycle,
  GymLicenseStatus,
  GymSubscriptionPlan,
} from '../gym/gym.entity';

@Controller('super-admin')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(
    private readonly superAdminService:
      SuperAdminService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.superAdminService
      .getDashboardStats();
  }

  @Get('gyms')
  getGyms() {
    return this.superAdminService
      .getAllGyms();
  }

  @Get('gyms/:id')
  getGym(
    @Param('id') id: string,
  ) {
    return this.superAdminService
      .getGymById(id);
  }

  @Post('gyms')
  createGym(
    @Body() dto: CreateGymDto,
  ) {
    return this.superAdminService
      .createGym(dto);
  }

  @Patch('gyms/:id')
  updateGym(
    @Param('id') id: string,
    @Body() dto: UpdateGymDto,
  ) {
    return this.superAdminService
      .updateGym(id, dto);
  }

  @Patch('gyms/:id/status')
  updateGymStatus(
    @Param('id') id: string,
    @Body() body: {
      isActive: boolean;
    },
  ) {
    return this.superAdminService
      .updateGymStatus(
        id,
        body.isActive,
      );
  }

  @Get('licenses/overview')
  getLicenseOverview() {
    return this.superAdminService
      .getLicenseOverview();
  }

  @Patch('gyms/:id/license')
  updateGymLicense(
    @Param('id') id: string,
    @Body()
    body: {
      subscriptionPlan?:
        GymSubscriptionPlan;
      licenseStatus?:
        GymLicenseStatus;
      billingCycle?:
        GymBillingCycle;
      licenseStartDate?:
        string | null;
      licenseEndDate?:
        string | null;
      trialEndDate?:
        string | null;
      lastPaymentDate?:
        string | null;
      nextPaymentDate?:
        string | null;
    },
  ) {
    return this.superAdminService
      .updateGymLicense(
        id,
        body,
      );
  }

  @Get('gyms/:id/license-payments')
  getLicensePayments(
    @Param('id') id: string,
  ) {
    return this.superAdminService
      .getLicensePayments(id);
  }

  @Post('gyms/:id/license-payments')
  addLicensePayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.superAdminService
      .addLicensePayment(
        id,
        req.user?.id ||
          req.user?.sub ||
          null,
        body,
      );
  }

  @Get('cloud-dashboard')
  getCloudDashboard() {
    return this.superAdminService
      .getCloudDashboard();
  }


  @Get('organizations')
  getOrganizations() {
    return this.superAdminService
      .getOrganizations();
  }

  @Post('organizations')
  createOrganization(
    @Body() body: any,
  ) {
    return this.superAdminService
      .createOrganization(body);
  }

  @Patch(
    'organizations/:organizationId/gyms/:gymId',
  )
  assignGymToOrganization(
    @Param('organizationId')
    organizationId: string,
    @Param('gymId')
    gymId: string,
  ) {
    return this.superAdminService
      .assignGymToOrganization(
        organizationId,
        gymId,
      );
  }

  @Patch(
    'organizations/:organizationId/gyms/:gymId/remove',
  )
  removeGymFromOrganization(
    @Param('organizationId')
    organizationId: string,
    @Param('gymId')
    gymId: string,
  ) {
    return this.superAdminService
      .removeGymFromOrganization(
        organizationId,
        gymId,
      );
  }

  @Post(
    'organizations/:organizationId/users',
  )
  assignOrganizationUser(
    @Param('organizationId')
    organizationId: string,
    @Body() body: any,
  ) {
    return this.superAdminService
      .assignOrganizationUser(
        organizationId,
        body,
      );
  }

  @Post(
    'users/:userId/gym-access',
  )
  grantUserGymAccess(
    @Param('userId')
    userId: string,
    @Body() body: any,
  ) {
    return this.superAdminService
      .grantUserGymAccess(
        userId,
        body,
      );
  }

}