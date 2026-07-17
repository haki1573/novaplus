import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TurnstileEventDirection {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  MANUAL_OPEN = 'MANUAL_OPEN',
  EMERGENCY_OPEN = 'EMERGENCY_OPEN',
}

export enum TurnstileEventResult {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
}

@Entity('turnstile_events')
@Index(['gymId', 'createdAt'])
@Index(['turnstileId', 'createdAt'])
@Index(['gymId', 'memberId', 'createdAt'])
@Index(['gymId', 'result', 'createdAt'])
@Index(['gymId', 'direction', 'createdAt'])
export class TurnstileEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  organizationId!: string | null;

  @Column({
    type: 'text',
  })
  gymId!: string;

  @Column({
    type: 'text',
  })
  turnstileId!: string;

  @Column({
    type: 'text',
  })
  turnstileName!: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  memberId!: number | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  memberName!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  credentialId!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  credentialType!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  credentialCode!: string | null;

  @Column({
    type: 'text',
  })
  direction!: TurnstileEventDirection;

  @Column({
    type: 'text',
  })
  result!: TurnstileEventResult;

  @Column({
    type: 'text',
    nullable: true,
  })
  reason!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  openedByUserId!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  metadataJson!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
