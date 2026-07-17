import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { PackageService } from './package.service';

@Controller(
  'super-admin/gyms/:gymId/packages',
)
export class SuperAdminPackagesController {
  constructor(
    private readonly packageService:
      PackageService,
  ) {}

  @Get()
  findAll(
    @Param('gymId') gymId: string,
  ) {
    return this.packageService
      .getPackagesByGym(gymId);
  }

  @Post()
  create(
    @Param('gymId') gymId: string,
    @Body() body: any,
  ) {
    return this.packageService
      .createPackage(body, gymId);
  }

  @Put(':id')
  update(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.packageService
      .updatePackage(
        id,
        gymId,
        body,
      );
  }

  @Delete(':id')
  delete(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
  ) {
    return this.packageService
      .deletePackage(id, gymId);
  }
}
