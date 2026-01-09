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
import { Sponsorship } from './sponsorship.entity';

export type SponsorKeyProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter';

/**
 * Sponsor Key Entity
 * 
 * Represents a provider API key registered by a sponsor.
 * Keys are encrypted at rest using AES-256-GCM.
 */
@Entity('sponsor_keys')
export class SponsorKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Owner organization (sponsor)
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  @Index()
  organizationId: string;

  // Provider info
  @Column()
  provider: SponsorKeyProvider;

  @Column()
  name: string;

  // Encrypted API key (AES-256-GCM via CryptoService)
  @Column({ type: 'text' })
  encryptedApiKey: string;

  // Key hint for display (last 4 chars, e.g., "...ab12")
  @Column({ length: 8, nullable: true })
  keyHint: string;

  // Optional: base URL override for enterprise/custom deployments
  @Column({ nullable: true })
  baseUrl: string;

  // Soft delete
  @Column({ default: false })
  isDeleted: boolean;

  // Sponsorships using this key
  @OneToMany(() => Sponsorship, (sponsorship) => sponsorship.sponsorKey)
  sponsorships: Sponsorship[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

