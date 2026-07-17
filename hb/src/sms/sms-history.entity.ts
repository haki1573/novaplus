import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SmsStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum SmsRecipientType {
  MEMBER = 'MEMBER',
  MANUAL = 'MANUAL',
  BULK = 'BULK',
}

@Entity('sms_history')
export class SmsHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'integer',
    nullable: true,
  })
  memberId!: number | null;

  @Column({
    type: 'text',
  })
  phone!: string;

  @Column({
    type: 'text',
  })
  message!: string;

  @Column({
    type: 'text',
    default: SmsRecipientType.MANUAL,
  })
  recipientType!: SmsRecipientType;

  @Index()
  @Column({
    type: 'text',
    default: SmsStatus.PENDING,
  })
  status!: SmsStatus;

  @Column({
    type: 'integer',
    default: 1,
  })
  smsCost!: number;

  @Column({
    type: 'text',
    default: 'MOCK',
  })
  provider!: string;

  @Index()
  @Column({
    type: 'text',
    nullable: true,
  })
  providerMessageId!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  errorCode!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  errorMessage!: string | null;

  @Column({
    type: 'integer',
    default: 0,
  })
  retryCount!: number;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  queuedAt!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  sentAt!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  deliveredAt!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  failedAt!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  sentByUserId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}