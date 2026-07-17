import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { SetupService } from './setup.service';

import { InitializeSystemDto } from './dto/initialize-system.dto';

@Controller('setup')
export class SetupController {
  constructor(
    private readonly setupService:
      SetupService,
  ) {}

  @Get('status')
  getSetupStatus() {
    return this.setupService
      .getSetupStatus();
  }

  @Post('initialize')
  initializeSystem(
    @Body() dto: InitializeSystemDto,
  ) {
    return this.setupService
      .initializeSystem(dto);
  }
}