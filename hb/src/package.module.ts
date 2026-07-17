import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Package } from './package.entity';
import { PackageController } from './package.controller';
import { SuperAdminPackagesController } from './super-admin-packages.controller';
import { PackageService } from './package.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Package,
    ]),
  ],
  controllers: [
    PackageController,
    SuperAdminPackagesController,
  ],
  providers: [PackageService],
  exports: [PackageService],
})
export class PackageModule {}
