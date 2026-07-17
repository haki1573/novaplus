import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Member } from '../member/member.entity';
import { User } from '../user.entity';
import { Organization } from '../organization/organization.entity';

export enum GymSubscriptionPlan {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum GymLicenseStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

export enum GymBillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

@Entity('gyms')
export class Gym {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
    unique: true,
  })
  name!: string;

  @Index()
  @Column({
    type: 'text',
    unique: true,
  })
  slug!: string;

  /*
   * Salonun yetkili veya sahibiyle ilgili bilgiler.
   * Mevcut veritabanının bozulmaması için nullable bırakıldı.
   */
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

  @Index()
  @Column({
    type: 'text',
    nullable: true,
  })
  organizationId!: string | null;

  @ManyToOne(
    () => Organization,
    (organization) =>
      organization.gyms,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({
    name: 'organizationId',
  })
  organization!: Organization | null;

  /*
   * Salonun NovaPlus+ abonelik paketi.
   */
  @Column({
    type: 'text',
    default: GymSubscriptionPlan.BASIC,
  })
  subscriptionPlan!: GymSubscriptionPlan;

  /*
   * Lisans tarihleri Super Admin tarafından yönetilecek.
   * Lisans bitiş tarihi geçtiğinde salonun sisteme erişimi
   * daha sonra Auth katmanında engellenecek.
   */
  @Column({
    type: 'datetime',
    nullable: true,
  })
  licenseStartDate!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  licenseEndDate!: Date | null;

  @Column({
    type: 'text',
    default: GymLicenseStatus.ACTIVE,
  })
  licenseStatus!: GymLicenseStatus;

  @Column({
    type: 'text',
    default: GymBillingCycle.MONTHLY,
  })
  billingCycle!: GymBillingCycle;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  trialEndDate!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  lastPaymentDate!: Date | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  nextPaymentDate!: Date | null;

  /*
   * Salon silinmeden pasif duruma alınabilir.
   */
  @Column({
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  /*
   * İleride her salonun kendi logosunu kullanabilmesi için.
   * NovaPlus+ ana logosu sistemin genel logosu olarak kalacak.
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  logoUrl!: string | null;

  @OneToMany(() => User, (user) => user.gym)
  users!: User[];

  @OneToMany(() => Member, (member) => member.gym)
  members!: Member[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}