import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CafeDrinkCategory {
  WATER = 'WATER',
  COFFEE = 'COFFEE',
  PROTEIN = 'PROTEIN',
  ENERGY = 'ENERGY',
  OTHER = 'OTHER',
}

@Entity('cafe_products')
@Index(['gymId', 'name'], {
  unique: true,
})
export class CafeProduct {
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
    type: 'text',
  })
  name!: string;

  @Column({
    type: 'text',
    default: CafeDrinkCategory.OTHER,
  })
  category!: CafeDrinkCategory;

  @Column({
    type: 'real',
  })
  salePrice!: number;

  @Column({
    type: 'int',
    default: 0,
  })
  stockQuantity!: number;

  @Column({
    type: 'int',
    default: 5,
  })
  lowStockLimit!: number;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  barcode!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
