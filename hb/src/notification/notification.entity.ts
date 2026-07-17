import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationCategory {
  STOCK = 'STOCK',
  MEMBERSHIP = 'MEMBERSHIP',
  LOCKER = 'LOCKER',
  SMS = 'SMS',
  LICENSE = 'LICENSE',
  SYSTEM = 'SYSTEM',
  DEVICE = 'DEVICE',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'text',
  })
  title!: string;

  @Column({
    type: 'text',
  })
  description!: string;

  @Column({
    type: 'text',
  })
  category!: NotificationCategory;

  @Column({
    type: 'text',
    default: NotificationSeverity.INFO,
  })
  severity!: NotificationSeverity;

  @Column({
    type: 'boolean',
    default: false,
  })
  isRead!: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  sourceKey!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  actionPath!: string | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  resolvedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
