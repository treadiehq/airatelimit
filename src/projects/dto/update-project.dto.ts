import { IsString, IsOptional, IsInt, IsObject, IsIn, IsArray } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  // Provider cannot be changed after creation
  // @IsOptional()
  // @IsIn(['openai', 'anthropic', 'google', 'xai'])
  // provider?: 'openai' | 'anthropic' | 'google' | 'xai';

  @IsOptional()
  @IsString()
  openaiApiKey?: string;

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

  // Tier configuration
  @IsOptional()
  @IsObject()
  tiers?: Record<string, { requestLimit?: number; tokenLimit?: number; customResponse?: any }>;

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
}

