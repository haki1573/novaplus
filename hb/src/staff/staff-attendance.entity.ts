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

import { Staff } from './staff.entity';

@Entity('staff_attendance')
@Index(['gymId', 'staffId', 'workDate'])
export class StaffAttendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  gymId!: string;

  @Column({ type: 'text' })
  staffId!: string;

  @ManyToOne(() => Staff, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staffId' })
  staff!: Staff;

  @Column({ type: 'date' })
  workDate!: string;

  @Column({ type: 'datetime' })
  checkInTime!: Date;

  @Column({ type: 'datetime', nullable: true })
  checkOutTime!: Date | null;

  @Column({ type: 'int', default: 0 })
  durationMinutes!: number;

  @Column({ type: 'text' })
  accessType!: 'CARD' | 'QR';

  @Column({ type: 'text' })
  accessCode!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
