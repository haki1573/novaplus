import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditModule {
  MEMBER = 'MEMBER',
  FINANCE = 'FINANCE',
  ACCESS_CARD = 'ACCESS_CARD',
  CAFE = 'CAFE',
  SMS = 'SMS',
  LOCKER = 'LOCKER',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ARCHIVE = 'ARCHIVE',
  SALE = 'SALE',
  TOP_UP = 'TOP_UP',
  SEND = 'SEND',
  RETRY = 'RETRY',
  ASSIGN = 'ASSIGN',
  RELEASE = 'RELEASE',
  OPEN = 'OPEN',
  LOCK = 'LOCK',
  STATUS_CHANGE = 'STATUS_CHANGE',
}

@Entity('audit_logs')
@Index(['gymId', 'createdAt'])
@Index(['module', 'action'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  gymId!: string;

  @Column({ type: 'text', nullable: true })
  userId!: string | null;

  @Column({ type: 'text', nullable: true })
  userName!: string | null;

  @Column({ type: 'text' })
  module!: AuditModule;

  @Column({ type: 'text' })
  action!: AuditAction;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  entityType!: string | null;

  @Column({ type: 'text', nullable: true })
  entityId!: string | null;

  @Column({ type: 'real', nullable: true })
  amount!: number | null;

  @Column({ type: 'text', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', default: 'SUCCESS' })
  result!: 'SUCCESS' | 'FAILED';

  @Column({ type: 'text', nullable: true })
  metadataJson!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
