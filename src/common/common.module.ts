import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoService } from './crypto.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CryptoService, RateLimitService],
  exports: [CryptoService, RateLimitService],
})
export class CommonModule {}

