import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Gym } from '../gym/gym.entity';
import { Organization } from '../organization/organization.entity';

export enum DeviceType {
  TURNSTILE = 'TURNSTILE',
  LOCKER = 'LOCKER',
  POS_TERMINAL = 'POS_TERMINAL',
  QR_READER = 'QR_READER',
  CAMERA = 'CAMERA',
  SMART_SCALE = 'SMART_SCALE',
  VENDING_MACHINE = 'VENDING_MACHINE',
  GATEWAY = 'GATEWAY',
  OTHER = 'OTHER',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
  ERROR = 'ERROR',
}

export enum DeviceConnectionType {
  ETHERNET = 'ETHERNET',
  WIFI = 'WIFI',
  RS485 = 'RS485',
  USB = 'USB',
  SERIAL = 'SERIAL',
  OTHER = 'OTHER',
}

@Entity('devices')
@Index(['gymId', 'serialNumber'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text' })
  gymId!: string;

  @ManyToOne(() => Gym, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'gymId' })
  gym!: Gym;

  @Index()
  @Column({
    type: 'text',
    nullable: true,
  })
  organizationId!: string | null;

  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization | null;

  @Column({ type: 'text' })
  type!: DeviceType;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  serialNumber!: string;

  @Column({ type: 'text', nullable: true })
  manufacturer!: string | null;

  @Column({ type: 'text', nullable: true })
  model!: string | null;

  @Column({ type: 'text', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  macAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  firmwareVersion!: string | null;

  @Column({ type: 'text', nullable: true })
  latestFirmwareVersion!: string | null;

  @Column({
    type: 'text',
    default: DeviceStatus.OFFLINE,
  })
  status!: DeviceStatus;

  @Column({
    type: 'text',
    default: DeviceConnectionType.ETHERNET,
  })
  connectionType!: DeviceConnectionType;

  @Column({ type: 'integer', nullable: true })
  latencyMs!: number | null;

  @Column({ type: 'integer', nullable: true })
  uptimeSeconds!: number | null;

  @Column({ type: 'datetime', nullable: true })
  lastSeen!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastRestartAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  installedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastErrorAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
