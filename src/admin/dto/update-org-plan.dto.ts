import { IsIn, IsString } from 'class-validator';

export class UpdateOrgPlanDto {
  @IsString()
  @IsIn(['trial', 'basic', 'pro', 'enterprise'])
  plan: 'trial' | 'basic' | 'pro' | 'enterprise';
}

