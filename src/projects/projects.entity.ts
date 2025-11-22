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

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  projectKey: string;

  // Owner relationship
  @ManyToOne(() => User, (user) => user.projects, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ nullable: true })
  ownerId: string;

  // Organization relationship
  @ManyToOne(() => Organization, (organization) => organization.projects)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  @Index()
  organizationId: string;

  // Provider configuration
  @Column({
    type: 'enum',
    enum: ['openai', 'anthropic', 'google', 'xai', 'other'],
    default: 'openai',
  })
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'other';

  @Column({ default: 'https://api.openai.com/v1/chat/completions' })
  baseUrl: string;

  // TODO: Encrypt at rest in production
  // Stores API key for selected provider (OpenAI, Anthropic, Google, or xAI)
  @Column()
  openaiApiKey: string;

  @Column({ nullable: true })
  dailyRequestLimit: number;

  @Column({ nullable: true })
  dailyTokenLimit: number;

  // Limit period configuration
  @Column({ 
    type: 'enum', 
    enum: ['daily', 'weekly', 'monthly'], 
    default: 'daily' 
  })
  limitPeriod: 'daily' | 'weekly' | 'monthly';

  // Limit type configuration
  @Column({ 
    type: 'enum', 
    enum: ['requests', 'tokens', 'both'], 
    default: 'both' 
  })
  limitType: 'requests' | 'tokens' | 'both';

  @Column({ type: 'text', nullable: true })
  limitExceededResponse: string;

  // Model-specific limits (JSON structure)
  // Example: { "gpt-4o": { "requestLimit": 100, "tokenLimit": 50000 }, "claude-3-5-sonnet": { ... } }
  @Column({ type: 'jsonb', nullable: true })
  modelLimits: Record<string, { requestLimit?: number; tokenLimit?: number }>;

  // Tier-based limits (JSON structure)
  // Example: { "free": { "requestLimit": 5, "tokenLimit": 1000, "modelLimits": { "gpt-4o": {...} } }, "pro": { ... } }
  @Column({ type: 'jsonb', nullable: true })
  tiers: Record<string, { 
    requestLimit?: number; 
    tokenLimit?: number; 
    customResponse?: any;
    modelLimits?: Record<string, { requestLimit?: number; tokenLimit?: number }>;
  }>;

  // Visual rule engine (JSON structure)
  // Example: [{ "condition": { "type": "usage_percent", "threshold": 80 }, "action": { "type": "response", "data": {...} } }]
  @Column({ type: 'jsonb', nullable: true })
  rules: Array<{
    id: string;
    name: string;
    enabled: boolean;
    condition: {
      type: 'usage_percent' | 'usage_absolute' | 'tier_match' | 'composite';
      metric?: 'requests' | 'tokens';
      operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
      threshold?: number;
      tierValue?: string;
      conditions?: any[]; // For composite conditions
    };
    action: {
      type: 'allow' | 'block' | 'custom_response';
      response?: any;
      deepLink?: string;
    };
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

