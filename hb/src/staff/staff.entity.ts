import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { StaffPermission } from './staff-permission.entity';

export enum StaffRole {
  MANAGER = 'MANAGER',
  RECEPTION = 'RECEPTION',
  TRAINER = 'TRAINER',
  CLEANING = 'CLEANING',
  ACCOUNTING = 'ACCOUNTING',
  OTHER = 'OTHER',
}

@Entity('staff')
@Index(['gymId', 'cardCode'], { unique: true })
@Index(['gymId', 'qrCode'], { unique: true })
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  gymId!: string;

  @Column({ type: 'text' })
  fullName!: string;

  @Column({ type: 'text', default: '' })
  phone!: string;

  @Column({ type: 'text', default: '' })
  email!: string;

  @Column({
    type: 'text',
    default: StaffRole.OTHER,
  })
  role!: StaffRole;

  @Column({ type: 'text', nullable: true })
  cardCode!: string | null;

  @Column({ type: 'text', nullable: true })
  qrCode!: string | null;

  @Column({ type: 'date', nullable: true })
  employmentStartDate!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived!: boolean;

  @OneToOne(
    () => StaffPermission,
    (permission) => permission.staff,
  )
  permission?: StaffPermission;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
