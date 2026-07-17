import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DeviceEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  HEARTBEAT = 'HEARTBEAT',
  ERROR = 'ERROR',
  ERROR_CLEARED = 'ERROR_CLEARED',
  FIRMWARE_CHANGED = 'FIRMWARE_CHANGED',
  RESTARTED = 'RESTARTED',
  DELETED = 'DELETED',
}

export enum DeviceEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

@Entity('device_events')
@Index(['gymId', 'createdAt'])
@Index(['deviceId', 'createdAt'])
export class DeviceEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  gymId!: string;

  @Column({ type: 'text', nullable: true })
  organizationId!: string | null;

  @Column({ type: 'text', nullable: true })
  deviceId!: string | null;

  @Column({ type: 'text' })
  deviceName!: string;

  @Column({ type: 'text' })
  deviceType!: string;

  @Column({ type: 'text' })
  eventType!: DeviceEventType;

  @Column({
    type: 'text',
    default: DeviceEventSeverity.INFO,
  })
  severity!: DeviceEventSeverity;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  previousValue!: string | null;

  @Column({ type: 'text', nullable: true })
  currentValue!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
