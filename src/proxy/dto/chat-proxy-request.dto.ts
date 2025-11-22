import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatProxyRequestDto {
  @IsString()
  identity: string;

  @IsOptional()
  @IsString()
  tier?: string; // Plan/tier identifier (e.g., 'free', 'pro', 'enterprise')

  @IsString()
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsNumber()
  max_tokens?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  top_p?: number;
}

