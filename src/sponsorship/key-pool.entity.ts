import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Project } from '../projects/projects.entity';

/**
 * KeyPoolEntry - A contributed API key in a shared pool
 * 
 * Allows multiple sponsors to contribute their API keys to be load-balanced
 * across recipients. Usage is tracked per-key for attribution.
 * 
 * Use case: Multiple people sponsor an OSS project by contributing their
 * API keys. The proxy load-balances requests across all contributed keys.
 */
@Entity('key_pool_entries')
@Index(['projectId', 'provider'])
export class KeyPoolEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The project this key is pooled for
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  @Index()
  projectId: string;

  // The contributor of this key (nullable for anonymous contributions via invite link)
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'contributorId' })
  contributor: User | null;

  @Column('uuid', { nullable: true })
  @Index()
  contributorId: string | null;

  // Management token for anonymous contributors to manage their contribution
  @Column({ nullable: true, unique: true })
  @Index()
  managementToken: string | null;

  // Email for anonymous contributors (for notifications and access recovery)
  @Column({ nullable: true })
  contributorEmail: string | null;

  // Provider type
  @Column({
    type: 'enum',
    enum: ['openai', 'anthropic', 'google', 'xai', 'other'],
  })
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'other';

  // The API key (ENCRYPTED at rest using CryptoService)
  @Column()
  apiKey: string;

  // Optional custom base URL for the provider
  @Column({ nullable: true })
  baseUrl: string;

  // Friendly name for this key (e.g., "My Claude Pro Key")
  @Column({ nullable: true })
  name: string;

  // Monthly budget limit for this key (in tokens, 0 = unlimited)
  @Column({ type: 'int', default: 0 })
  monthlyTokenLimit: number;

  // Monthly cost limit in cents (0 = unlimited)
  @Column({ type: 'int', default: 0 })
  monthlyCostLimitCents: number;

  // Current period usage tracking
  @Column({ type: 'bigint', default: 0 })
  currentPeriodTokens: number;

  @Column({ type: 'int', default: 0 })
  currentPeriodCostCents: number;

  @Column({ type: 'int', default: 0 })
  currentPeriodRequests: number;

  @Column({ type: 'date', nullable: true })
  currentPeriodStart: Date;

  // Lifetime usage tracking
  @Column({ type: 'bigint', default: 0 })
  totalTokens: number;

  @Column({ type: 'bigint', default: 0 })
  totalCostCents: number;

  @Column({ type: 'int', default: 0 })
  totalRequests: number;

  // Load balancing weight (higher = more requests routed to this key)
  // 0 = key is paused, 1 = normal, 2 = double traffic, etc.
  @Column({ type: 'int', default: 1 })
  weight: number;

  // Priority for fallback (lower = tried first)
  @Column({ type: 'int', default: 0 })
  priority: number;

  // Key health tracking
  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  rateLimited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  rateLimitedUntil: Date | null;

  @Column({ type: 'int', default: 0 })
  consecutiveErrors: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastErrorAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  // Optional: restrict to specific models
  @Column({ type: 'jsonb', nullable: true })
  allowedModels: string[];

  // Optional: restrict to specific recipient identities
  @Column({ type: 'jsonb', nullable: true })
  allowedIdentities: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

