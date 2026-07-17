import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Staff } from './staff.entity';

@Entity('staff_permissions')
export class StaffPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  staffId!: string;

  @OneToOne(
    () => Staff,
    (staff) => staff.permission,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'staffId' })
  staff!: Staff;

  @Column({ default: true })
  dashboard!: boolean;

  @Column({ default: true })
  members!: boolean;

  @Column({ default: false })
  finance!: boolean;

  @Column({ default: false })
  sms!: boolean;

  @Column({ default: false })
  lockers!: boolean;

  @Column({ default: false })
  cafe!: boolean;

  @Column({ default: false })
  reports!: boolean;

  @Column({ default: true })
  checkIn!: boolean;

  @Column({ default: false })
  accessCards!: boolean;

  @Column({ default: false })
  settings!: boolean;
}
