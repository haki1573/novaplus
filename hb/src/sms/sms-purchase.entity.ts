import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sms_purchases')
export class SmsPurchase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  packageId!: string | null;

  @Column({
    type: 'text',
  })
  packageName!: string;

  @Column({
    type: 'integer',
  })
  smsCount!: number;

  @Column({
    type: 'real',
    default: 0,
  })
  amount!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  soldByUserId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
