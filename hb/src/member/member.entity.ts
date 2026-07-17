import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Gym } from '../gym/gym.entity';
import { Package } from '../package.entity';

@Entity()
@Index(['gymId', 'status'])
@Index(['gymId', 'membershipEnd'])
@Index(['gymId', 'fullName'])
@Index(['gymId', 'phone'])
@Index(['gymId', 'email'])
@Index(['gymId', 'isArchived'])
export class Member {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  fullName!: string;

  @Column({ default: '' })
  phone!: string;

  @Column({ default: '' })
  email!: string;

  @Column({ default: 'Aktif' })
  status!: string;

  @Column({ default: false })
  isArchived!: boolean;

  @Column({ nullable: true })
  gymId?: string;

  @Column({ nullable: true })
  packageId?: string;

  @Column({ type: 'datetime', nullable: true })
  membershipStart?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  membershipEnd?: Date | null;

  @ManyToOne(() => Gym, (gym) => gym.members, {
    nullable: true,
  })
  gym?: Gym;

  @ManyToOne(() => Package, {
    nullable: true,
  })
  package?: Package;
}