import { IsString, IsNotEmpty, IsIn, IsOptional, IsUrl } from 'class-validator';

export class StoreKeyDto {
  @IsString()
  @IsNotEmpty()
  identity: string;

  @IsIn(['openai', 'anthropic', 'google', 'xai', 'openrouter'])
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter';

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;
}
