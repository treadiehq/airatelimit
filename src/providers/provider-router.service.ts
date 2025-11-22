import { Injectable } from '@nestjs/common';
import { Project } from '../projects/projects.entity';
import { ChatProxyRequestDto } from '../proxy/dto/chat-proxy-request.dto';
import { OpenAIProviderService } from './openai-provider.service';

@Injectable()
export class ProviderRouterService {
  constructor(private readonly openaiProvider: OpenAIProviderService) {}

  async forwardChat(project: Project, body: ChatProxyRequestDto): Promise<any> {
    const payload = this.buildPayload(body, false);

    // Route based on provider
    if (project.provider === 'openai') {
      return this.openaiProvider.chat(
        project.openaiApiKey,
        project.baseUrl,
        payload,
      );
    }

    // Placeholder for other providers
    throw new Error(`Unsupported provider: ${project.provider}`);
  }

  async *forwardChatStream(
    project: Project,
    body: ChatProxyRequestDto,
  ): AsyncGenerator<any, void, unknown> {
    const payload = this.buildPayload(body, true);

    // Route based on provider
    if (project.provider === 'openai') {
      yield* this.openaiProvider.chatStream(
        project.openaiApiKey,
        project.baseUrl,
        payload,
      );
      return;
    }

    // Placeholder for other providers
    throw new Error(`Unsupported provider: ${project.provider}`);
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

