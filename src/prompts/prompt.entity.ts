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
 * System Prompt Storage
 *
 * Store system prompts server-side so they're not visible in mobile app code.
 * Reference by name in requests, and the proxy injects the actual content.
 */
@Entity('prompts')
@Index(['projectId', 'name'], { unique: true })
export class Prompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  @Index()
  projectId: string;

  @Column()
  name: string; // e.g., "assistant-v1", "customer-support"

  @Column('text')
  content: string; // The actual system prompt text

  @Column({ nullable: true })
  description: string; // Optional description for dashboard

  @Column({ default: true })
  enabled: boolean;

  // Version tracking for A/B testing or rollback
  @Column({ default: 1 })
  version: number;

  // Optional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

