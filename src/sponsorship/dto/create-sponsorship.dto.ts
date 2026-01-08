import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
  IsUUID,
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

export class CreateSponsorshipDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MaxLength(512)
  recipientIdentity: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientName?: string;

  @IsEnum(['tokens', 'requests'])
  budgetType: 'tokens' | 'requests';

  @IsOptional()
  @IsEnum(['monthly', 'one-time'])
  renewalType?: 'monthly' | 'one-time';

  @IsInt()
  @Min(1)
  budget: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

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

