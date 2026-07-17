import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum WalletTransactionType {
  TOP_UP = 'TOP_UP',
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('wallet_transactions')
@Index(['gymId', 'memberId'])
export class WalletTransaction {
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
  })
  memberId!: number;

  @Column({
    type: 'text',
  })
  type!: WalletTransactionType;

  @Column({
    type: 'real',
  })
  amount!: number;

  @Column({
    type: 'real',
  })
  balanceBefore!: number;

  @Column({
    type: 'real',
  })
  balanceAfter!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  referenceId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
