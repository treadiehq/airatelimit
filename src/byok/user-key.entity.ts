import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export type ByokProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter';

/**
 * User Key Entity
 * 
 * Stores encrypted API keys for end-users (BYOK - Bring Your Own Key).
 * Keys are encrypted at rest using AES-256-GCM via CryptoService.
 */
@Entity('user_keys')
@Unique(['organizationId', 'identity', 'provider'])
export class UserKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  @Index()
  organizationId: string;

  @Column()
  @Index()
  identity: string;

  @Column()
  provider: ByokProvider;

  @Column({ type: 'text' })
  encryptedApiKey: string;

  @Column({ length: 8, nullable: true })
  keyHint: string;

  @Column({ nullable: true })
  baseUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'bigint', default: 0 })
  requestCount: number;

  @Column({ type: 'bigint', default: 0 })
  totalTokens: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
