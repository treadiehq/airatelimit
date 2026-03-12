import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedProviders?: string[];

  @IsOptional()
  @IsBoolean()
  validateKeysOnSave?: boolean;

  @IsOptional()
  @IsBoolean()
  trackUsage?: boolean;
}
