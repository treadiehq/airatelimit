import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Project } from '../projects/projects.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  // === Billing Fields (cloud mode only) ===
  
  @Column({ nullable: true })
  @Index()
  stripeCustomerId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ default: 'trial' })
  plan: string; // 'trial' | 'basic' | 'pro' | 'enterprise'

  @Column({ nullable: true })
  trialStartedAt: Date; // When the 7-day trial began (null = use createdAt)

  // === Usage Tracking (for plan limits) ===
  
  @Column({ type: 'int', default: 0 })
  monthlyRequestCount: number; // Requests this billing period

  @Column({ type: 'bigint', default: 0 })
  monthlyTokenCount: number; // Tokens this billing period (for analytics)

  @Column({ nullable: true })
  usagePeriodStart: Date; // Start of current billing period (resets monthly)

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Project, (project) => project.organization)
  projects: Project[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
