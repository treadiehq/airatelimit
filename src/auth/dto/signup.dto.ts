import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  organizationName?: string;

  @IsString()
  @IsOptional()
  inviteToken?: string;
}
