import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { FinanceService } from './finance.service';

@Controller(
  'super-admin/gyms/:gymId/finance',
)
export class SuperAdminFinanceController {
  constructor(
    private readonly financeService:
      FinanceService,
  ) {}

  @Get()
  findAll(
    @Param('gymId') gymId: string,
  ) {
    return this.financeService.findAll(
      gymId,
    );
  }

  @Get('summary')
  getSummary(
    @Param('gymId') gymId: string,
  ) {
    return this.financeService.getBalance(
      gymId,
    );
  }

  @Get('income')
  getIncome(
    @Param('gymId') gymId: string,
  ) {
    return this.financeService
      .getTotalIncome(gymId);
  }

  @Get('expense')
  getExpense(
    @Param('gymId') gymId: string,
  ) {
    return this.financeService
      .getTotalExpense(gymId);
  }

  @Post()
  create(
    @Param('gymId') gymId: string,
    @Body() body: any,
  ) {
    return this.financeService.create(
      body,
      gymId,
    );
  }

  @Put(':id')
  update(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.financeService.update(
      Number(id),
      body,
      gymId,
    );
  }

  @Delete(':id')
  remove(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
  ) {
    return this.financeService.remove(
      Number(id),
      gymId,
    );
  }
}
