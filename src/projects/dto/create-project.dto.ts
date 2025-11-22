import { IsString, IsOptional, IsInt, IsObject, IsIn, IsArray } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  projectKey: string;

  @IsString()
  openaiApiKey: string;

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

