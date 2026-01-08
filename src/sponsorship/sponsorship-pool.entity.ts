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
import { SponsorshipPoolMember } from './sponsorship-pool-member.entity';
import { PoolToken } from './pool-token.entity';

export type PoolRoutingStrategy = 
  | 'proportional'    // Route based on remaining budget ratio
  | 'round_robin'     // Rotate through sponsors
  | 'priority'        // Use sponsors in priority order
  | 'cheapest_first'  // Prefer sponsors with lower costs
  | 'random';         // Random selection

/**
 * Sponsorship Pool Entity (Phase 2)
 * 
 * Allows multiple sponsors to contribute to a shared pool.
 * Recipients create pools and sponsors can join with their sponsorships.
 */
@Entity('sponsorship_pools')
export class SponsorshipPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Owner (recipient who created the pool)
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerOrgId' })
  ownerOrg: Organization;

  @Column()
  @Index()
  ownerOrgId: string;

  // Pool metadata
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Pool-level constraints
  @Column({ type: 'jsonb', nullable: true })
  allowedProviders: string[];

  // Routing strategy (using varchar to avoid TypeORM enum sync issues)
  @Column({ type: 'varchar', length: 20, default: 'proportional' })
  routingStrategy: PoolRoutingStrategy;

  // Status
  @Column({ default: true })
  isActive: boolean;

  // Members (sponsorships in this pool)
  @OneToMany(() => SponsorshipPoolMember, (member) => member.pool)
  members: SponsorshipPoolMember[];

  // Tokens for accessing this pool
  @OneToMany(() => PoolToken, (token) => token.pool)
  tokens: PoolToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

