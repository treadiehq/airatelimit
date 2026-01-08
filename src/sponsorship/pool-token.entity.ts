import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SponsorshipPool } from './sponsorship-pool.entity';

/**
 * Pool Token Entity (Phase 2)
 * 
 * Bearer tokens for accessing sponsorship pools.
 * Token format: spp_live_xxxxxxxx or spp_test_xxxxxxxx
 */
@Entity('pool_tokens')
export class PoolToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Link to pool
  @ManyToOne(() => SponsorshipPool, (pool) => pool.tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poolId' })
  pool: SponsorshipPool;

  @Column()
  @Index()
  poolId: string;

  // Token hash for secure comparison
  @Column({ unique: true })
  @Index()
  tokenHash: string;

  // Token hint for display (last 4 chars)
  @Column({ length: 8 })
  tokenHint: string;

  // Status
  @Column({ default: true })
  isActive: boolean;

  // Usage tracking
  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  revokedAt: Date;
}

