import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Member } from '../member/member.entity';
import { AccessCard } from '../card/access-card.entity';

@Entity('check_ins')
@Index(['gymId', 'checkInTime'])
@Index(['gymId', 'memberId', 'checkInTime'])
@Index(['memberId', 'checkInTime'])
@Index(['gymId', 'checkOutTime'])
@Index(['gymId', 'turnstileId', 'checkInTime'])
export class CheckIn {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'text',
  })
  gymId!: string;

  @ManyToOne(() => Member, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'memberId',
  })
  member!: Member;

  @Column({
    type: 'int',
  })
  memberId!: number;

  @ManyToOne(() => AccessCard, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'accessCardId',
  })
  accessCard!: AccessCard | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  accessCardId!: string | null;

  @Column({
    type: 'text',
  })
  accessType!: 'CARD' | 'QR';

  @Column({
    type: 'text',
  })
  accessCode!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  turnstileId!: string | null;

  @CreateDateColumn()
  checkInTime!: Date;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  checkOutTime!: Date | null;
}
