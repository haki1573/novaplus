import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('cafe_sale_items')
@Index(['saleId'])
export class CafeSaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
  })
  saleId!: string;

  @Column({
    type: 'text',
  })
  productId!: string;

  @Column({
    type: 'text',
  })
  productName!: string;

  @Column({
    type: 'int',
  })
  quantity!: number;

  @Column({
    type: 'real',
  })
  unitPrice!: number;

  @Column({
    type: 'real',
  })
  totalPrice!: number;
}
