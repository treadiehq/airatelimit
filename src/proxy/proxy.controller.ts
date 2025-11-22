import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ProjectsService } from '../projects/projects.service';
import { UsageService } from '../usage/usage.service';
import { RuleEngineService } from '../usage/rule-engine.service';
import { RuleAnalyticsService } from '../usage/rule-analytics.service';
import { ProxyService } from './proxy.service';
import { ChatProxyRequestDto } from './dto/chat-proxy-request.dto';

@Controller('v1/proxy')
export class ProxyController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usageService: UsageService,
    private readonly ruleEngineService: RuleEngineService,
    private readonly ruleAnalyticsService: RuleAnalyticsService,
    private readonly proxyService: ProxyService,
  ) {}

  @Post('chat')
  async chat(
    @Headers('x-project-key') projectKey: string,
    @Body() body: ChatProxyRequestDto,
  ) {
    // Validate project key header
    if (!projectKey) {
      throw new UnauthorizedException('Missing x-project-key header');
    }

    // PRIVACY: Log only metadata, never prompts or responses
    const startTime = Date.now();

    try {
      // Get project
      const project = await this.projectsService.findByProjectKey(projectKey);

      // Get today's date (UTC midnight)
      const today = this.getTodayUTC();

      // Estimate tokens (actual will be updated after OpenAI response)
      const estimatedTokens = body.max_tokens || 0;

      // Check and update usage with tier support
      const usageCheck = await this.usageService.checkAndUpdateUsage({
        project,
        identity: body.identity,
        tier: body.tier,
        periodStart: today,
        requestedTokens: estimatedTokens,
        requestedRequests: 1,
      });

      // PRIVACY: Log only status, not content
      console.log('Usage check:', {
        projectId: project.id,
        identity: body.identity,
        tier: body.tier,
        allowed: usageCheck.allowed,
        latency: Date.now() - startTime,
      });

      // Evaluate rules if configured
      if (usageCheck.allowed && usageCheck.usageCounter && usageCheck.usagePercent) {
        const ruleResult = this.ruleEngineService.evaluateRules({
          project,
          identity: body.identity,
          tier: body.tier,
          usage: usageCheck.usageCounter,
          usagePercent: usageCheck.usagePercent,
          requestedTokens: estimatedTokens,
          requestedRequests: 1,
        });

        // If a rule matched and action is block or custom_response
        if (ruleResult.matched && ruleResult.action) {
          // Log the rule trigger for analytics
          if (ruleResult.ruleId && ruleResult.ruleName) {
            await this.ruleAnalyticsService.logTrigger({
              project,
              ruleId: ruleResult.ruleId,
              ruleName: ruleResult.ruleName,
              identity: body.identity,
              tier: body.tier,
              condition: ruleResult.condition,
              action: ruleResult.action,
              context: {
                usagePercent: usageCheck.usagePercent,
                requestsUsed: usageCheck.usageCounter.requestsUsed,
                tokensUsed: usageCheck.usageCounter.tokensUsed,
              },
            });
          }

          if (ruleResult.action.type === 'block') {
            throw new HttpException(
              ruleResult.action.response || { error: 'Blocked by rule' },
              HttpStatus.TOO_MANY_REQUESTS,
            );
          } else if (ruleResult.action.type === 'custom_response') {
            throw new HttpException(
              ruleResult.action.response,
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
          // If action.type === 'allow', continue normally
        }
      }

      if (!usageCheck.allowed) {
        throw new HttpException(
          usageCheck.limitResponse,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Forward to OpenAI
      const openaiResponse = await this.proxyService.forwardChat(project, body);

      // Extract actual token usage from OpenAI response
      const actualTokens = openaiResponse.usage?.total_tokens || 0;

      // Finalize usage with actual tokens
      await this.usageService.finalizeUsage({
        project,
        identity: body.identity,
        periodStart: today,
        actualTokensUsed: actualTokens,
      });

      // PRIVACY: Log success without content
      console.log('Request completed:', {
        projectId: project.id,
        identity: body.identity,
        tokensUsed: actualTokens,
        latency: Date.now() - startTime,
      });

      // Return OpenAI response
      return openaiResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // PRIVACY: Log errors without exposing prompts
      console.error('Proxy error:', {
        projectKey,
        identity: body.identity,
        error: error.message,
        latency: Date.now() - startTime,
      });

      throw error;
    }
  }

  @Post('chat/stream')
  async chatStream(
    @Headers('x-project-key') projectKey: string,
    @Body() body: ChatProxyRequestDto,
    @Res() res: Response,
  ) {
    // Validate project key header
    if (!projectKey) {
      throw new UnauthorizedException('Missing x-project-key header');
    }

    // PRIVACY: Log only metadata, never prompts or responses
    const startTime = Date.now();

    try {
      // Get project
      const project = await this.projectsService.findByProjectKey(projectKey);

      // Get today's date (UTC midnight)
      const today = this.getTodayUTC();

      // Estimate tokens
      const estimatedTokens = body.max_tokens || 0;

      // Check usage limits BEFORE streaming with tier support
      const usageCheck = await this.usageService.checkAndUpdateUsage({
        project,
        identity: body.identity,
        tier: body.tier,
        periodStart: today,
        requestedTokens: estimatedTokens,
        requestedRequests: 1,
      });

      // Evaluate rules if configured
      if (usageCheck.allowed && usageCheck.usageCounter && usageCheck.usagePercent) {
        const ruleResult = this.ruleEngineService.evaluateRules({
          project,
          identity: body.identity,
          tier: body.tier,
          usage: usageCheck.usageCounter,
          usagePercent: usageCheck.usagePercent,
          requestedTokens: estimatedTokens,
          requestedRequests: 1,
        });

        // If a rule matched and action is block or custom_response
        if (ruleResult.matched && ruleResult.action) {
          // Log the rule trigger for analytics
          if (ruleResult.ruleId && ruleResult.ruleName) {
            await this.ruleAnalyticsService.logTrigger({
              project,
              ruleId: ruleResult.ruleId,
              ruleName: ruleResult.ruleName,
              identity: body.identity,
              tier: body.tier,
              condition: ruleResult.condition,
              action: ruleResult.action,
              context: {
                usagePercent: usageCheck.usagePercent,
                requestsUsed: usageCheck.usageCounter.requestsUsed,
                tokensUsed: usageCheck.usageCounter.tokensUsed,
              },
            });
          }

          if (ruleResult.action.type === 'block' || ruleResult.action.type === 'custom_response') {
            res.status(HttpStatus.TOO_MANY_REQUESTS).json(
              ruleResult.action.response || { error: 'Blocked by rule' }
            );
            return;
          }
          // If action.type === 'allow', continue normally
        }
      }

      if (!usageCheck.allowed) {
        // Return normal JSON response for limit exceeded (not streaming)
        res.status(HttpStatus.TOO_MANY_REQUESTS).json(usageCheck.limitResponse);
        return;
      }

      // Setup SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let totalTokens = 0;

      try {
        // Stream from provider
        for await (const chunk of this.proxyService.forwardChatStream(
          project,
          body,
        )) {
          // Send SSE format
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);

          // Track tokens from usage field if available
          if (chunk.usage?.total_tokens) {
            totalTokens = chunk.usage.total_tokens;
          }
        }

        // Send done signal
        res.write('data: [DONE]\n\n');
        res.end();

        // Finalize usage tracking
        if (totalTokens > 0) {
          await this.usageService.finalizeUsage({
            project,
            identity: body.identity,
            periodStart: today,
            actualTokensUsed: totalTokens,
          });
        }

        // PRIVACY: Log success without content
        console.log('Stream completed:', {
          projectId: project.id,
          identity: body.identity,
          tokensUsed: totalTokens,
          latency: Date.now() - startTime,
        });
      } catch (streamError) {
        // PRIVACY: Log error without exposing content
        console.error('Stream error:', {
          projectId: project.id,
          identity: body.identity,
          error: streamError.message,
        });
        res.end();
      }
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
        return;
      }

      // PRIVACY: Log errors without exposing prompts
      console.error('Proxy stream error:', {
        projectKey,
        identity: body.identity,
        error: error.message,
        latency: Date.now() - startTime,
      });

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}

