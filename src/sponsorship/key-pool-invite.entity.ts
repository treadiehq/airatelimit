import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../projects/projects.entity';
import { User } from '../users/user.entity';

/**
 * Key Pool Invite - Shareable link for contributing API keys to a project
 * 
 * Project owners can generate invite links that allow anyone to contribute
 * their API keys to the project's key pool.
 */
@Entity('key_pool_invites')
@Index(['token'], { unique: true })
export class KeyPoolInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The project this invite is for
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  @Index()
  projectId: string;

  // The user who created this invite (project owner)
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column('uuid')
  createdById: string;

  // Unique invite token (used in URL)
  @Column({ length: 64 })
  token: string;

  // Optional: friendly name for this invite
  @Column({ nullable: true })
  name: string;

  // Whether this invite is active
  @Column({ default: true })
  active: boolean;

  // Optional: expiration date
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // Optional: maximum number of contributions allowed
  @Column({ type: 'int', nullable: true })
  maxContributions: number | null;

  // Current number of contributions made via this invite
  @Column({ type: 'int', default: 0 })
  contributionCount: number;

  @CreateDateColumn()
  createdAt: Date;
}

