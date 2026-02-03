import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  organizationName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'Invalid invite token format',
  })
  inviteToken?: string;
}
