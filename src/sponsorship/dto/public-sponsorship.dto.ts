import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsPositive,
  MaxLength,
  IsEmail,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';

/**
 * DTO for creating a sponsorship via the public badge flow.
 * Supports both logged-in and anonymous sponsors.
 */
export class CreatePublicSponsorshipDto {
  // Sponsor's API key (raw, will be encrypted)
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  // Provider for the API key
  @IsString()
  @IsNotEmpty()
  @IsIn(['openai', 'anthropic', 'google', 'xai'])
  provider: 'openai' | 'anthropic' | 'google' | 'xai';

  // Sponsor's email (required for anonymous sponsors, optional if logged in)
  @IsEmail()
  @IsOptional()
  sponsorEmail?: string;

  // Sponsorship name (auto-generated if not provided)
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  // Optional description
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
  maxRequestsPerMinute?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxRequestsPerDay?: number;
}

/**
 * Response after creating a public sponsorship
 */
export class PublicSponsorshipResponseDto {
  id: string;
  name: string;
  recipientUsername: string;
  spendCapUsd?: number;
  provider: string;
  status: string;
  // Only returned for anonymous sponsors
  managementToken?: string;
  createdAt: Date;
}

/**
 * DTO for managing a sponsorship via magic link
 */
export class ManageSponsorshipDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
