import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { Gym } from './gym/gym.entity';
import { OrganizationUser } from './organization/organization-user.entity';
import { UserGymAccess } from './organization/user-gym-access.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GYM_ADMIN = 'GYM_ADMIN',
  STAFF = 'STAFF',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({
    type: 'text',
    unique: true,
  })
  email!: string;

  @Column({
    type: 'text',
  })
  passwordHash!: string;

  @Column({
    type: 'text',
  })
  firstName!: string;

  @Column({
    type: 'text',
  })
  lastName!: string;

  @Column({
    type: 'text',
    default: UserRole.GYM_ADMIN,
  })
  role!: UserRole;

  /*
   * SUPER_ADMIN herhangi bir spor salonuna bağlı değildir.
   * Bu nedenle gymId nullable olmalıdır.
   *
   * GYM_ADMIN ve STAFF kullanıcılarında gymId bulunmalıdır.
   */
  @Index()
  @Column({
    type: 'text',
    nullable: true,
  })
  gymId!: string | null;

  @ManyToOne(() => Gym, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'gymId',
  })
  gym!: Gym | null;

  @OneToMany(
    () => OrganizationUser,
    (organizationUser) =>
      organizationUser.user,
  )
  organizationMemberships!: OrganizationUser[];

  @OneToMany(
    () => UserGymAccess,
    (gymAccess) =>
      gymAccess.user,
  )
  gymAccesses!: UserGymAccess[];

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({
    type: 'int',
    default: 0,
  })
  tokenVersion!: number;

  @Column({
    type: 'int',
    default: 0,
  })
  failedLoginAttempts!: number;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  lockedUntil!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  lastLoginAt!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  lastLoginIp!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}