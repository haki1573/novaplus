import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LockerStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

@Entity('lockers')
export class Locker {
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
  number!: string;

  @Column({
    type: 'text',
    default: LockerStatus.AVAILABLE,
  })
  status!: LockerStatus;

  @Column({
    type: 'integer',
    nullable: true,
  })
  memberId!: number | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  accessCode!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  qrToken!: string | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  assignedAt!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  releasedAt!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  isLocked!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
