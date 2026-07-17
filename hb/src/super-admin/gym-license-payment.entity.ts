import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {
  Gym,
  GymBillingCycle,
  GymSubscriptionPlan,
} from '../gym/gym.entity';

@Entity('gym_license_payments')
@Index(['gymId', 'createdAt'])
export class GymLicensePayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  gymId!: string;

  @ManyToOne(() => Gym, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'gymId' })
  gym!: Gym;

  @Column({ type: 'real' })
  amount!: number;

  @Column({
    type: 'text',
    default: GymSubscriptionPlan.BASIC,
  })
  plan!: GymSubscriptionPlan;

  @Column({
    type: 'text',
    default: GymBillingCycle.MONTHLY,
  })
  billingCycle!: GymBillingCycle;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  periodStart!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  periodEnd!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  note!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  createdByUserId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
