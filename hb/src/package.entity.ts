import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column('real')
  price!: number;

  @Column({ type: 'int' })
  durationMonths!: number;

  @Column({ default: '' })
  description!: string;

  @Column({ default: 'Aktif' })
  status!: string;

  @Column()
  gymId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}