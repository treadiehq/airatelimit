import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyMagicLinkDto {
  @IsNotEmpty()
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'Invalid magic link token format',
  })
  token: string;
}
