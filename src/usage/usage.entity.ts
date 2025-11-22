import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('usage_counters')
@Index(['projectId', 'identity', 'periodStart', 'model'], { unique: true })
@Index(['projectId', 'periodStart'])
@Index(['projectId', 'model'])
export class UsageCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column()
  identity: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ default: '' })
  model: string;

  @Column({ default: 0 })
  requestsUsed: number;

  @Column({ default: 0 })
  tokensUsed: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

