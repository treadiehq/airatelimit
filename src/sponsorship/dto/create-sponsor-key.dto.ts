import { IsString, IsNotEmpty, IsIn, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateSponsorKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsIn(['openai', 'anthropic', 'google', 'xai'])
  provider: 'openai' | 'anthropic' | 'google' | 'xai';

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  apiKey: string;

  @IsString()
  @IsOptional()
  baseUrl?: string;
}

export class UpdateSponsorKeyDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  baseUrl?: string;
}

