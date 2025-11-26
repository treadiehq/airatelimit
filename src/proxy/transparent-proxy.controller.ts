import {
  Controller,
  Post,
  All,
  Body,
  Headers,
  Req,
  Res,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { UsageService } from '../usage/usage.service';
import { RuleEngineService } from '../usage/rule-engine.service';
import { RuleAnalyticsService } from '../usage/rule-analytics.service';
import { TransparentProxyService } from './transparent-proxy.service';
import { SecurityService } from '../security/security.service';
import { SecurityEvent } from '../security/security-event.entity';

/**
 * Transparent Proxy Controller
 * 
 * This controller acts as a true transparent proxy - it accepts standard OpenAI/Anthropic
 * API requests, checks rate limits, and forwards them exactly as-is to the provider.
 * 
 * The customer's API key is passed per-request (not stored in our system).
 * 
 * Usage:
 * - Point your OpenAI SDK baseURL to: https://your-proxy.com/v1
 * - Add headers: x-project-key, x-identity, x-tier (optional)
 * - Your Authorization header with your API key is passed through
 */
@Controller('v1')
export class TransparentProxyController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usageService: UsageService,
    private readonly ruleEngineService: RuleEngineService,
    private readonly ruleAnalyticsService: RuleAnalyticsService,
    private readonly transparentProxyService: TransparentProxyService,
    private readonly securityService: SecurityService,
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * OpenAI-compatible chat completions endpoint
   * Mirrors: POST https://api.openai.com/v1/chat/completions
   */
  @Post('chat/completions')
  async chatCompletions(
    @Headers('authorization') authorization: string,
    @Headers('x-project-key') projectKey: string,
    @Headers('x-identity') identity: string,
    @Headers('x-tier') tier: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // Validate required headers
    if (!projectKey) {
      throw new UnauthorizedException('Missing x-project-key header');
    }
    if (!authorization) {
      throw new UnauthorizedException('Missing Authorization header with your API key');
    }
    if (!identity) {
      throw new UnauthorizedException('Missing x-identity header for rate limiting');
    }

    const startTime = Date.now();
    const model = body.model || 'unknown';
    const isStreaming = body.stream === true;

    try {
      // Get project configuration
      const project = await this.projectsService.findByProjectKey(projectKey);

      // SECURITY: Check for prompt injection if enabled
      if (project.securityEnabled && body.messages) {
        const securityResult = this.securityService.checkMessages(
          body.messages,
          project.securityCategories,
        );

        // Run advanced heuristics if enabled
        if (!securityResult.allowed || project.securityHeuristicsEnabled) {
          for (const message of body.messages.filter((m: any) => m.role === 'user')) {
            const heuristicResult = this.securityService.checkAdvancedHeuristics(message.content);
            if (!heuristicResult.allowed) {
              securityResult.allowed = false;
              securityResult.reason = heuristicResult.reason;
              securityResult.pattern = heuristicResult.pattern;
              securityResult.severity = heuristicResult.severity;
              break;
            }
          }
        }

        // Log security event
        if (!securityResult.allowed) {
          await this.securityEventRepository.save({
            projectId: project.id,
            identity,
            pattern: securityResult.pattern || 'unknown',
            severity: securityResult.severity || 'medium',
            reason: securityResult.reason,
            blocked: project.securityMode === 'block',
            messagePreview: body.messages
              .filter((m: any) => m.role === 'user')
              .map((m: any) => m.content?.substring(0, 100))
              .join(' | '),
          });
        }

        // Block if in block mode
        if (!securityResult.allowed && project.securityMode === 'block') {
          res.status(HttpStatus.FORBIDDEN).json({
            error: {
              message: securityResult.reason || 'Request blocked by security policy',
              type: 'security_policy_violation',
              code: 'security_blocked',
            },
          });
          return;
        }
      }

      // Get period start based on project's limit period
      const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');

      // Estimate tokens
      const estimatedTokens = body.max_tokens || 0;

      // Check and update usage
      const usageCheck = await this.usageService.checkAndUpdateUsage({
        project,
        identity,
        tier,
        model,
        periodStart,
        requestedTokens: estimatedTokens,
        requestedRequests: 1,
      });

      // Evaluate rules if configured
      if (usageCheck.allowed && usageCheck.usageCounter && usageCheck.usagePercent) {
        const ruleResult = this.ruleEngineService.evaluateRules({
          project,
          identity,
          tier,
          usage: usageCheck.usageCounter,
          usagePercent: usageCheck.usagePercent,
          requestedTokens: estimatedTokens,
          requestedRequests: 1,
        });

        if (ruleResult.matched && ruleResult.action) {
          if (ruleResult.ruleId && ruleResult.ruleName) {
            await this.ruleAnalyticsService.logTrigger({
              project,
              ruleId: ruleResult.ruleId,
              ruleName: ruleResult.ruleName,
              identity,
              tier,
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
            res.status(HttpStatus.TOO_MANY_REQUESTS).json({
              error: {
                message: ruleResult.action.response?.message || 'Blocked by rate limit rule',
                type: 'rate_limit_exceeded',
                code: 'rule_blocked',
              },
            });
            return;
          }
        }
      }

      if (!usageCheck.allowed) {
        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          error: {
            message: usageCheck.limitResponse?.message || 'Rate limit exceeded',
            type: 'rate_limit_exceeded',
            code: 'limit_exceeded',
          },
        });
        return;
      }

      // Determine provider from model name
      const provider = this.transparentProxyService.detectProvider(model);
      const providerBaseUrl = this.transparentProxyService.getProviderUrl(provider);

      // Log usage check (privacy-safe)
      console.log('Transparent proxy request:', {
        projectId: project.id,
        identity,
        tier,
        model,
        provider,
        streaming: isStreaming,
        latency: Date.now() - startTime,
      });

      if (isStreaming) {
        // Handle streaming response
        await this.handleStreamingRequest(
          res,
          authorization,
          providerBaseUrl,
          body,
          project,
          identity,
          model,
          periodStart,
        );
      } else {
        // Handle regular response
        const providerResponse = await this.transparentProxyService.forwardRequest(
          authorization,
          providerBaseUrl,
          body,
        );

        // Finalize usage with actual tokens
        const actualTokens = providerResponse.usage?.total_tokens || 0;
        if (actualTokens > 0) {
          await this.usageService.finalizeUsage({
            project,
            identity,
            model,
            periodStart,
            actualTokensUsed: actualTokens,
          });
        }

        console.log('Transparent proxy completed:', {
          projectId: project.id,
          identity,
          tokensUsed: actualTokens,
          latency: Date.now() - startTime,
        });

        // Return the exact provider response
        res.json(providerResponse);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Transparent proxy error:', {
        projectKey,
        identity,
        error: error.message,
        latency: Date.now() - startTime,
      });

      // Pass through provider errors
      if (error.response?.data) {
        res.status(error.response.status || 500).json(error.response.data);
        return;
      }

      res.status(500).json({
        error: {
          message: error.message || 'Internal server error',
          type: 'proxy_error',
          code: 'internal_error',
        },
      });
    }
  }

  /**
   * Handle streaming responses
   */
  private async handleStreamingRequest(
    res: Response,
    authorization: string,
    providerBaseUrl: string,
    body: any,
    project: any,
    identity: string,
    model: string,
    periodStart: Date,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let totalTokens = 0;

    try {
      for await (const chunk of this.transparentProxyService.forwardStreamingRequest(
        authorization,
        providerBaseUrl,
        body,
      )) {
        // Track tokens from usage field if available
        if (chunk.usage?.total_tokens) {
          totalTokens = chunk.usage.total_tokens;
        }

        // Forward the chunk exactly as received
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      // Send done signal
      res.write('data: [DONE]\n\n');
      res.end();

      // Finalize usage tracking
      if (totalTokens > 0) {
        await this.usageService.finalizeUsage({
          project,
          identity,
          model,
          periodStart,
          actualTokensUsed: totalTokens,
        });
      }
    } catch (error) {
      console.error('Transparent proxy stream error:', {
        projectId: project.id,
        identity,
        error: error.message,
      });
      res.end();
    }
  }

  private getPeriodStart(limitPeriod: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    const day = now.getUTCDay();

    switch (limitPeriod) {
      case 'daily':
        return new Date(Date.UTC(year, month, date));
      case 'weekly':
        const daysToMonday = (day + 6) % 7;
        return new Date(Date.UTC(year, month, date - daysToMonday));
      case 'monthly':
        return new Date(Date.UTC(year, month, 1));
      default:
        return new Date(Date.UTC(year, month, date));
    }
  }
}

