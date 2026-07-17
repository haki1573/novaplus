import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  DeviceStatus,
  DeviceType,
} from './device.entity';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
  ) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.deviceService.getDashboardStats(
      req.user.gymId,
    );
  }

  @Get('alarms')
  getAlarms(
    @Req() req: any,
  ) {
    return this.deviceService.getDeviceAlarms(
      req.user.gymId,
    );
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('type') type?: DeviceType,
    @Query('status') status?: DeviceStatus,
  ) {
    return this.deviceService.findAll(
      req.user.gymId,
      type,
      status,
    );
  }

  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.deviceService.findOne(
      req.user.gymId,
      id,
    );
  }

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateDeviceDto,
  ) {
    return this.deviceService.create(
      req.user.gymId,
      dto,
    );
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.deviceService.update(
      req.user.gymId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: DeviceStatus,
  ) {
    return this.deviceService.updateStatus(
      req.user.gymId,
      id,
      status,
    );
  }

  @Post(':id/heartbeat')
  heartbeat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DeviceHeartbeatDto,
  ) {
    return this.deviceService.heartbeat(
      req.user.gymId,
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.deviceService.remove(
      req.user.gymId,
      id,
    );
  }
}
