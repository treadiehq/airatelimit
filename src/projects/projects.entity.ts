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

  @Column({ unique: true, nullable: true })
  projectKey: string;

  // Secret key for programmatic API access (server-side only, never expose to clients)
  // Note: secretKey stores the hashed version, secretKeyPlain is returned once on creation
  @Column({ unique: true, nullable: true })
  secretKey: string;

  // Hashed version of secret key for secure comparison
  @Column({ nullable: true })
  secretKeyHash: string;

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

  // Provider configuration (legacy - single provider)
  @Column({
    type: 'enum',
    enum: ['openai', 'anthropic', 'google', 'xai', 'other'],
    nullable: true,
  })
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'other';

  @Column({ nullable: true })
  baseUrl: string;

  // Stores API key for selected provider (legacy - single provider)
  // Note: Consider encrypting this field as well if still used
  @Column({ nullable: true })
  openaiApiKey: string;

  // Multi-provider configuration (ENCRYPTED at rest)
  // API keys are encrypted using AES-256-GCM before storage
  // Example stored: { "openai": { "apiKey": "enc:iv:tag:ciphertext", "baseUrl": "..." } }
  @Column({ type: 'jsonb', nullable: true })
  providerKeys: Record<string, { apiKey: string; baseUrl?: string }>;

  @Column({ nullable: true })
  dailyRequestLimit: number;

  @Column({ nullable: true })
  dailyTokenLimit: number;

  // Limit period configuration
  @Column({ 
    type: 'enum', 
    enum: ['hourly', 'daily', 'weekly', 'monthly'], 
    default: 'daily',
  })
  limitPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly';

  // Limit type configuration
  @Column({ 
    type: 'enum', 
    enum: ['requests', 'tokens', 'both'], 
    default: 'both',
  })
  limitType: 'requests' | 'tokens' | 'both';

  @Column({ type: 'text', nullable: true })
  limitExceededResponse: string;

  // Upgrade URL for limit-exceeded responses (auto-injected into all limit responses)
  // Supports template variables: {{tier}}, {{identity}}, {{usage}}, {{limit}}
  @Column({ type: 'text', nullable: true })
  upgradeUrl: string;

  // Model-specific limits (JSON structure)
  // Example: { "gpt-4o": { "requestLimit": 100, "tokenLimit": 50000 }, "claude-3-5-sonnet": { ... } }
  @Column({ type: 'jsonb', nullable: true })
  modelLimits: Record<string, { requestLimit?: number; tokenLimit?: number }>;

  // Tier-based limits (JSON structure)
  // Example: { "free": { "requestLimit": 5, "tokenLimit": 1000, "modelLimits": { "gpt-4o": {...} } }, "pro": { ... } }
  @Column({ type: 'jsonb', nullable: true })
  tiers: Record<
    string,
    {
    requestLimit?: number; 
    tokenLimit?: number; 
    customResponse?: any;
      modelLimits?: Record<
        string,
        { requestLimit?: number; tokenLimit?: number }
      >;
      sessionLimits?: { requestLimit?: number; tokenLimit?: number };
    }
  >;

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

  // Security configuration
  @Column({ default: false })
  securityEnabled: boolean;

  @Column({ 
    type: 'enum', 
    enum: ['block', 'log'], 
    default: 'block',
  })
  securityMode: 'block' | 'log';

  @Column({ 
    type: 'jsonb', 
    default: [
      'systemPromptExtraction',
      'roleManipulation',
      'instructionOverride',
      'boundaryBreaking',
      'obfuscation',
      'directLeakage',
    ],
  })
  securityCategories: string[];

  @Column({ default: false })
  securityHeuristicsEnabled: boolean;

  // Privacy / Anonymization configuration ("Tofu Box")
  @Column({ default: false })
  anonymizationEnabled: boolean;

  @Column({
    type: 'jsonb',
    default: {
      detectEmail: true,
      detectPhone: true,
      detectSSN: true,
      detectCreditCard: true,
      detectIpAddress: true,
      maskingStyle: 'placeholder',
    },
  })
  anonymizationConfig: {
    detectEmail?: boolean;
    detectPhone?: boolean;
    detectSSN?: boolean;
    detectCreditCard?: boolean;
    detectIpAddress?: boolean;
    maskingStyle?: 'redact' | 'hash' | 'placeholder';
    customPatterns?: Array<{
      name: string;
      pattern: string;
      replacement?: string;
    }>;
  };

  // Session-based limits configuration
  @Column({ default: false })
  sessionLimitsEnabled: boolean;

  @Column({ type: 'int', nullable: true })
  sessionRequestLimit: number;

  @Column({ type: 'int', nullable: true })
  sessionTokenLimit: number;

  // Session limits can also be tier-specific (stored in tiers.{tierName}.sessionLimits)

  // Visual Flow Designer configuration
  // Stores the nodes and edges from the drag-and-drop flow builder
  @Column({ type: 'jsonb', nullable: true })
  flowConfig: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: any;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>;
  };

  // ====================================
  // SMART MODEL ROUTING CONFIGURATION
  // ====================================

  // Enable smart model routing
  @Column({ default: false })
  routingEnabled: boolean;

  // Routing configuration
  // Determines how requests are routed to different models
  @Column({ type: 'jsonb', nullable: true })
  routingConfig: {
    // Default model to use if no routing rules match
    defaultModel?: string;
    
    // Routing strategy: 'cost' | 'latency' | 'quality' | 'fallback'
    strategy?: 'cost' | 'latency' | 'quality' | 'fallback';
    
    // Fallback chain: try models in order until one succeeds
    fallbackChain?: string[];
    
    // Cost optimization: route to cheaper models for simple queries
    costOptimization?: {
      enabled: boolean;
      // Max tokens threshold - route to cheaper model if under
      tokenThreshold?: number;
      // Cheap model to use for simple queries
      cheapModel?: string;
      // Premium model for complex queries
      premiumModel?: string;
    };
    
    // Model mappings: map requested model to actual model
    // e.g., { "gpt-4": "gpt-4o-mini" } to force cheaper model
    modelMappings?: Record<string, string>;
    
    // Per-tier model overrides
    // e.g., { "free": { "gpt-4o": "gpt-4o-mini" } }
    tierModelOverrides?: Record<string, Record<string, string>>;
  };

  // Budget alerts configuration
  @Column({ type: 'jsonb', nullable: true })
  budgetConfig: {
    // Monthly budget limit in USD
    monthlyBudget?: number;
    // Daily budget limit in USD  
    dailyBudget?: number;
    // Alert thresholds (percentage of budget)
    alertThresholds?: number[];
    // Email to send alerts to
    alertEmail?: string;
    // Action when budget exceeded: 'alert' | 'block'
    budgetAction?: 'alert' | 'block';
  };

  // ====================================
  // PUBLIC ENDPOINTS CONFIGURATION
  // ====================================
  // Allows frontend-only usage without exposing API keys
  // Requests are validated against allowed origins

  // Enable public mode (allows requests from browser without secret key)
  @Column({ default: false })
  publicModeEnabled: boolean;

  // Allowed origins for public mode (e.g., ["https://myapp.com", "https://staging.myapp.com"])
  // Requests are validated against Origin/Referer header
  @Column({ type: 'jsonb', nullable: true })
  allowedOrigins: string[];

  // ====================================
  // IP RESTRICTIONS CONFIGURATION
  // ====================================
  // Enterprise security feature: restrict API access to specific IP ranges

  // Enable IP restrictions (blocks requests from IPs not in allowedIpRanges)
  @Column({ default: false })
  ipRestrictionsEnabled: boolean;

  // Allowed IP addresses or CIDR ranges (e.g., ["10.0.0.0/8", "192.168.1.100", "2001:db8::/32"])
  @Column({ type: 'jsonb', nullable: true })
  allowedIpRanges: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
