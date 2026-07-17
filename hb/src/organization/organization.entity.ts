import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Gym } from '../gym/gym.entity';
import { OrganizationUser } from './organization-user.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    type: 'text',
    unique: true,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  companyName!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  taxNumber!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  taxOffice!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  ownerName!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  email!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  phone!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  address!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  city!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  logoUrl!: string | null;

  @Column({
    type: 'int',
    default: 1,
  })
  maxGyms!: number;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @OneToMany(
    () => Gym,
    (gym) => gym.organization,
  )
  gyms!: Gym[];

  @OneToMany(
    () => OrganizationUser,
    (organizationUser) =>
      organizationUser.organization,
  )
  organizationUsers!: OrganizationUser[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
