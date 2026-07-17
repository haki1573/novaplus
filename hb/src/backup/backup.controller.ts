import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../user.entity';
import { BackupService } from './backup.service';

@Controller('super-admin/backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}
  @Get() list() { return this.backupService.listBackups(); }
  @Get('overview') overview() { return this.backupService.getOverview(); }
  @Post() create() { return this.backupService.createBackup('MANUAL'); }
  @Post(':filename/validate') validate(@Param('filename') filename: string) { return this.backupService.validateBackup(filename); }
  @Post(':filename/restore') restore(@Param('filename') filename: string) { return this.backupService.restoreBackup(filename); }
  @Delete(':filename') remove(@Param('filename') filename: string) { return this.backupService.deleteBackup(filename); }
}
