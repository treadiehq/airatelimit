import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../projects/projects.entity';

/**
 * Per-identity limit overrides
 *
 * Allows setting custom limits for specific identities within a project.
 * These override project-level and tier-level limits when present.
 */
@Entity('identity_limits')
@Index(['projectId', 'identity'], { unique: true })
export class IdentityLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  @Index()
  projectId: string;

  @Column()
  identity: string;

  // Optional limit overrides (null = use default from project/tier)
  @Column({ type: 'int', nullable: true })
  requestLimit: number | null;

  @Column({ type: 'int', nullable: true })
  tokenLimit: number | null;

  // Gifted tokens/requests - bonus credits that don't count toward limits
  @Column({ type: 'int', default: 0 })
  giftedTokens: number;

  @Column({ type: 'int', default: 0 })
  giftedRequests: number;

  // Promotional override - unlimited access until this date
  @Column({ type: 'timestamp', nullable: true })
  unlimitedUntil: Date | null;

  // Optional custom response when this identity hits limits
  @Column({ type: 'jsonb', nullable: true })
  customResponse: any;

  // Optional metadata for your reference (e.g., user email, server name)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Enable/disable this identity's access entirely
  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
