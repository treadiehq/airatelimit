import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { SponsorKey } from './sponsor-key.entity';
import { SponsoredToken } from './sponsored-token.entity';
import { SponsorshipUsage } from './sponsorship-usage.entity';

export type SponsorshipStatus = 'pending' | 'active' | 'paused' | 'revoked' | 'exhausted' | 'expired';
export type BillingPeriod = 'one_time' | 'monthly';

/**
 * Sponsorship Entity
 * 
 * Represents a budget allocation from a sponsor to a recipient.
 * Sponsors set spending caps, model restrictions, and rate limits.
 */
@Entity('sponsorships')
export class Sponsorship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Sponsor info (nullable for anonymous/public sponsorships)
  @ManyToOne(() => SponsorKey, (key) => key.sponsorships, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'sponsorKeyId' })
  sponsorKey: SponsorKey;

  @Column({ nullable: true })
  @Index()
  sponsorKeyId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sponsorOrgId' })
  sponsorOrg: Organization;

  @Column({ nullable: true })
  @Index()
  sponsorOrgId: string;

  // Direct API key storage for anonymous sponsorships (when no SponsorKey)
  @Column({ type: 'text', nullable: true })
  encryptedApiKeyDirect: string;

  @Column({ nullable: true })
  providerDirect: string; // 'openai' | 'anthropic' | 'google' | 'xai'

  // Recipient info (nullable until claimed)
  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipientOrgId' })
  recipientOrg: Organization;

  @Column({ nullable: true })
  @Index()
  recipientOrgId: string;

  // Optional: target email for invite
  @Column({ nullable: true })
  recipientEmail: string;

  // Optional: target GitHub username for claiming
  @Column({ nullable: true })
  @Index()
  targetGitHubUsername: string;

  // Anonymous sponsor info (for public badge sponsorships)
  @Column({ nullable: true })
  @Index()
  sponsorEmail: string; // Email of the sponsor (for anonymous/public sponsorships)

  @Column({ nullable: true })
  managementTokenHash: string; // Hashed token for magic link management

  @Column({ nullable: true })
  managementTokenExpiresAt: Date; // Never expires for now, but future-proofing

  // Display name and description
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Budget constraints (one or both can be set)
  @Column({ type: 'decimal', precision: 16, scale: 8, nullable: true })
  spendCapUsd: number;

  @Column({ type: 'bigint', nullable: true })
  spendCapTokens: number;

  @Column({ type: 'decimal', precision: 16, scale: 8, default: 0 })
  spentUsd: number;

  @Column({ type: 'bigint', default: 0 })
  spentTokens: number;

  // Usage constraints
  @Column({ type: 'jsonb', nullable: true })
  allowedModels: string[];

  @Column({ nullable: true })
  maxTokensPerRequest: number;

  @Column({ nullable: true })
  maxRequestsPerMinute: number;

  @Column({ nullable: true })
  maxRequestsPerDay: number;

  // ====================================
  // IP RESTRICTIONS
  // ====================================
  
  // IP restriction mode: 'inherit' (from sponsor key), 'custom', or 'none'
  @Column({ type: 'varchar', length: 20, default: 'inherit' })
  ipRestrictionMode: 'inherit' | 'custom' | 'none';

  // Custom allowed IP ranges (only used when ipRestrictionMode = 'custom')
  // Example: ["10.0.0.0/8", "192.168.1.100", "2001:db8::/32"]
  @Column({ type: 'jsonb', nullable: true })
  allowedIpRanges: string[];

  // Billing period: one-time or recurring monthly
  @Column({ type: 'varchar', length: 20, default: 'one_time' })
  billingPeriod: BillingPeriod;

  // Track current billing period start (for monthly reset)
  @Column({ nullable: true })
  currentPeriodStart: Date;

  // Temporal constraints
  @Column({ nullable: true })
  expiresAt: Date;

  // Status (using varchar to avoid TypeORM enum sync issues)
  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: SponsorshipStatus;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ type: 'text', nullable: true })
  revokedReason: string;

  // Tokens issued for this sponsorship
  @OneToMany(() => SponsoredToken, (token) => token.sponsorship)
  tokens: SponsoredToken[];

  // Usage records
  @OneToMany(() => SponsorshipUsage, (usage) => usage.sponsorship)
  usageRecords: SponsorshipUsage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get remainingBudgetUsd(): number | null {
    if (this.spendCapUsd === null) return null;
    return Math.max(0, Number(this.spendCapUsd) - Number(this.spentUsd));
  }

  get remainingBudgetTokens(): number | null {
    if (this.spendCapTokens === null) return null;
    return Math.max(0, Number(this.spendCapTokens) - Number(this.spentTokens));
  }

  get budgetUsedPercent(): number {
    if (this.spendCapUsd) {
      return (Number(this.spentUsd) / Number(this.spendCapUsd)) * 100;
    }
    if (this.spendCapTokens) {
      return (Number(this.spentTokens) / Number(this.spendCapTokens)) * 100;
    }
    return 0;
  }
}

