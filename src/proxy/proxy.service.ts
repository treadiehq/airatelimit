import { Injectable } from '@nestjs/common';
import { Project } from '../projects/projects.entity';
import { ChatProxyRequestDto } from './dto/chat-proxy-request.dto';
import { ProviderRouterService } from '../providers/provider-router.service';

@Injectable()
export class ProxyService {
  constructor(private readonly providerRouter: ProviderRouterService) {}

  async forwardChat(project: Project, body: ChatProxyRequestDto) {
    // PRIVACY: ProviderRouter handles the request, never logs full payload
    return this.providerRouter.forwardChat(project, body);
  }

  async *forwardChatStream(
    project: Project,
    body: ChatProxyRequestDto,
  ): AsyncGenerator<any, void, unknown> {
    // PRIVACY: ProviderRouter handles streaming, never logs content
    yield* this.providerRouter.forwardChatStream(project, body);
  }
}

