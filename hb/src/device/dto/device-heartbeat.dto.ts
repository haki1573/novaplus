import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { DeviceConnectionType } from '../device.entity';

export class DeviceHeartbeatDto {
  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsEnum(DeviceConnectionType)
  connectionType?: DeviceConnectionType;

  @IsOptional()
  @IsInt()
  @Min(0)
  latencyMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  uptimeSeconds?: number;

  @IsOptional()
  @IsString()
  lastError?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
