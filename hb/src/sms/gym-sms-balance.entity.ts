import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Gym } from '../gym/gym.entity';

@Entity('gym_sms_balances')
export class GymSmsBalance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
    unique: true,
  })
  gymId!: string;

  @OneToOne(() => Gym, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'gymId',
  })
  gym!: Gym;

  @Column({
    type: 'integer',
    default: 0,
  })
  balance!: number;

  @Column({
    type: 'integer',
    default: 0,
  })
  totalPurchased!: number;

  @Column({
    type: 'integer',
    default: 0,
  })
  totalUsed!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
