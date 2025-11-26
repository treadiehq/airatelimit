import { Injectable, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'xai' | 'unknown';

/**
 * Transparent Proxy Service
 * 
 * Forwards requests exactly as-is to the AI provider.
 * The customer's API key is passed through - we never store it.
 */
@Injectable()
export class TransparentProxyService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Provider base URLs for chat completions
   */
  private readonly providerUrls: Record<ProviderType, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    xai: 'https://api.x.ai/v1/chat/completions',
    unknown: 'https://api.openai.com/v1/chat/completions', // Default to OpenAI-compatible
  };

  /**
   * Detect provider from model name
   */
  detectProvider(model: string): ProviderType {
    const modelLower = model.toLowerCase();

    // OpenAI models
    if (
      modelLower.includes('gpt') ||
      modelLower.includes('o1') ||
      modelLower.includes('dall-e') ||
      modelLower.includes('whisper') ||
      modelLower.includes('tts')
    ) {
      return 'openai';
    }

    // Anthropic models
    if (modelLower.includes('claude')) {
      return 'anthropic';
    }

    // Google models
    if (modelLower.includes('gemini') || modelLower.includes('palm')) {
      return 'google';
    }

    // xAI models
    if (modelLower.includes('grok')) {
      return 'xai';
    }

    // Default to OpenAI-compatible (many providers use this format)
    return 'unknown';
  }

  /**
   * Get the provider URL for chat completions
   */
  getProviderUrl(provider: ProviderType): string {
    return this.providerUrls[provider] || this.providerUrls.openai;
  }

  /**
   * Forward a non-streaming request to the provider
   */
  async forwardRequest(
    authorization: string,
    providerUrl: string,
    body: any,
  ): Promise<any> {
    try {
      // Determine if this is Anthropic (different header format)
      const isAnthropic = providerUrl.includes('anthropic.com');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (isAnthropic) {
        // Anthropic uses x-api-key header
        const apiKey = authorization.replace('Bearer ', '');
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        // OpenAI and compatible APIs use Authorization header
        headers['Authorization'] = authorization;
      }

      const response = await firstValueFrom(
        this.httpService.post(providerUrl, body, { headers }),
      );

      return response.data;
    } catch (error) {
      console.error('Transparent proxy error:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message,
      });

      // Pass through the provider's error response
      if (error.response?.data) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data,
          },
        };
      }

      throw new BadGatewayException({
        error: 'provider_error',
        message: error.message || 'Failed to communicate with AI provider',
      });
    }
  }

  /**
   * Forward a streaming request to the provider
   */
  async *forwardStreamingRequest(
    authorization: string,
    providerUrl: string,
    body: any,
  ): AsyncGenerator<any, void, unknown> {
    try {
      // Determine if this is Anthropic (different header format)
      const isAnthropic = providerUrl.includes('anthropic.com');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (isAnthropic) {
        const apiKey = authorization.replace('Bearer ', '');
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = authorization;
      }

      const response = await firstValueFrom(
        this.httpService.post(providerUrl, body, {
          headers,
          responseType: 'stream',
        }),
      );

      const stream = response.data;

      for await (const chunk of stream) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Transparent proxy stream error:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message,
      });

      throw new BadGatewayException({
        error: 'provider_error',
        message: error.message || 'Failed to stream from AI provider',
      });
    }
  }
}

