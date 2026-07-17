import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum FinanceType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum FinanceCategory {
  MEMBERSHIP = 'MEMBERSHIP',
  CAFE = 'CAFE',
  CARD = 'CARD',
  QR = 'QR',
  WALLET = 'WALLET',
  SMS = 'SMS',

  RENT = 'RENT',
  SALARY = 'SALARY',
  ELECTRICITY = 'ELECTRICITY',
  WATER = 'WATER',
  TAX = 'TAX',
  SUPPLIES = 'SUPPLIES',

  OTHER = 'OTHER',
}

@Entity('finance')
@Index(['gymId', 'createdAt'])
@Index(['gymId', 'type', 'category'])
@Index(['gymId', 'type', 'createdAt'])
@Index(['gymId', 'category', 'createdAt'])
export class Finance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'text',
  })
  title!: string;

  @Column({
    type: 'real',
  })
  amount!: number;

  /*
   * string bırakıldı:
   * mevcut member, card ve wallet servisleri
   * doğrudan 'income' / 'expense' atıyor.
   */
  @Column({
    type: 'text',
  })
  type!: 'income' | 'expense';

  @Column({
    type: 'text',
    default: FinanceCategory.OTHER,
  })
  category!: FinanceCategory;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
