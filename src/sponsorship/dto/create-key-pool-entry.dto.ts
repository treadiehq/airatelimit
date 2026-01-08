import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsEmail,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateKeyPoolEntryDto {
  @IsUUID()
  projectId: string;

  @IsEnum(['openai', 'anthropic', 'google', 'xai', 'other'])
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'other';

  @IsString()
  @MaxLength(512)
  apiKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyTokenLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyCostLimitCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedModels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIdentities?: string[];

  // Email for anonymous contributors (notifications & management link recovery)
  @IsOptional()
  @IsEmail()
  contributorEmail?: string;
}

