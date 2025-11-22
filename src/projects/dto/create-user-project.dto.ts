import { IsString, IsOptional, IsInt, IsObject, IsIn, IsArray } from 'class-validator';

export class CreateUserProjectDto {
  @IsString()
  name: string;

  @IsString()
  openaiApiKey: string;

  @IsOptional()
  @IsInt()
  dailyRequestLimit?: number;

  @IsOptional()
  @IsInt()
  dailyTokenLimit?: number;

  // Phase 1: Limit type
  @IsOptional()
  @IsIn(['requests', 'tokens', 'both'])
  limitType?: 'requests' | 'tokens' | 'both';

  @IsOptional()
  @IsObject()
  limitExceededResponse?: any;

  // Phase 2: Tier configuration
  @IsOptional()
  @IsObject()
  tiers?: Record<string, { requestLimit?: number; tokenLimit?: number; customResponse?: any }>;

  // Phase 3: Rules configuration
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

