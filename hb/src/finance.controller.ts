import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { UserRole } from './user.entity';
import { FinanceService } from './finance.service';
import { AuditLogService } from './audit-log/audit-log.service';
import { AuditAction, AuditModule } from './audit-log/audit-log.entity';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GYM_ADMIN, UserRole.STAFF)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '100',
    @Query('search') search = '',
    @Query('type') type: 'all' | 'income' | 'expense' = 'all',
    @Query('category') category = 'all',
  ) {
    return this.financeService.findPage(
      req.user.gymId,
      {
        page: Number(page),
        pageSize: Number(pageSize),
        search,
        type,
        category: category as 'all' | any,
      },
    );
  }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.financeService.getBalance(req.user.gymId);
  }

  @Get('overview')
  getOverview(@Req() req: any) {
    return this.financeService.getOverview(req.user.gymId);
  }

  @Get('period-summary')
  getPeriodSummary(
    @Req() req: any,
    @Query('period') period: 'today' | 'week' | 'month' = 'month',
  ) {
    return this.financeService.getPeriodSummary(req.user.gymId, period);
  }

  @Get('category-distribution')
  getCategoryDistribution(
    @Req() req: any,
    @Query('period') period: 'today' | 'week' | 'month' = 'month',
  ) {
    return this.financeService.getCategoryDistribution(req.user.gymId, period);
  }

  @Get('month-comparison')
  getMonthComparison(@Req() req: any) {
    return this.financeService.getMonthComparison(
      req.user.gymId,
    );
  }

  @Get('top-income-category')
  getTopIncomeCategory(
    @Req() req: any,
    @Query('period')
    period:
      | 'today'
      | 'week'
      | 'month' =
      'month',
  ) {
    return this.financeService.getTopIncomeCategory(
      req.user.gymId,
      period,
    );
  }



  @Get('income')
  getIncome(@Req() req: any) {
    return this.financeService.getTotalIncome(req.user.gymId);
  }

  @Get('expense')
  getExpense(@Req() req: any) {
    return this.financeService.getTotalExpense(req.user.gymId);
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.financeService.create(body, req.user.gymId).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: req.user.id || req.user.sub || null,
        userName: req.user.email || null,
        module: AuditModule.FINANCE,
        action: AuditAction.CREATE,
        description: `Finans kaydı oluşturuldu: ${result.title}`,
        entityType: 'Finance',
        entityId: result.id,
        amount: Number(result.amount || 0),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        metadata: { category: result.category, type: result.type },
      });
      return result;
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.financeService.update(Number(id), body, req.user.gymId).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: req.user.id || req.user.sub || null,
        userName: req.user.email || null,
        module: AuditModule.FINANCE,
        action: AuditAction.UPDATE,
        description: `Finans kaydı güncellendi: ${result.title}`,
        entityType: 'Finance',
        entityId: result.id,
        amount: Number(result.amount || 0),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        metadata: { category: result.category, type: result.type },
      });
      return result;
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.financeService.remove(Number(id), req.user.gymId).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: req.user.id || req.user.sub || null,
        userName: req.user.email || null,
        module: AuditModule.FINANCE,
        action: AuditAction.DELETE,
        description: `Finans kaydı silindi: #${id}`,
        entityType: 'Finance',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });
      return result;
    });
  }
}
