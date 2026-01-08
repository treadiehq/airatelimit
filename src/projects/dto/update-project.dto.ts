import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsIn,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  // Provider can be set during initial configuration (before project key is generated)
  // Legacy single-provider configuration
  @IsOptional()
  @IsIn(['openai', 'anthropic', 'google', 'xai', 'other'])
  provider?: 'openai' | 'anthropic' | 'google' | 'xai' | 'other';

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  openaiApiKey?: string;

  // Multi-provider configuration
  // Example: { "openai": { "apiKey": "sk-...", "baseUrl": "..." }, "anthropic": { "apiKey": "sk-ant-..." } }
  @IsOptional()
  @IsObject()
  providerKeys?: Record<string, { apiKey: string; baseUrl?: string }>;

  @IsOptional()
  @ValidateIf((o) => o.dailyRequestLimit !== null && o.dailyRequestLimit !== '')
  @IsInt()
  dailyRequestLimit?: number | null;

  @IsOptional()
  @ValidateIf((o) => o.dailyTokenLimit !== null && o.dailyTokenLimit !== '')
  @IsInt()
  dailyTokenLimit?: number | null;

  // Limit period
  @IsOptional()
  @IsIn(['hourly', 'daily', 'weekly', 'monthly'])
  limitPeriod?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  // Limit type
  @IsOptional()
  @IsIn(['requests', 'tokens', 'both'])
  limitType?: 'requests' | 'tokens' | 'both';

  @IsOptional()
  @IsObject()
  limitExceededResponse?: any;

  // Upgrade URL for limit-exceeded responses
  @IsOptional()
  @IsString()
  upgradeUrl?: string;

  // Model-specific limits
  @IsOptional()
  @IsObject()
  modelLimits?: Record<string, { requestLimit?: number; tokenLimit?: number }>;

  // Tier configuration
  @IsOptional()
  @IsObject()
  tiers?: Record<
    string,
    {
      requestLimit?: number;
      tokenLimit?: number;
      customResponse?: any;
      modelLimits?: Record<
        string,
        { requestLimit?: number; tokenLimit?: number }
      >;
    }
  >;

  // Rules configuration
  @IsOptional()
  @IsArray()
  rules?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    condition: any;
    action: any;
  }>;

  // Security configuration
  @IsOptional()
  @IsBoolean()
  securityEnabled?: boolean;

  @IsOptional()
  @IsIn(['block', 'log'])
  securityMode?: 'block' | 'log';

  @IsOptional()
  @IsArray()
  securityCategories?: string[];

  @IsOptional()
  @IsBoolean()
  securityHeuristicsEnabled?: boolean;

  // Privacy / Anonymization configuration
  @IsOptional()
  @IsBoolean()
  anonymizationEnabled?: boolean;

  @IsOptional()
  @IsObject()
  anonymizationConfig?: {
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

  // Session-based limits
  @IsOptional()
  @IsBoolean()
  sessionLimitsEnabled?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.sessionRequestLimit !== null && o.sessionRequestLimit !== '')
  @IsInt()
  sessionRequestLimit?: number | null;

  @IsOptional()
  @ValidateIf((o) => o.sessionTokenLimit !== null && o.sessionTokenLimit !== '')
  @IsInt()
  sessionTokenLimit?: number | null;

  // Visual Flow Designer configuration
  @IsOptional()
  @IsObject()
  flowConfig?: {
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

  // Smart Model Routing configuration
  @IsOptional()
  @IsBoolean()
  routingEnabled?: boolean;

  @IsOptional()
  @IsObject()
  routingConfig?: {
    defaultModel?: string;
    strategy?: 'cost' | 'latency' | 'quality' | 'fallback';
    fallbackChain?: string[];
    costOptimization?: {
      enabled: boolean;
      tokenThreshold?: number;
      cheapModel?: string;
      premiumModel?: string;
    };
    modelMappings?: Record<string, string>;
    tierModelOverrides?: Record<string, Record<string, string>>;
  };

  // Budget alerts configuration
  @IsOptional()
  @IsObject()
  budgetConfig?: {
    monthlyBudget?: number;
    dailyBudget?: number;
    alertThresholds?: number[];
    alertEmail?: string;
    budgetAction?: 'alert' | 'block';
  };

  // Public endpoints configuration
  // Allows frontend-only usage without exposing API keys
  @IsOptional()
  @IsBoolean()
  publicModeEnabled?: boolean;

  // Allowed origins for public mode (e.g., ["https://myapp.com"])
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];

  // Key pool / sponsorship configuration
  // Enables load balancing across contributed API keys
  @IsOptional()
  @IsBoolean()
  keyPoolEnabled?: boolean;

  // Load balancing strategy for pooled keys
  @IsOptional()
  @IsEnum(['weighted-random', 'round-robin', 'least-used', 'priority'])
  keyPoolStrategy?: 'weighted-random' | 'round-robin' | 'least-used' | 'priority';
}
