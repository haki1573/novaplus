import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { UserRole } from './user.entity';

import { PackageService } from './package.service';

@Controller('packages')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class PackageController {
  constructor(
    private readonly packageService: PackageService,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    return this.packageService.getPackagesByGym(
      req.user.gymId,
    );
  }

  @Post()
  create(
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.packageService.createPackage(
      body,
      req.user.gymId,
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.packageService.updatePackage(
      id,
      req.user.gymId,
      body,
    );
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.packageService.deletePackage(
      id,
      req.user.gymId,
    );
  }
}