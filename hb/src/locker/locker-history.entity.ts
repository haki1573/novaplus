import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum LockerAction {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  OPENED = 'OPENED',
  LOCKED = 'LOCKED',
  RELEASED = 'RELEASED',
  RESET = 'RESET',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETURNED_TO_SERVICE = 'RETURNED_TO_SERVICE',
}

@Entity('locker_history')
export class LockerHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    type: 'text',
  })
  gymId!: string;

  @Index()
  @Column({
    type: 'text',
  })
  lockerId!: string;

  @Column({
    type: 'integer',
    nullable: true,
  })
  memberId!: number | null;

  @Column({
    type: 'text',
  })
  action!: LockerAction;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  performedByUserId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
