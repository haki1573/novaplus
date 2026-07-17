import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../user.entity';
import { Organization } from './organization.entity';

export enum OrganizationUserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

@Entity('organization_users')
@Index(
  ['organizationId', 'userId'],
  { unique: true },
)
export class OrganizationUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  organizationId!: string;

  @ManyToOne(
    () => Organization,
    (organization) =>
      organization.organizationUsers,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'organizationId',
  })
  organization!: Organization;

  @Column({ type: 'text' })
  userId!: string;

  @ManyToOne(
    () => User,
    (user) =>
      user.organizationMemberships,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'userId',
  })
  user!: User;

  @Column({
    type: 'text',
    default:
      OrganizationUserRole.VIEWER,
  })
  role!: OrganizationUserRole;

  @Column({
    type: 'boolean',
    default: false,
  })
  accessAllGyms!: boolean;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
