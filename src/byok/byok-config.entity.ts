import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

/**
 * BYOK Config Entity
 * 
 * Organization-level configuration for BYOK (Bring Your Own Key).
 */
@Entity('byok_configs')
export class ByokConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ unique: true })
  @Index()
  organizationId: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', default: ['openai', 'anthropic', 'google', 'xai'] })
  allowedProviders: string[];

  @Column({ default: true })
  validateKeysOnSave: boolean;

  @Column({ default: true })
  trackUsage: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
