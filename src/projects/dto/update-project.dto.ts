import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsIn,
  IsArray,
  IsBoolean,
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
  @IsInt()
  dailyRequestLimit?: number;

  @IsOptional()
  @IsInt()
  dailyTokenLimit?: number;

  // Limit period
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  limitPeriod?: 'daily' | 'weekly' | 'monthly';

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
  @IsInt()
  sessionRequestLimit?: number;

  @IsOptional()
  @IsInt()
  sessionTokenLimit?: number;

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
}
