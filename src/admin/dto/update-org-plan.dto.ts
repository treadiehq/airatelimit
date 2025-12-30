import { IsIn, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateOrgPlanDto {
  @IsString()
  @IsIn(['trial', 'basic', 'pro', 'enterprise'])
  plan: 'trial' | 'basic' | 'pro' | 'enterprise';

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number; // null/undefined = no expiry (lifetime)
}
