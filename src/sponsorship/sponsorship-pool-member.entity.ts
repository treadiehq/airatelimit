import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { SponsorshipPool } from './sponsorship-pool.entity';
import { Sponsorship } from './sponsorship.entity';

/**
 * Sponsorship Pool Member Entity (Phase 2)
 * 
 * Links sponsorships to pools with pool-specific settings.
 */
@Entity('sponsorship_pool_members')
@Unique(['poolId', 'sponsorshipId'])
export class SponsorshipPoolMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Pool reference
  @ManyToOne(() => SponsorshipPool, (pool) => pool.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poolId' })
  pool: SponsorshipPool;

  @Column()
  @Index()
  poolId: string;

  // Sponsorship reference
  @ManyToOne(() => Sponsorship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sponsorshipId' })
  sponsorship: Sponsorship;

  @Column()
  @Index()
  sponsorshipId: string;

  // Pool-specific settings
  @Column({ default: 0 })
  priority: number;  // Higher = preferred (for priority routing)

  @Column({ default: 1 })
  weight: number;    // For weighted routing

  // Status within pool
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'now()' })
  joinedAt: Date;
}

