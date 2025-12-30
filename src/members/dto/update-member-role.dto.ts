import { IsEnum } from 'class-validator';
import { MemberRole } from '../organization-member.entity';

export class UpdateMemberRoleDto {
  @IsEnum(['owner', 'admin', 'member'])
  role: MemberRole;
}

