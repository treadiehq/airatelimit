import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sponsorship } from './sponsorship.entity';
import { SponsoredToken } from './sponsored-token.entity';

/**
 * Sponsorship Usage Entity
 * 
 * Immutable ledger of all usage against sponsorships.
 * Privacy-safe: no prompt/completion content is stored.
 */
@Entity('sponsorship_usage')
export class SponsorshipUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Links
  @ManyToOne(() => Sponsorship, (sponsorship) => sponsorship.usageRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sponsorshipId' })
  sponsorship: Sponsorship;

  @Column()
  @Index()
  sponsorshipId: string;

  @ManyToOne(() => SponsoredToken, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sponsoredTokenId' })
  sponsoredToken: SponsoredToken;

  @Column({ nullable: true })
  sponsoredTokenId: string;

  // Recipient tracking (which org/project used the token)
  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  projectId: string;

  // Request metadata (privacy-safe - no prompt content)
  @Column()
  model: string;

  @Column()
  provider: string;

  @Column({ default: 0 })
  inputTokens: number;

  @Column({ default: 0 })
  outputTokens: number;

  @Column({ default: 0 })
  totalTokens: number;

  @Column({ type: 'decimal', precision: 16, scale: 8, default: 0 })
  costUsd: number;

  // Request context (no PII)
  @Column({ nullable: true })
  requestId: string;

  @Column({ default: false })
  isStreaming: boolean;

  @Column({ nullable: true })
  statusCode: number;

  // Timestamp
  @Column({ type: 'timestamp', default: () => 'now()' })
  @Index()
  timestamp: Date;
}

