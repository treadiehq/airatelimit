import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength, MinLength, IsBoolean, IsArray } from 'class-validator';

export class CreateSponsorKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsIn(['openai', 'anthropic', 'google', 'xai', 'openrouter'])
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter';

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  apiKey: string;

  @IsString()
  @IsOptional()
  baseUrl?: string;

  // IP Restrictions
  @IsBoolean()
  @IsOptional()
  ipRestrictionsEnabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIpRanges?: string[];
}

export class UpdateSponsorKeyDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  baseUrl?: string;

  // IP Restrictions
  @IsBoolean()
  @IsOptional()
  ipRestrictionsEnabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIpRanges?: string[];
}

