import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { SuperAdminService } from './super-admin.service';

@Controller(
  'super-admin/gyms/:gymId/staff',
)
export class SuperAdminStaffController {
  constructor(
    private readonly superAdminService:
      SuperAdminService,
  ) {}

  @Get()
  getStaff(
    @Param('gymId') gymId: string,
  ) {
    return this.superAdminService
      .getGymStaff(gymId);
  }

  @Post()
  createStaff(
    @Param('gymId') gymId: string,
    @Body() body: any,
  ) {
    return this.superAdminService
      .createGymStaff(gymId, body);
  }

  @Patch(':userId')
  updateStaff(
    @Param('gymId') gymId: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.superAdminService
      .updateGymStaff(
        gymId,
        userId,
        body,
      );
  }

  @Patch(':userId/status')
  updateStaffStatus(
    @Param('gymId') gymId: string,
    @Param('userId') userId: string,
    @Body() body: {
      isActive: boolean;
    },
  ) {
    return this.superAdminService
      .updateGymStaffStatus(
        gymId,
        userId,
        body.isActive,
      );
  }

  @Delete(':userId')
  deleteStaff(
    @Param('gymId') gymId: string,
    @Param('userId') userId: string,
  ) {
    return this.superAdminService
      .deleteGymStaff(
        gymId,
        userId,
      );
  }
}
