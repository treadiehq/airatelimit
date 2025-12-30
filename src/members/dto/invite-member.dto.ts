import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { MemberRole } from '../organization-member.entity';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(['owner', 'admin', 'member'])
  role: MemberRole;
}

