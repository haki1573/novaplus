import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CafePaymentMethod {
  MEMBER_BALANCE = 'MEMBER_BALANCE',
}

@Entity('cafe_sales')
@Index(['gymId', 'memberId'])
export class CafeSale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  organizationId!: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  memberId!: number | null;

  @Column({
    type: 'real',
  })
  totalAmount!: number;

  @Column({
    type: 'text',
  })
  paymentMethod!: CafePaymentMethod;

  @Column({
    type: 'text',
    nullable: true,
  })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
