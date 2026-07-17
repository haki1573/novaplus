import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TurnstileDirection {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  BOTH = 'BOTH',
  STAFF = 'STAFF',
  VIP = 'VIP',
}

export enum TurnstileStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('turnstiles')
@Index(['gymId', 'name'], {
  unique: true,
})
export class Turnstile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  organizationId!: string | null;

  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'text',
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  brand!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  model!: string | null;

  @Index()
  @Column({
    type: 'text',
    nullable: true,
    unique: true,
  })
  serialNumber!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  ipAddress!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  macAddress!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  location!: string | null;

  @Column({
    type: 'text',
    default: TurnstileDirection.BOTH,
  })
  direction!: TurnstileDirection;

  @Column({
    type: 'text',
    default: TurnstileStatus.OFFLINE,
  })
  status!: TurnstileStatus;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  lastHeartbeatAt!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  lastPassageAt!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  firmwareVersion!: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  latencyMs!: number | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  lastError!: string | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  emergencyOpenUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
