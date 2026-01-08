import {
  Controller,
  Post,
  Body,
  Headers,
  Res,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  HttpCode,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { UsageService } from '../usage/usage.service';
import { TransparentProxyService } from './transparent-proxy.service';
import { SecurityService } from '../security/security.service';
import { AnonymizationService } from '../anonymization/anonymization.service';
import { FlowExecutorService } from '../flow/flow-executor.service';
import { SecurityEvent } from '../security/security-event.entity';
import { AnonymizationLog } from '../anonymization/anonymization-log.entity';
import { PricingService } from '../pricing/pricing.service';
import { validateProxyHeaders } from './dto/proxy-headers.dto';
import { PromptsService } from '../prompts/prompts.service';
import { UsageLimitService } from '../common/services/usage-limit.service';
import { KeyPoolService } from '../sponsorship/key-pool.service';
import { SponsorshipService } from '../sponsorship/sponsorship.service';
import { isCloudMode } from '../config/features';
import { LicenseGuard } from '../common/guards/license.guard';

// ====================================
// SECURITY CONSTANTS
// ====================================
const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 500000; // 500k chars per message
const MAX_MODEL_LENGTH = 128;
const MAX_PROMPT_LENGTH = 100000; // 100k chars for image prompts
const STREAMING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max streaming

/**
 * Transparent Proxy Controller
 * 
 * This controller acts as a true transparent proxy - it accepts standard OpenAI/Anthropic
 * API requests, checks rate limits, and forwards them exactly as-is to the provider.
 * 
 * The customer's API key is passed per-request (not stored in our system).
 * 
 * Usage:
 * - Point your OpenAI SDK baseURL to: https://api.airatelimit.com/v1
 * - Add headers: x-project-key, x-identity, x-tier (optional)
 * - Your Authorization header with your API key is passed through
 */
@Controller('v1')
@UseGuards(LicenseGuard)  // Blocks all requests if enterprise license is expired
export class TransparentProxyController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usageService: UsageService,
    private readonly transparentProxyService: TransparentProxyService,
    private readonly securityService: SecurityService,
    private readonly anonymizationService: AnonymizationService,
    private readonly pricingService: PricingService,
    private readonly flowExecutorService: FlowExecutorService,
    private readonly promptsService: PromptsService,
    private readonly usageLimitService: UsageLimitService,
    private readonly keyPoolService: KeyPoolService,
    private readonly sponsorshipService: SponsorshipService,
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
    @InjectRepository(AnonymizationLog)
    private readonly anonymizationLogRepository: Repository<AnonymizationLog>,
  ) {}

  /**
   * OpenAI-compatible chat completions endpoint
   * Mirrors: POST https://api.openai.com/v1/chat/completions
   */
  @Post('chat/completions')
  @HttpCode(200)
  async chatCompletions(
    @Headers('authorization') authorization: string,
    @Headers('x-project-key') projectKey: string,
    @Headers('x-identity') identity: string,
    @Headers('x-tier') tier: string,
    @Headers('x-session') session: string,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // ====================================
    // SECURITY: Validate headers
    // ====================================
    const headerValidation = validateProxyHeaders({
      projectKey,
      identity,
      tier,
      session,
    });
    if (!headerValidation.valid) {
      throw new BadRequestException(headerValidation.error);
    }

    // ====================================
    // NATIVE FORMAT SUPPORT
    // Detect and transform native SDK formats to OpenAI format
    // ====================================
    let workingBody = body;
    let responseFormat: 'openai' | 'gemini' | 'anthropic' = 'openai';

    // Check for native Gemini format (uses 'contents' instead of 'messages')
    if (this.isNativeGeminiFormat(body)) {
      const { transformed, originalFormat } = this.transformGeminiToOpenAI(body);
      workingBody = transformed;
      responseFormat = originalFormat;
      console.log('Transformed native Gemini format to OpenAI format:', {
        originalContentsCount: body.contents?.length || 0,
        transformedMessagesCount: transformed.messages?.length || 0,
        model: transformed.model,
      });
    }
    // Check for native Anthropic format (has top-level 'system' string)
    else if (this.isNativeAnthropicFormat(body)) {
      workingBody = this.transformAnthropicNativeToOpenAI(body);
      responseFormat = 'anthropic';
      console.log('Transformed native Anthropic format to OpenAI format:', {
        hasTopLevelSystem: !!body.system,
        messagesCount: workingBody.messages?.length || 0,
        model: workingBody.model,
      });
    }

    // ====================================
    // SECURITY: Validate request body
    // ====================================
    this.validateChatCompletionsBody(workingBody);

    const startTime = Date.now();
    let model = workingBody.model || 'unknown';
    const originalModel = model; // Keep track of original for logging
    const isStreaming = workingBody.stream === true;
    const sessionId = session || '';

    try {
      // Get project configuration
      const project = await this.projectsService.findByProjectKey(projectKey);

      // ====================================
      // PUBLIC MODE: Origin validation for frontend-safe endpoints
      // ====================================
      if (project.publicModeEnabled) {
        // Validate origin if allowedOrigins is configured
        if (project.allowedOrigins && project.allowedOrigins.length > 0) {
          const requestOrigin = origin || this.extractOriginFromReferer(referer);
          if (!requestOrigin) {
            throw new UnauthorizedException({
              error: 'origin_required',
              message: 'Public mode requires Origin or Referer header for security. This endpoint is configured for browser-based access only.',
            });
          }
          
          if (!this.isOriginAllowed(requestOrigin, project.allowedOrigins)) {
            console.warn('Public mode: Origin rejected', {
              projectId: project.id,
              requestOrigin,
              allowedOrigins: project.allowedOrigins,
            });
            throw new UnauthorizedException({
              error: 'origin_not_allowed',
              message: `Origin "${requestOrigin}" is not allowed. Configure allowed origins in the dashboard.`,
            });
          }
          
          console.log('Public mode: Origin validated', {
            projectId: project.id,
            origin: requestOrigin,
          });
        }
      }

      // ====================================
      // PLAN LIMIT CHECK (cloud mode only)
      // Block if organization has exceeded monthly request limit
      // ====================================
      if (isCloudMode() && project.organizationId) {
        const usageCheck = await this.usageLimitService.checkRequestLimit(project.organizationId);
        if (!usageCheck.allowed) {
          throw new HttpException(
            {
              error: {
                message: usageCheck.reason || 'Monthly request limit exceeded',
                type: 'plan_limit_exceeded',
                code: 'rate_limit_exceeded',
                param: null,
              },
              usage: {
                current: usageCheck.currentUsage,
                limit: usageCheck.limit,
                resets_at: usageCheck.resetAt.toISOString(),
              },
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // ====================================
      // SYSTEM PROMPT INJECTION
      // If request includes 'systemPrompt' field (name reference), inject the content
      // ====================================
      if (workingBody.systemPrompt && typeof workingBody.systemPrompt === 'string') {
        const promptContent = await this.promptsService.getContent(project.id, workingBody.systemPrompt);
        if (promptContent) {
          // Inject system message at the beginning
          workingBody.messages = [
            { role: 'system', content: promptContent },
            ...(workingBody.messages || []).filter((m: any) => m.role !== 'system'),
          ];
          console.log('Injected system prompt:', {
            projectId: project.id,
            promptName: workingBody.systemPrompt,
            identity,
          });
        }
        // Remove the custom field before forwarding to provider
        delete workingBody.systemPrompt;
      }

      // ====================================
      // RESOLVE API KEY: Stored keys, key pool, or pass-through
      // ====================================
      // Detect provider from model to look up stored key (may be re-detected after smart routing)
      let provider = this.transparentProxyService.detectProvider(model);
      let resolvedAuthorization = authorization;
      let pooledKeyEntry: { id: string } | null = null; // Track if using pooled key for usage attribution

      if (!authorization) {
        // Priority 1: Check if project has stored provider keys
        const storedConfig = project.providerKeys?.[provider];
        if (storedConfig?.apiKey) {
          resolvedAuthorization = `Bearer ${storedConfig.apiKey}`;
          console.log('Using stored API key for provider:', {
            projectId: project.id,
            provider,
          });
        } 
        // Priority 2: Check for key pool (sponsored keys / load-balanced pool)
        else if ((project as any).keyPoolEnabled) {
          const poolResult = await this.keyPoolService.selectKey(
            project.id,
            provider,
            {
              model,
              identity,
              strategy: (project as any).keyPoolStrategy || 'weighted-random',
            },
          );

          if (poolResult) {
            resolvedAuthorization = `Bearer ${poolResult.decryptedApiKey}`;
            pooledKeyEntry = { id: poolResult.entry.id };
            console.log('Using pooled API key:', {
              projectId: project.id,
              provider,
              keyPoolEntryId: poolResult.entry.id,
              contributorId: poolResult.entry.contributorId,
            });
          } else {
            throw new UnauthorizedException(
              `No available API keys in pool for ${provider}. Either pass your API key in the Authorization header, configure a key in the dashboard, or wait for sponsors to contribute keys.`,
            );
          }
        }
        // No key available
        else {
          throw new UnauthorizedException(
            `Missing Authorization header. Either pass your ${provider} API key in the Authorization header, or configure it in the dashboard under Provider Keys.`,
          );
        }
      }

      // ====================================
      // SMART MODEL ROUTING
      // ====================================
      if (project.routingEnabled && project.routingConfig) {
        const routedModel = this.applySmartRouting(
          model,
          tier,
          project.routingConfig,
          body,
        );
        if (routedModel !== model) {
          // Re-detect provider for the routed model
          const newProvider = this.transparentProxyService.detectProvider(routedModel);
          
          console.log('Smart routing applied:', {
            projectId: project.id,
            originalModel: model,
            routedModel,
            originalProvider: provider,
            newProvider,
            tier,
            strategy: project.routingConfig.strategy,
          });
          
          // If provider changed, we need to re-resolve authorization
          if (newProvider !== provider && !authorization) {
            const storedConfig = project.providerKeys?.[newProvider];
            if (storedConfig?.apiKey) {
              resolvedAuthorization = `Bearer ${storedConfig.apiKey}`;
              pooledKeyEntry = null; // Using stored key now
              console.log('Switched to stored API key for new provider:', {
                projectId: project.id,
                provider: newProvider,
              });
            } 
            // Try key pool for new provider
            else if ((project as any).keyPoolEnabled) {
              const poolResult = await this.keyPoolService.selectKey(
                project.id,
                newProvider,
                { model: routedModel, identity, strategy: (project as any).keyPoolStrategy || 'weighted-random' },
              );
              if (poolResult) {
                resolvedAuthorization = `Bearer ${poolResult.decryptedApiKey}`;
                pooledKeyEntry = { id: poolResult.entry.id };
              } else {
                throw new UnauthorizedException(
                  `Smart routing changed model to ${routedModel} (${newProvider}), but no API key is available. Configure it in the dashboard or wait for sponsors.`,
                );
              }
            }
            else {
              throw new UnauthorizedException(
                `Smart routing changed model to ${routedModel} (${newProvider}), but no API key is configured for ${newProvider}. Configure it in the dashboard under Provider Keys.`,
              );
            }
          }
          
          model = routedModel;
          workingBody.model = routedModel;
          provider = newProvider;
        }
      }

      // PRIVACY: Anonymize PII if enabled ("Tofu Box")
      let processedBody = workingBody;
      if (project.anonymizationEnabled && workingBody.messages) {
        const anonymizationResult = this.anonymizationService.anonymizeMessages(
          workingBody.messages,
          { enabled: true, ...project.anonymizationConfig },
        );

        if (anonymizationResult.piiDetected) {
          // Log anonymization event
          await this.anonymizationLogRepository.save({
            projectId: project.id,
            identity,
            session: sessionId,
            piiTypesDetected: this.extractPiiTypes(
              workingBody.messages,
              project.anonymizationConfig,
            ),
            replacementCount: anonymizationResult.totalReplacements,
            endpoint: 'chat/completions',
          });

          processedBody = { ...workingBody, messages: anonymizationResult.messages };

          console.log('PII anonymized:', {
            projectId: project.id,
            identity,
            replacements: anonymizationResult.totalReplacements,
          });
        }
      }

      // SECURITY: Check for prompt injection if enabled
      if (project.securityEnabled && processedBody.messages) {
        const securityResult = this.securityService.checkMessages(
          processedBody.messages,
          project.securityCategories,
        );

        // Run advanced heuristics if enabled
        // SECURITY: Check ALL messages since the entire array is user-controlled input
        if (!securityResult.allowed || project.securityHeuristicsEnabled) {
          for (const message of processedBody.messages) {
            const heuristicResult =
              this.securityService.checkAdvancedHeuristics(message.content);
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
            messagePreview: processedBody.messages
              .filter((m: any) => m.role === 'user')
              .map((m: any) => m.content?.substring(0, 100))
              .join(' | '),
          });
        }

        // Block if in block mode
        if (!securityResult.allowed && project.securityMode === 'block') {
          res.status(HttpStatus.FORBIDDEN).json({
            error: {
              message:
                securityResult.reason || 'Request blocked by security policy',
              type: 'security_policy_violation',
              code: 'security_blocked',
            },
          });
          return;
        }
      }

      // Get period start based on project's limit period
      const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');

      // Estimate tokens from input messages (for pre-check before request)
      // This closes the race condition window where requests could slip through
      // before actual tokens are counted after streaming
      const estimatedInputTokens = this.estimateInputTokens(processedBody);
      // Estimate output based on typical response ratio or max_tokens if set
      const estimatedOutputTokens = processedBody.max_tokens 
        ? Math.min(processedBody.max_tokens, 500)  // Cap at 500 for estimate
        : Math.ceil(estimatedInputTokens * 0.5);   // Assume 50% of input as output
      const estimatedTokens = estimatedInputTokens + estimatedOutputTokens;

      // FLOW EXECUTION: If project has a valid flow config, use flow executor
      if (this.flowExecutorService.hasValidFlow(project.flowConfig)) {
        const flowResult = await this.flowExecutorService.execute(
          project.flowConfig,
          {
            projectId: project.id,
            identity,
            tier: tier || 'free',
            session: sessionId,
            model,
          },
          project.upgradeUrl,
        );

        if (flowResult.action === 'block' && flowResult.response) {
          // Track savings from blocked request
          const estimatedSavings = this.pricingService.estimateBlockedCost(model);
          await this.usageService.trackBlockedRequest({
            project,
            identity,
            model,
            session: sessionId,
            periodStart,
            estimatedSavings,
          });

          res.status(flowResult.response.status).json(flowResult.response.body);
          return;
        }

        // Flow allows - continue with atomic usage increment below
      }

      // Check session limits FIRST (before incrementing usage)
      // This prevents overcounting when session limits block requests
      if (project.sessionLimitsEnabled && sessionId) {
        const sessionCheck = await this.usageService.checkSessionLimits({
          project,
          identity,
          session: sessionId,
          tier,
          model,
          periodStart,
          requestedTokens: estimatedTokens,
          requestedRequests: 1,
        });

        if (!sessionCheck.allowed) {
          res.status(HttpStatus.TOO_MANY_REQUESTS).json({
            error: {
              message:
                sessionCheck.limitResponse?.message || 'Session limit exceeded',
              type: 'session_limit_exceeded',
              code: 'session_limit_exceeded',
            },
          });
          return;
        }
      }

      // ATOMIC USAGE CHECK: Always perform atomic check-and-increment
      // This prevents race conditions where concurrent requests bypass flow limits
      const usageCheck = await this.usageService.checkAndUpdateUsage({
        project,
        identity,
        tier,
        model,
        session: sessionId,
        periodStart,
        requestedTokens: estimatedTokens,
        requestedRequests: 1,
      });

      if (!usageCheck.allowed) {
        // Track savings from blocked request
        const estimatedSavings = this.pricingService.estimateBlockedCost(model);
        await this.usageService.trackBlockedRequest({
          project,
          identity,
          model,
          session: sessionId,
          periodStart,
          estimatedSavings,
        });

        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          error: {
            message: usageCheck.limitResponse?.message || 'Rate limit exceeded',
            type: 'rate_limit_exceeded',
            code: 'limit_exceeded',
          },
        });
        return;
      }

      // Get provider URL (provider already detected above for stored key resolution)
      const providerBaseUrl =
        this.transparentProxyService.getProviderUrl(provider);

      // Log usage check (privacy-safe)
      console.log('Transparent proxy request:', {
        projectId: project.id,
        identity,
        session: sessionId,
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
          resolvedAuthorization,
          providerBaseUrl,
          processedBody,
          project,
          identity,
          sessionId,
          model,
          periodStart,
          responseFormat,
          pooledKeyEntry,
        );
      } else {
        // Handle regular response
        const providerResponse =
          await this.transparentProxyService.forwardRequest(
          resolvedAuthorization,
          providerBaseUrl,
            processedBody,
        );

        // Finalize usage with actual tokens and cost
        const inputTokens = providerResponse.usage?.prompt_tokens || 0;
        const outputTokens = providerResponse.usage?.completion_tokens || 0;
        const actualTokens = providerResponse.usage?.total_tokens || 0;
        const cost = this.pricingService.calculateCost(
          model,
          inputTokens,
          outputTokens,
        );

        if (actualTokens > 0) {
          await this.usageService.finalizeUsageWithCost({
            project,
            identity,
            model,
            session: sessionId,
            periodStart,
            inputTokens,
            outputTokens,
            cost,
          });

          // Track usage for pooled key (for sponsor attribution)
          if (pooledKeyEntry) {
            await this.keyPoolService.recordUsage(
              pooledKeyEntry.id,
              actualTokens,
              Math.round(cost * 100), // Convert to cents
            );
          }
        }

        console.log('Transparent proxy completed:', {
          projectId: project.id,
          identity,
          session: sessionId,
          tokensUsed: actualTokens,
          costUsd: cost.toFixed(6),
          latency: Date.now() - startTime,
          responseFormat,
          pooledKey: pooledKeyEntry?.id || null,
        });

        // Return response, transforming to native format if needed
        if (responseFormat === 'gemini') {
          res.json(this.transformOpenAIToGemini(providerResponse));
        } else if (responseFormat === 'anthropic') {
          res.json(this.transformOpenAIToAnthropic(providerResponse));
        } else {
          res.json(providerResponse);
        }
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Transparent proxy error:', {
        projectKey,
        identity,
        session: sessionId,
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
   * OpenAI-compatible images generations endpoint
   * Mirrors: POST https://api.openai.com/v1/images/generations
   */
  @Post('images/generations')
  @HttpCode(200)
  async imagesGenerations(
    @Headers('authorization') authorization: string,
    @Headers('x-project-key') projectKey: string,
    @Headers('x-identity') identity: string,
    @Headers('x-tier') tier: string,
    @Headers('x-session') session: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // ====================================
    // SECURITY: Validate headers
    // ====================================
    const headerValidation = validateProxyHeaders({
      projectKey,
      identity,
      tier,
      session,
    });
    if (!headerValidation.valid) {
      throw new BadRequestException(headerValidation.error);
    }

    // ====================================
    // SECURITY: Validate request body
    // ====================================
    this.validateImageGenerationBody(body);

    const startTime = Date.now();
    const model = body.model || 'dall-e-3';
    const sessionId = session || '';
    const numImages = body.n || 1;

    try {
      const project = await this.projectsService.findByProjectKey(projectKey);

      // ====================================
      // RESOLVE API KEY: Stored keys or pass-through
      // ====================================
      const provider = this.transparentProxyService.detectProvider(model);
      let resolvedAuthorization = authorization;

      if (!authorization) {
        const storedConfig = project.providerKeys?.[provider];
        if (storedConfig?.apiKey) {
          resolvedAuthorization = `Bearer ${storedConfig.apiKey}`;
        } else {
          throw new UnauthorizedException(
            `Missing Authorization header. Either pass your ${provider} API key in the Authorization header, or configure it in the dashboard under Provider Keys.`,
          );
        }
      }

      // PRIVACY: Anonymize prompt if enabled
      let processedBody = body;
      if (project.anonymizationEnabled && body.prompt) {
        const anonymizationResult = this.anonymizationService.anonymizePrompt(
          body.prompt,
          { enabled: true, ...project.anonymizationConfig },
        );

        if (anonymizationResult.piiDetected) {
          await this.anonymizationLogRepository.save({
            projectId: project.id,
            identity,
            session: sessionId,
            piiTypesDetected: anonymizationResult.replacements.map(
              (r) => r.type,
            ),
            replacementCount: anonymizationResult.replacements.length,
            endpoint: 'images/generations',
          });

          processedBody = { ...body, prompt: anonymizationResult.text };
        }
      }

      const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');

      // FLOW EXECUTION: If project has a valid flow config, use flow executor
      if (this.flowExecutorService.hasValidFlow(project.flowConfig)) {
        const flowResult = await this.flowExecutorService.execute(
          project.flowConfig,
          {
            projectId: project.id,
            identity,
            tier: tier || 'free',
            session: sessionId,
            model,
          },
          project.upgradeUrl,
        );

        if (flowResult.action === 'block' && flowResult.response) {
          const estimatedSavings = this.pricingService.estimateImageCost(
            model,
            body.size,
            body.quality,
          ) * numImages;
          await this.usageService.trackBlockedRequest({
            project,
            identity,
            model,
            session: sessionId,
            periodStart,
            estimatedSavings,
          });

          res.status(flowResult.response.status).json(flowResult.response.body);
          return;
        }
      }

      // Check session limits FIRST (before incrementing usage)
      if (project.sessionLimitsEnabled && sessionId) {
        const sessionCheck = await this.usageService.checkSessionLimits({
          project,
          identity,
          session: sessionId,
          tier,
          model,
          periodStart,
          requestedTokens: 0,
          requestedRequests: numImages,
        });

        if (!sessionCheck.allowed) {
          res.status(HttpStatus.TOO_MANY_REQUESTS).json({
            error: {
              message:
                sessionCheck.limitResponse?.message || 'Session limit exceeded',
              type: 'session_limit_exceeded',
              code: 'session_limit_exceeded',
            },
          });
          return;
        }
      }

      // For images, count each image as a request (fallback if no flow)
      const usageCheck = await this.usageService.checkAndUpdateUsage({
        project,
        identity,
        tier,
        model,
        session: sessionId,
        periodStart,
        requestedTokens: 0,
        requestedRequests: numImages,
      });

      if (!usageCheck.allowed) {
        const estimatedSavings = this.pricingService.estimateImageCost(
          model,
          body.size,
          body.quality,
        );
        await this.usageService.trackBlockedRequest({
          project,
          identity,
          model,
          session: sessionId,
          periodStart,
          estimatedSavings: estimatedSavings * numImages,
        });

        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          error: {
            message: usageCheck.limitResponse?.message || 'Rate limit exceeded',
            type: 'rate_limit_exceeded',
            code: 'limit_exceeded',
          },
        });
        return;
      }

      // Forward to OpenAI
      const providerResponse =
        await this.transparentProxyService.forwardRequest(
          resolvedAuthorization,
          'https://api.openai.com/v1/images/generations',
          processedBody,
        );

      // Track cost for images
      const cost =
        this.pricingService.estimateImageCost(model, body.size, body.quality) *
        numImages;
      await this.usageService.finalizeUsageWithCost({
        project,
        identity,
        model,
        session: sessionId,
        periodStart,
        inputTokens: 0,
        outputTokens: 0,
        cost,
      });

      console.log('Image generation completed:', {
        projectId: project.id,
        identity,
        model,
        images: numImages,
        costUsd: cost.toFixed(4),
        latency: Date.now() - startTime,
      });

      res.json(providerResponse);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      console.error('Image generation error:', {
        projectKey,
        identity,
        error: error.message,
      });

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
   * OpenAI-compatible embeddings endpoint
   * Mirrors: POST https://api.openai.com/v1/embeddings
   */
  @Post('embeddings')
  @HttpCode(200)
  async embeddings(
    @Headers('authorization') authorization: string,
    @Headers('x-project-key') projectKey: string,
    @Headers('x-identity') identity: string,
    @Headers('x-tier') tier: string,
    @Headers('x-session') session: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // ====================================
    // SECURITY: Validate headers
    // ====================================
    const headerValidation = validateProxyHeaders({
      projectKey,
      identity,
      tier,
      session,
    });
    if (!headerValidation.valid) {
      throw new BadRequestException(headerValidation.error);
    }

    // ====================================
    // SECURITY: Validate request body
    // ====================================
    this.validateEmbeddingsBody(body);

    const startTime = Date.now();
    const model = body.model || 'text-embedding-3-small';
    const sessionId = session || '';

    try {
      const project = await this.projectsService.findByProjectKey(projectKey);

      // ====================================
      // RESOLVE API KEY: Stored keys or pass-through
      // ====================================
      const provider = this.transparentProxyService.detectProvider(model);
      let resolvedAuthorization = authorization;

      if (!authorization) {
        const storedConfig = project.providerKeys?.[provider];
        if (storedConfig?.apiKey) {
          resolvedAuthorization = `Bearer ${storedConfig.apiKey}`;
        } else {
          throw new UnauthorizedException(
            `Missing Authorization header. Either pass your ${provider} API key in the Authorization header, or configure it in the dashboard under Provider Keys.`,
          );
        }
      }

      // PRIVACY: Anonymize input if enabled
      let processedBody = body;
      if (project.anonymizationEnabled && body.input) {
        const inputText = Array.isArray(body.input)
          ? body.input.join(' ')
          : body.input;
        const anonymizationResult = this.anonymizationService.anonymizePrompt(
          inputText,
          { enabled: true, ...project.anonymizationConfig },
        );

        if (anonymizationResult.piiDetected) {
          await this.anonymizationLogRepository.save({
            projectId: project.id,
            identity,
            session: sessionId,
            piiTypesDetected: anonymizationResult.replacements.map(
              (r) => r.type,
            ),
            replacementCount: anonymizationResult.replacements.length,
            endpoint: 'embeddings',
          });

          processedBody = {
            ...body,
            input: Array.isArray(body.input)
              ? [anonymizationResult.text]
              : anonymizationResult.text,
          };
        }
      }

      const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');

      // Estimate tokens for embeddings
      const inputTokens = this.estimateTokens(body.input);

      // FLOW EXECUTION: If project has a valid flow config, use flow executor
      if (this.flowExecutorService.hasValidFlow(project.flowConfig)) {
        const flowResult = await this.flowExecutorService.execute(
          project.flowConfig,
          {
            projectId: project.id,
            identity,
            tier: tier || 'free',
            session: sessionId,
            model,
          },
          project.upgradeUrl,
        );

        if (flowResult.action === 'block' && flowResult.response) {
          const estimatedSavings = this.pricingService.calculateEmbeddingCost(
            model,
            inputTokens,
          );
          await this.usageService.trackBlockedRequest({
            project,
            identity,
            model,
            session: sessionId,
            periodStart,
            estimatedSavings,
          });

          res.status(flowResult.response.status).json(flowResult.response.body);
          return;
        }
      }

      // Check session limits FIRST (before incrementing usage)
      if (project.sessionLimitsEnabled && sessionId) {
        const sessionCheck = await this.usageService.checkSessionLimits({
          project,
          identity,
          session: sessionId,
          tier,
          model,
          periodStart,
          requestedTokens: inputTokens,
          requestedRequests: 1,
        });

        if (!sessionCheck.allowed) {
          res.status(HttpStatus.TOO_MANY_REQUESTS).json({
            error: {
              message:
                sessionCheck.limitResponse?.message || 'Session limit exceeded',
              type: 'session_limit_exceeded',
              code: 'session_limit_exceeded',
            },
          });
          return;
        }
      }

      // Fallback to regular usage check if no flow
      const usageCheck = await this.usageService.checkAndUpdateUsage({
        project,
        identity,
        tier,
        model,
        session: sessionId,
        periodStart,
        requestedTokens: inputTokens,
        requestedRequests: 1,
      });

      if (!usageCheck.allowed) {
        const estimatedSavings = this.pricingService.calculateEmbeddingCost(
          model,
          inputTokens,
        );
        await this.usageService.trackBlockedRequest({
          project,
          identity,
          model,
          session: sessionId,
          periodStart,
          estimatedSavings,
        });

        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          error: {
            message: usageCheck.limitResponse?.message || 'Rate limit exceeded',
            type: 'rate_limit_exceeded',
            code: 'limit_exceeded',
          },
        });
        return;
      }

      // Forward to OpenAI
      const providerResponse =
        await this.transparentProxyService.forwardRequest(
          resolvedAuthorization,
          'https://api.openai.com/v1/embeddings',
          processedBody,
        );

      // Track actual usage
      const actualTokens = providerResponse.usage?.total_tokens || inputTokens;
      const cost = this.pricingService.calculateEmbeddingCost(
        model,
        actualTokens,
      );

      await this.usageService.finalizeUsageWithCost({
        project,
        identity,
        model,
        session: sessionId,
        periodStart,
        inputTokens: actualTokens,
        outputTokens: 0,
        cost,
      });

      console.log('Embeddings completed:', {
        projectId: project.id,
        identity,
        model,
        tokens: actualTokens,
        costUsd: cost.toFixed(6),
        latency: Date.now() - startTime,
      });

      res.json(providerResponse);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      console.error('Embeddings error:', {
        projectKey,
        identity,
        error: error.message,
      });

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
   * OpenAI-compatible audio transcriptions endpoint (Whisper)
   * Mirrors: POST https://api.openai.com/v1/audio/transcriptions
   */
  @Post('audio/transcriptions')
  @HttpCode(200)
  async audioTranscriptions(
    @Headers('authorization') authorization: string,
    @Headers('x-project-key') projectKey: string,
    @Headers('x-identity') identity: string,
    @Headers('x-tier') tier: string,
    @Headers('x-session') session: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // ====================================
    // SECURITY: Validate headers
    // ====================================
    const headerValidation = validateProxyHeaders({
      projectKey,
      identity,
      tier,
      session,
    });
    if (!headerValidation.valid) {
      throw new BadRequestException(headerValidation.error);
    }

    const startTime = Date.now();
    const model = body.model || 'whisper-1';
    const sessionId = session || '';

    try {
      const project = await this.projectsService.findByProjectKey(projectKey);

      // ====================================
      // RESOLVE API KEY: Stored keys or pass-through
      // ====================================
      const provider = this.transparentProxyService.detectProvider(model);
      let resolvedAuthorization = authorization;

      if (!authorization) {
        const storedConfig = project.providerKeys?.[provider];
        if (storedConfig?.apiKey) {
          resolvedAuthorization = `Bearer ${storedConfig.apiKey}`;
        } else {
          throw new UnauthorizedException(
            `Missing Authorization header. Either pass your ${provider} API key in the Authorization header, or configure it in the dashboard under Provider Keys.`,
          );
        }
      }

      const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');

      // FLOW EXECUTION: If project has a valid flow config, use flow executor
      if (this.flowExecutorService.hasValidFlow(project.flowConfig)) {
        const flowResult = await this.flowExecutorService.execute(
          project.flowConfig,
          {
            projectId: project.id,
            identity,
            tier: tier || 'free',
            session: sessionId,
            model,
          },
          project.upgradeUrl,
        );

        if (flowResult.action === 'block' && flowResult.response) {
          const estimatedSavings = this.pricingService.estimateAudioCost(model);
          await this.usageService.trackBlockedRequest({
            project,
            identity,
            model,
            session: sessionId,
            periodStart,
            estimatedSavings,
          });

          res.status(flowResult.response.status).json(flowResult.response.body);
          return;
        }
      }

      // Check session limits FIRST (before incrementing usage)
      if (project.sessionLimitsEnabled && sessionId) {
        const sessionCheck = await this.usageService.checkSessionLimits({
          project,
          identity,
          session: sessionId,
          tier,
          model,
          periodStart,
          requestedTokens: 0,
          requestedRequests: 1,
        });

        if (!sessionCheck.allowed) {
          res.status(HttpStatus.TOO_MANY_REQUESTS).json({
            error: {
              message:
                sessionCheck.limitResponse?.message || 'Session limit exceeded',
              type: 'session_limit_exceeded',
              code: 'session_limit_exceeded',
            },
          });
          return;
        }
      }

      // Audio transcriptions are request-based (per file) - fallback if no flow
      const usageCheck = await this.usageService.checkAndUpdateUsage({
        project,
        identity,
        tier,
        model,
        session: sessionId,
        periodStart,
        requestedTokens: 0,
        requestedRequests: 1,
      });

      if (!usageCheck.allowed) {
        const estimatedSavings = this.pricingService.estimateAudioCost(model);
        await this.usageService.trackBlockedRequest({
          project,
          identity,
          model,
          session: sessionId,
          periodStart,
          estimatedSavings,
        });

        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          error: {
            message: usageCheck.limitResponse?.message || 'Rate limit exceeded',
            type: 'rate_limit_exceeded',
            code: 'limit_exceeded',
          },
        });
        return;
      }

      // Forward to OpenAI (note: this endpoint typically uses multipart/form-data)
      const providerResponse =
        await this.transparentProxyService.forwardRequest(
          resolvedAuthorization,
          'https://api.openai.com/v1/audio/transcriptions',
          body,
        );

      // Track cost (Whisper is $0.006/minute, estimate based on typical file)
      const cost = this.pricingService.estimateAudioCost(model);
      await this.usageService.finalizeUsageWithCost({
        project,
        identity,
        model,
        session: sessionId,
        periodStart,
        inputTokens: 0,
        outputTokens: 0,
        cost,
      });

      console.log('Audio transcription completed:', {
        projectId: project.id,
        identity,
        model,
        costUsd: cost.toFixed(4),
        latency: Date.now() - startTime,
      });

      res.json(providerResponse);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      console.error('Audio transcription error:', {
        projectKey,
        identity,
        error: error.message,
      });

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
   * Includes timeout protection to prevent resource exhaustion
   */
  private async handleStreamingRequest(
    res: Response,
    authorization: string,
    providerBaseUrl: string,
    body: any,
    project: any,
    identity: string,
    session: string,
    model: string,
    periodStart: Date,
    responseFormat: 'openai' | 'gemini' | 'anthropic' = 'openai',
    pooledKeyEntry: { id: string } | null = null,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let inputTokens = 0;
    let outputTokens = 0;
    let streamEnded = false;
    
    // Track streamed content for token estimation (when provider doesn't return usage)
    let totalStreamedChars = 0;

    // ====================================
    // SECURITY: Streaming timeout (5 minutes)
    // Prevents resource exhaustion from slow/hanging connections
    // ====================================
    const timeout = setTimeout(() => {
      if (!streamEnded) {
        console.warn('Streaming timeout reached:', {
          projectId: project.id,
          identity,
          session,
          model,
        });
        res.write(`data: ${JSON.stringify({ error: 'Stream timeout exceeded' })}\n\n`);
        res.end();
        streamEnded = true;
      }
    }, STREAMING_TIMEOUT_MS);

    try {
      for await (const chunk of this.transparentProxyService.forwardStreamingRequest(
        authorization,
        providerBaseUrl,
        body,
      )) {
        if (streamEnded) break;

        // Track tokens from usage field if available (OpenAI provides this)
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens || inputTokens;
          outputTokens = chunk.usage.completion_tokens || outputTokens;
        }
        
        // Track content length for token estimation (for providers that don't return usage)
        const deltaContent = chunk.choices?.[0]?.delta?.content;
        if (deltaContent && typeof deltaContent === 'string') {
          totalStreamedChars += deltaContent.length;
        }

        // Forward the chunk, transforming to native format if needed
        let outputChunk = chunk;
        if (responseFormat === 'gemini') {
          outputChunk = this.transformStreamChunkToGemini(chunk);
        } else if (responseFormat === 'anthropic') {
          outputChunk = this.transformStreamChunkToAnthropic(chunk);
          if (!outputChunk) continue; // Skip null chunks (non-content events)
        }
        res.write(`data: ${JSON.stringify(outputChunk)}\n\n`);
      }

      if (!streamEnded) {
        // Send done signal
        res.write('data: [DONE]\n\n');
        res.end();
        streamEnded = true;
      }

      // Finalize usage tracking with cost
      // Use actual tokens if available, otherwise estimate from content length
      let finalInputTokens = inputTokens;
      let finalOutputTokens = outputTokens;
      
      if (inputTokens === 0 && outputTokens === 0 && totalStreamedChars > 0) {
        // Provider didn't return usage stats - estimate tokens
        // Rough estimate: ~4 characters per token for English text
        finalOutputTokens = Math.ceil(totalStreamedChars / 4);
        
        // Estimate input tokens from request body
        const inputChars = this.estimateInputChars(body);
        finalInputTokens = Math.ceil(inputChars / 4);
        
        console.log('Token estimation (streaming):', {
          projectId: project.id,
          identity,
          model,
          outputChars: totalStreamedChars,
          estimatedOutputTokens: finalOutputTokens,
          estimatedInputTokens: finalInputTokens,
        });
      }
      
      const totalTokens = finalInputTokens + finalOutputTokens;
      if (totalTokens > 0) {
        const cost = this.pricingService.calculateCost(
          model,
          finalInputTokens,
          finalOutputTokens,
        );
        await this.usageService.finalizeUsageWithCost({
          project,
          identity,
          model,
          session,
          periodStart,
          inputTokens: finalInputTokens,
          outputTokens: finalOutputTokens,
          cost,
        });

        // Track usage for pooled key (for sponsor attribution)
        if (pooledKeyEntry) {
          await this.keyPoolService.recordUsage(
            pooledKeyEntry.id,
            totalTokens,
            Math.round(cost * 100), // Convert to cents
          );
        }
      }
    } catch (error) {
      console.error('Transparent proxy stream error:', {
        projectId: project.id,
        identity,
        session,
        error: error.message,
        details: error.response?.data,
      });
      if (!streamEnded) {
        // Forward the error to the client instead of silently ending
        const errorMessage = error.response?.data?.error?.message 
          || error.message 
          || 'Failed to get response from AI provider';
        res.write(`data: ${JSON.stringify({ 
          error: { 
            message: errorMessage,
            type: 'provider_error',
            code: error.response?.status || 500
          } 
        })}\n\n`);
        res.end();
        streamEnded = true;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private getPeriodStart(limitPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();

    switch (limitPeriod) {
      case 'hourly':
        return new Date(Date.UTC(year, month, date, hour));
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

  /**
   * Extract PII types detected from messages for logging
   */
  private extractPiiTypes(messages: any[], config: any): string[] {
    const types: Set<string> = new Set();

    for (const message of messages) {
      if (message.role !== 'user' || !message.content) continue;

      const detection = this.anonymizationService.detectPII(message.content, {
        enabled: true,
        ...config,
      });

      detection.types.forEach((t) => types.add(t));
    }

    return Array.from(types);
  }

  /**
   * Estimate tokens for embeddings input
   */
  private estimateTokens(input: string | string[]): number {
    const text = Array.isArray(input) ? input.join(' ') : input;
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate input character count from request body (for token estimation)
   */
  private estimateInputChars(body: any): number {
    if (!body.messages || !Array.isArray(body.messages)) {
      return 0;
    }
    
    let totalChars = 0;
    for (const msg of body.messages) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        // Handle multi-modal content
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            totalChars += part.text.length;
          }
        }
      }
    }
    
    return totalChars;
  }

  /**
   * Estimate input tokens from request body (for pre-check before request)
   * Uses ~4 characters per token for English text
   */
  private estimateInputTokens(body: any): number {
    const chars = this.estimateInputChars(body);
    return Math.ceil(chars / 4);
  }

  // ====================================
  // SECURITY: Input validation methods
  // ====================================

  /**
   * Validate chat completions request body
   * Prevents oversized payloads and malformed requests
   */
  private validateChatCompletionsBody(body: any): void {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid request body');
    }

    // Validate model
    if (body.model && typeof body.model === 'string' && body.model.length > MAX_MODEL_LENGTH) {
      throw new BadRequestException(`Model name too long (max ${MAX_MODEL_LENGTH} chars)`);
    }

    // Validate messages
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new BadRequestException('messages field is required and must be an array');
    }

    if (body.messages.length > MAX_MESSAGES) {
      throw new BadRequestException(`Too many messages (max ${MAX_MESSAGES})`);
    }

    for (let i = 0; i < body.messages.length; i++) {
      const msg = body.messages[i];
      if (!msg || typeof msg !== 'object') {
        throw new BadRequestException(`Invalid message at index ${i}`);
      }

      if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
        throw new BadRequestException(
          `Message at index ${i} too long (max ${MAX_MESSAGE_LENGTH} chars)`,
        );
      }

      // Handle array content (for vision models)
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text' && typeof part.text === 'string') {
            if (part.text.length > MAX_MESSAGE_LENGTH) {
              throw new BadRequestException(
                `Message content at index ${i} too long (max ${MAX_MESSAGE_LENGTH} chars)`,
              );
            }
          }
        }
      }
    }

    // Validate max_tokens
    if (body.max_tokens !== undefined) {
      if (typeof body.max_tokens !== 'number' || body.max_tokens < 1 || body.max_tokens > 128000) {
        throw new BadRequestException('max_tokens must be between 1 and 128000');
      }
    }

    // Validate n (number of completions)
    if (body.n !== undefined) {
      if (typeof body.n !== 'number' || body.n < 1 || body.n > 10) {
        throw new BadRequestException('n must be between 1 and 10');
      }
    }
  }

  /**
   * Validate image generation request body
   */
  private validateImageGenerationBody(body: any): void {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid request body');
    }

    // Validate prompt (required)
    if (!body.prompt || typeof body.prompt !== 'string') {
      throw new BadRequestException('prompt field is required and must be a string');
    }

    if (body.prompt.length > MAX_PROMPT_LENGTH) {
      throw new BadRequestException(`Prompt too long (max ${MAX_PROMPT_LENGTH} chars)`);
    }

    // Validate n (number of images)
    if (body.n !== undefined) {
      if (typeof body.n !== 'number' || body.n < 1 || body.n > 10) {
        throw new BadRequestException('n must be between 1 and 10');
      }
    }

    // Validate model
    if (body.model && typeof body.model === 'string' && body.model.length > MAX_MODEL_LENGTH) {
      throw new BadRequestException(`Model name too long (max ${MAX_MODEL_LENGTH} chars)`);
    }
  }

  /**
   * Validate embeddings request body
   */
  private validateEmbeddingsBody(body: any): void {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid request body');
    }

    // Validate model
    if (!body.model || typeof body.model !== 'string') {
      throw new BadRequestException('model field is required');
    }
    if (body.model.length > MAX_MODEL_LENGTH) {
      throw new BadRequestException(`Model name too long (max ${MAX_MODEL_LENGTH} chars)`);
    }

    // Validate input (required) - can be string or array of strings
    if (!body.input) {
      throw new BadRequestException('input field is required');
    }

    if (typeof body.input === 'string') {
      if (body.input.length > MAX_MESSAGE_LENGTH) {
        throw new BadRequestException(`Input too long (max ${MAX_MESSAGE_LENGTH} chars)`);
      }
    } else if (Array.isArray(body.input)) {
      if (body.input.length > 2048) {
        throw new BadRequestException('Too many input items (max 2048)');
      }
      for (let i = 0; i < body.input.length; i++) {
        if (typeof body.input[i] === 'string' && body.input[i].length > MAX_MESSAGE_LENGTH) {
          throw new BadRequestException(
            `Input at index ${i} too long (max ${MAX_MESSAGE_LENGTH} chars)`,
          );
        }
      }
    } else {
      throw new BadRequestException('input must be a string or array of strings');
    }
  }

  // ====================================
  // SMART MODEL ROUTING
  // ====================================

  /**
   * Apply smart routing rules to determine the actual model to use
   */
  private applySmartRouting(
    requestedModel: string,
    tier: string | undefined,
    routingConfig: {
      defaultModel?: string;
      strategy?: 'cost' | 'latency' | 'quality' | 'fallback';
      fallbackChain?: string[];
      costOptimization?: {
        enabled: boolean;
        tokenThreshold?: number;
        cheapModel?: string;
        premiumModel?: string;
      };
      modelMappings?: Record<string, string>;
      tierModelOverrides?: Record<string, Record<string, string>>;
    },
    body: any,
  ): string {
    // 1. Check tier-specific model overrides first (highest priority)
    if (tier && routingConfig.tierModelOverrides?.[tier]) {
      const tierOverride = routingConfig.tierModelOverrides[tier][requestedModel];
      if (tierOverride) {
        return tierOverride;
      }
    }

    // 2. Check direct model mappings
    if (routingConfig.modelMappings?.[requestedModel]) {
      return routingConfig.modelMappings[requestedModel];
    }

    // 3. Apply cost optimization if enabled
    if (routingConfig.costOptimization?.enabled) {
      const { tokenThreshold, cheapModel, premiumModel } = routingConfig.costOptimization;
      
      // Estimate input tokens from messages
      const estimatedTokens = this.estimateMessageTokens(body);
      
      if (tokenThreshold && cheapModel && estimatedTokens < tokenThreshold) {
        // Simple query - use cheap model
        return cheapModel;
      }
      
      if (premiumModel && estimatedTokens >= (tokenThreshold || 1000)) {
        // Complex query - use premium model (or keep requested)
        return premiumModel;
      }
    }

    // 4. Apply strategy-based routing
    switch (routingConfig.strategy) {
      case 'cost':
        // Route to cheapest equivalent model
        return this.getCheaperEquivalent(requestedModel) || requestedModel;
      
      case 'fallback':
        // Use fallback chain's first model if available
        if (routingConfig.fallbackChain?.length) {
          return routingConfig.fallbackChain[0];
        }
        break;
      
      case 'latency':
      case 'quality':
        // For now, just use requested model
        // Future: implement latency/quality tracking
        break;
    }

    // 5. Use default model if specified and no other rules applied
    if (routingConfig.defaultModel) {
      return routingConfig.defaultModel;
    }

    return requestedModel;
  }

  /**
   * Estimate token count from chat messages in request body
   */
  private estimateMessageTokens(body: any): number {
    if (!body.messages || !Array.isArray(body.messages)) {
      return 0;
    }
    
    let totalChars = 0;
    for (const msg of body.messages) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        // Handle multi-modal content
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            totalChars += part.text.length;
          }
        }
      }
    }
    
    // Rough estimate: 1 token ≈ 4 characters for English
    return Math.ceil(totalChars / 4);
  }

  /**
   * Get a cheaper equivalent model
   */
  private getCheaperEquivalent(model: string): string | null {
    const cheaperModels: Record<string, string> = {
      // OpenAI
      'gpt-4o': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4o-mini',
      'gpt-4': 'gpt-4o-mini',
      'o1': 'o1-mini',
      'o1-preview': 'o1-mini',
      
      // Anthropic
      'claude-3-5-sonnet-20241022': 'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229': 'claude-3-5-sonnet-20241022',
      
      // Google
      'gemini-1.5-pro': 'gemini-1.5-flash',
      'gemini-2.0-pro': 'gemini-2.0-flash',
    };
    
    return cheaperModels[model] || null;
  }

  // ====================================
  // GOOGLE NATIVE FORMAT SUPPORT
  // Transforms native Gemini SDK format to OpenAI format
  // ====================================

  /**
   * Detect if request is in native Gemini format
   * Native format uses 'contents' array, OpenAI uses 'messages' array
   */
  private isNativeGeminiFormat(body: any): boolean {
    return body.contents && Array.isArray(body.contents) && !body.messages;
  }

  /**
   * Transform native Gemini format to OpenAI format
   * 
   * Native Gemini:
   * {
   *   "systemInstruction": { "parts": [{ "text": "You are helpful" }] },
   *   "contents": [
   *     { "role": "user", "parts": [{ "text": "Hello" }] },
   *     { "role": "model", "parts": [{ "text": "Hi!" }] }
   *   ],
   *   "generationConfig": { "temperature": 0.7, "maxOutputTokens": 1000 }
   * }
   * 
   * OpenAI format:
   * {
   *   "model": "gemini-2.0-flash",
   *   "messages": [
   *     { "role": "system", "content": "You are helpful" },
   *     { "role": "user", "content": "Hello" },
   *     { "role": "assistant", "content": "Hi!" }
   *   ],
   *   "temperature": 0.7,
   *   "max_tokens": 1000
   * }
   */
  private transformGeminiToOpenAI(body: any): { transformed: any; originalFormat: 'gemini' } {
    const messages: Array<{ role: string; content: string }> = [];

    // Handle systemInstruction → system message
    if (body.systemInstruction) {
      const systemText = this.extractTextFromParts(body.systemInstruction.parts);
      if (systemText) {
        messages.push({ role: 'system', content: systemText });
      }
    }

    // Handle contents → messages
    for (const content of body.contents || []) {
      const text = this.extractTextFromParts(content.parts);
      if (text) {
        messages.push({
          // Gemini uses 'model' for assistant, OpenAI uses 'assistant'
          role: content.role === 'model' ? 'assistant' : content.role,
          content: text,
        });
      }
    }

    // Build OpenAI-compatible request
    const transformed: any = {
      model: body.model || 'gemini-2.0-flash',
      messages,
      stream: body.stream ?? false,
    };

    // Map generationConfig to OpenAI params
    if (body.generationConfig) {
      const gc = body.generationConfig;
      if (gc.temperature !== undefined) transformed.temperature = gc.temperature;
      if (gc.topP !== undefined) transformed.top_p = gc.topP;
      if (gc.topK !== undefined) transformed.top_k = gc.topK;
      if (gc.maxOutputTokens !== undefined) transformed.max_tokens = gc.maxOutputTokens;
      if (gc.stopSequences) transformed.stop = gc.stopSequences;
    }

    // Map safetySettings (just pass through for now)
    // Could be used for content filtering in the future

    return { transformed, originalFormat: 'gemini' };
  }

  /**
   * Extract text from Gemini parts array
   * Parts can contain: { text: "..." }, { inlineData: {...} }, etc.
   */
  private extractTextFromParts(parts: any[] | undefined): string {
    if (!parts || !Array.isArray(parts)) return '';
    
    return parts
      .filter(part => part.text)
      .map(part => part.text)
      .join('');
  }

  /**
   * Transform OpenAI response to native Gemini format
   */
  private transformOpenAIToGemini(response: any): any {
    const choice = response.choices?.[0];
    if (!choice) return response;

    return {
      candidates: [{
        content: {
          parts: [{ text: choice.message?.content || choice.delta?.content || '' }],
          role: 'model',
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        index: choice.index || 0,
      }],
      usageMetadata: response.usage ? {
        promptTokenCount: response.usage.prompt_tokens,
        candidatesTokenCount: response.usage.completion_tokens,
        totalTokenCount: response.usage.total_tokens,
      } : undefined,
      modelVersion: response.model,
    };
  }

  /**
   * Transform OpenAI streaming chunk to native Gemini format
   */
  private transformStreamChunkToGemini(chunk: any): any {
    const choice = chunk.choices?.[0];
    if (!choice) return chunk;

    return {
      candidates: [{
        content: {
          parts: [{ text: choice.delta?.content || '' }],
          role: 'model',
        },
        finishReason: choice.finish_reason ? this.mapFinishReason(choice.finish_reason) : undefined,
        index: choice.index || 0,
      }],
    };
  }

  /**
   * Map OpenAI finish_reason to Gemini finishReason
   */
  private mapFinishReason(reason: string | null): string {
    const mapping: Record<string, string> = {
      'stop': 'STOP',
      'length': 'MAX_TOKENS',
      'content_filter': 'SAFETY',
      'tool_calls': 'STOP',
      'function_call': 'STOP',
    };
    return reason ? (mapping[reason] || 'STOP') : 'STOP';
  }

  // ====================================
  // ANTHROPIC NATIVE FORMAT SUPPORT
  // Transforms native Anthropic SDK format to OpenAI format
  // ====================================

  /**
   * Detect if request is in native Anthropic format
   * Native format has a top-level 'system' string (not in messages array)
   * 
   * Native Anthropic:
   * {
   *   "model": "claude-3-5-sonnet",
   *   "max_tokens": 1024,
   *   "system": "You are helpful",
   *   "messages": [{"role": "user", "content": "Hello"}]
   * }
   */
  private isNativeAnthropicFormat(body: any): boolean {
    // Has top-level 'system' as a string AND has messages array
    // (OpenAI format puts system in the messages array)
    return (
      typeof body.system === 'string' &&
      body.messages &&
      Array.isArray(body.messages)
    );
  }

  /**
   * Transform native Anthropic format to OpenAI format
   * Moves top-level 'system' into messages array as first message
   */
  private transformAnthropicNativeToOpenAI(body: any): any {
    const messages = [...(body.messages || [])];

    // Insert system message at the beginning
    if (body.system) {
      messages.unshift({
        role: 'system',
        content: body.system,
      });
    }

    // Build OpenAI-compatible request
    const transformed: any = {
      model: body.model,
      messages,
      stream: body.stream ?? false,
    };

    // Map Anthropic params to OpenAI params
    if (body.max_tokens !== undefined) transformed.max_tokens = body.max_tokens;
    if (body.temperature !== undefined) transformed.temperature = body.temperature;
    if (body.top_p !== undefined) transformed.top_p = body.top_p;
    if (body.top_k !== undefined) transformed.top_k = body.top_k;
    if (body.stop_sequences) transformed.stop = body.stop_sequences;

    return transformed;
  }

  /**
   * Transform OpenAI response to native Anthropic format
   */
  private transformOpenAIToAnthropic(response: any): any {
    const choice = response.choices?.[0];
    if (!choice) return response;

    return {
      id: response.id,
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: choice.message?.content || '',
      }],
      model: response.model,
      stop_reason: this.mapFinishReasonToAnthropic(choice.finish_reason),
      stop_sequence: null,
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Transform OpenAI streaming chunk to native Anthropic format
   */
  private transformStreamChunkToAnthropic(chunk: any): any {
    const choice = chunk.choices?.[0];
    if (!choice) return chunk;

    // Anthropic uses different event types for streaming
    if (choice.delta?.content) {
      return {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'text_delta',
          text: choice.delta.content,
        },
      };
    }

    if (choice.finish_reason) {
      return {
        type: 'message_delta',
        delta: {
          stop_reason: this.mapFinishReasonToAnthropic(choice.finish_reason),
        },
        usage: {
          output_tokens: chunk.usage?.completion_tokens || 0,
        },
      };
    }

    return null;
  }

  /**
   * Map OpenAI finish_reason to Anthropic stop_reason
   */
  private mapFinishReasonToAnthropic(reason: string | null): string {
    const mapping: Record<string, string> = {
      'stop': 'end_turn',
      'length': 'max_tokens',
      'content_filter': 'content_filter',
    };
    return reason ? (mapping[reason] || 'end_turn') : 'end_turn';
  }

  // ====================================
  // PUBLIC ENDPOINTS: Origin Validation
  // ====================================

  /**
   * Extract origin from Referer header as fallback
   * Some browsers may send Referer but not Origin (e.g., same-origin requests)
   */
  private extractOriginFromReferer(referer: string | undefined): string | null {
    if (!referer) return null;
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch {
      return null;
    }
  }

  /**
   * Check if request origin matches allowed origins
   * Supports exact matches and wildcard subdomains (*.example.com)
   */
  private isOriginAllowed(requestOrigin: string, allowedOrigins: string[]): boolean {
    // Normalize request origin (lowercase, no trailing slash)
    const normalizedRequest = requestOrigin.toLowerCase().replace(/\/$/, '');
    
    for (const allowed of allowedOrigins) {
      const normalizedAllowed = allowed.toLowerCase().replace(/\/$/, '');
      
      // Exact match
      if (normalizedRequest === normalizedAllowed) {
        return true;
      }
      
      // Wildcard subdomain match (e.g., *.example.com)
      if (normalizedAllowed.startsWith('*.')) {
        const baseDomain = normalizedAllowed.slice(2); // Remove '*.'
        try {
          const requestUrl = new URL(normalizedRequest);
          const host = requestUrl.host;
          // Match exact base domain or any subdomain
          if (host === baseDomain || host.endsWith('.' + baseDomain)) {
            return true;
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
    
    return false;
  }
}
