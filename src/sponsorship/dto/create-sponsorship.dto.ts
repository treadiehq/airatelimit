import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsPositive,
  MaxLength,
  Min,
  IsEmail,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';

export class CreateSponsorshipDto {
  @IsString()
  @IsNotEmpty()
  sponsorKeyId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  // Budget - at least one should be set
  @IsNumber()
  @IsOptional()
  @IsPositive()
  spendCapUsd?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  spendCapTokens?: number;

  // Optional: target recipient email (for invites)
  @IsEmail()
  @IsOptional()
  recipientEmail?: string;

  // Usage constraints
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  allowedModels?: string[];

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxTokensPerRequest?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(1)
  maxRequestsPerMinute?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxRequestsPerDay?: number;

  // Billing period: one-time or monthly recurring
  @IsString()
  @IsOptional()
  @IsIn(['one_time', 'monthly'])
  billingPeriod?: 'one_time' | 'monthly';

  // Temporal
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateSponsorshipDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  // Can increase budget, not decrease below spent
  @IsNumber()
  @IsOptional()
  @IsPositive()
  spendCapUsd?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  spendCapTokens?: number;

  // Constraints can be updated
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  allowedModels?: string[];

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxTokensPerRequest?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxRequestsPerMinute?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxRequestsPerDay?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class RevokeSponsorshipDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

