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

import { Member } from '../member/member.entity';

export enum AccessCredentialType {
  CARD = 'CARD',
  QR = 'QR',
}

export enum AccessCredentialStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  PASSIVE = 'PASSIVE',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
  CONSUMED = 'CONSUMED',
}

@Entity('access_cards')
@Index(['gymId', 'code'], {
  unique: true,
})
@Index(['gymId', 'memberId'])
@Index(['gymId', 'status'])
@Index(['gymId', 'type', 'status'])
@Index(['memberId', 'status'])
export class AccessCard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'text',
  })
  type!: AccessCredentialType;

  @Column({
    type: 'text',
  })
  code!: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  memberId!: number | null;

  @ManyToOne(() => Member, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'memberId',
  })
  member!: Member | null;

  @Column({
    type: 'text',
    default:
      AccessCredentialStatus.AVAILABLE,
  })
  status!: AccessCredentialStatus;

  // Super Admin'in spor salonuna sattığı birim fiyat.
  // Salonun üyeye uyguladığı satış fiyatı burada tutulmaz.
  @Column({
    type: 'real',
    default: 0,
  })
  gymSalePrice!: number;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  soldToGymAt!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  note!: string | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  assignedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
