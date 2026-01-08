import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  MaxLength,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class NotificationsDto {
  @IsOptional()
  @IsBoolean()
  notifyOnLowBudget?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  lowBudgetThreshold?: number;

  @IsOptional()
  @IsBoolean()
  notifyRecipientOnCreate?: boolean;
}

export class UpdateSponsorshipDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsEnum(['monthly', 'one-time'])
  renewalType?: 'monthly' | 'one-time';

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;
}

