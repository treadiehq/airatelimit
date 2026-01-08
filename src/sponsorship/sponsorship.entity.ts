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
import { Organization } from '../organizations/organization.entity';
import { Project } from '../projects/projects.entity';

/**
 * Sponsorship - Allows users to donate API credits to others
 * 
 * Use cases:
 * - Sponsor an open source project maintainer with API tokens
 * - Company sponsors community developers
 * - Individual donates Claude/GPT credits to a friend
 */
@Entity('sponsorships')
@Index(['sponsorId', 'recipientIdentity'], { unique: true })
@Index(['projectId', 'recipientIdentity'])
export class Sponsorship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The project this sponsorship is for
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  @Index()
  projectId: string;

  // The sponsor (user donating credits)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sponsorId' })
  sponsor: User;

  @Column('uuid')
  @Index()
  sponsorId: string;

  // The sponsor's organization (for billing/attribution)
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'sponsorOrgId' })
  sponsorOrg: Organization;

  @Column('uuid', { nullable: true })
  sponsorOrgId: string;

  // The recipient identity (email, user ID, or any identity string)
  // This matches the x-identity header used in proxy requests
  @Column()
  @Index()
  recipientIdentity: string;

  // Optional: friendly name for the recipient
  @Column({ nullable: true })
  recipientName: string;

  // Budget configuration
  @Column({
    type: 'enum',
    enum: ['tokens', 'requests'],
    default: 'tokens',
  })
  budgetType: 'tokens' | 'requests';

  // Renewal type: monthly (auto-resets) or one-time (like gifted tokens)
  @Column({
    type: 'enum',
    enum: ['monthly', 'one-time'],
    default: 'monthly',
  })
  renewalType: 'monthly' | 'one-time';

  // Budget limit (tokens, requests, or cents depending on budgetType)
  // For monthly: resets each month. For one-time: total lifetime budget
  @Column({ type: 'int' })
  monthlyBudget: number;

  // Current period usage
  @Column({ type: 'int', default: 0 })
  currentPeriodUsage: number;

  // Total usage across all time
  @Column({ type: 'bigint', default: 0 })
  totalUsage: number;

  // Period tracking
  @Column({ type: 'date', nullable: true })
  currentPeriodStart: Date;

  // Sponsorship status
  @Column({ default: true })
  active: boolean;

  // Optional: expiration date for the sponsorship
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // Optional: custom message from sponsor to recipient
  @Column({ type: 'text', nullable: true })
  message: string;

  // Optional: public sponsorship (shows sponsor name to recipient)
  @Column({ default: true })
  isPublic: boolean;

  // Notification preferences
  @Column({
    type: 'jsonb',
    default: {
      notifyOnLowBudget: true,
      lowBudgetThreshold: 20, // percentage
      notifyRecipientOnCreate: true,
    },
  })
  notifications: {
    notifyOnLowBudget?: boolean;
    lowBudgetThreshold?: number;
    notifyRecipientOnCreate?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

