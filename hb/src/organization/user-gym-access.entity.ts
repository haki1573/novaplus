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

import { Gym } from '../gym/gym.entity';
import { User } from '../user.entity';
import type { UserRole } from '../user.entity';

@Entity('user_gym_access')
@Index(
  ['userId', 'gymId'],
  { unique: true },
)
export class UserGymAccess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  userId!: string;

  @ManyToOne(
    () => User,
    (user) =>
      user.gymAccesses,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'userId',
  })
  user!: User;

  @Column({ type: 'text' })
  gymId!: string;

  @ManyToOne(
    () => Gym,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'gymId',
  })
  gym!: Gym;

  @Column({
    type: 'text',
    default: 'STAFF',
  })
  role!: UserRole;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
