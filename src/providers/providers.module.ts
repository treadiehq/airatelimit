import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProviderRouterService } from './provider-router.service';
import { OpenAIProviderService } from './openai-provider.service';

@Module({
  imports: [HttpModule],
  providers: [ProviderRouterService, OpenAIProviderService],
  exports: [ProviderRouterService],
})
export class ProvidersModule {}

