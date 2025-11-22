import { Injectable } from '@nestjs/common';
import { Project } from '../projects/projects.entity';
import { ChatProxyRequestDto } from '../proxy/dto/chat-proxy-request.dto';
import { OpenAIProviderService } from './openai-provider.service';
import { AnthropicProviderService } from './anthropic-provider.service';
import { GoogleProviderService } from './google-provider.service';
import { XAIProviderService } from './xai-provider.service';

@Injectable()
export class ProviderRouterService {
  constructor(
    private readonly openaiProvider: OpenAIProviderService,
    private readonly anthropicProvider: AnthropicProviderService,
    private readonly googleProvider: GoogleProviderService,
    private readonly xaiProvider: XAIProviderService,
  ) {}

  async forwardChat(project: Project, body: ChatProxyRequestDto): Promise<any> {
    const payload = this.buildPayload(body, false);

    // Route based on provider
    switch (project.provider) {
      case 'openai':
        return this.openaiProvider.chat(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
      case 'anthropic':
        return this.anthropicProvider.chat(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
      case 'google':
        return this.googleProvider.chat(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
      case 'xai':
        return this.xaiProvider.chat(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
      case 'other':
        // Treat "other" providers as OpenAI-compatible
        return this.openaiProvider.chat(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
      default:
        throw new Error(`Unsupported provider: ${project.provider}`);
    }
  }

  async *forwardChatStream(
    project: Project,
    body: ChatProxyRequestDto,
  ): AsyncGenerator<any, void, unknown> {
    const payload = this.buildPayload(body, true);

    // Route based on provider
    switch (project.provider) {
      case 'openai':
        yield* this.openaiProvider.chatStream(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
        return;
      case 'anthropic':
        yield* this.anthropicProvider.chatStream(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
        return;
      case 'google':
        yield* this.googleProvider.chatStream(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
        return;
      case 'xai':
        yield* this.xaiProvider.chatStream(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
        return;
      case 'other':
        // Treat "other" providers as OpenAI-compatible
        yield* this.openaiProvider.chatStream(
          project.openaiApiKey,
          project.baseUrl,
          payload,
        );
        return;
      default:
        throw new Error(`Unsupported provider: ${project.provider}`);
    }
  }

  private buildPayload(body: ChatProxyRequestDto, stream: boolean): any {
    return {
      model: body.model,
      messages: body.messages,
      max_tokens: body.max_tokens,
      temperature: body.temperature ?? 0.7,
      top_p: body.top_p ?? 1,
      stream,
    };
  }
}

