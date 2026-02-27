import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sponsorship } from './sponsorship.entity';
import { Organization } from '../organizations/organization.entity';

/**
 * Sponsored Token Entity
 * 
 * Bearer tokens issued to recipients for API access.
 * Token format: spt_live_xxxxxxxx or spt_test_xxxxxxxx
 * 
 * Tokens are hashed with SHA256 for storage and O(1) lookup.
 * The raw token is only shown once on creation.
 */
@Entity('sponsored_tokens')
export class SponsoredToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Link to sponsorship
  @ManyToOne(() => Sponsorship, (sponsorship) => sponsorship.tokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sponsorshipId' })
  sponsorship: Sponsorship;

  @Column()
  @Index()
  sponsorshipId: string;

  // Recipient organization (for claimable sponsorships where multiple orgs can claim)
  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipientOrgId' })
  recipientOrg: Organization;

  @Column({ nullable: true })
  @Index()
  recipientOrgId: string;

  // Token hash (SHA256) for fast O(1) database lookups
  // unique: true already creates an index; no separate @Index() needed
  @Column({ unique: true })
  tokenHash: string;

  // Token hint for display (last 4 chars, e.g., "...ab12")
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

