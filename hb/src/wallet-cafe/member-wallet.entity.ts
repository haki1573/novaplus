import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Member } from '../member/member.entity';

@Entity('member_wallets')
@Index(['gymId', 'memberId'], {
  unique: true,
})
@Index(['gymId', 'balance'])
export class MemberWallet {
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
    type: 'int',
  })
  memberId!: number;

  @OneToOne(() => Member, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'memberId',
  })
  member!: Member;

  @Column({
    type: 'real',
    default: 0,
  })
  balance!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
