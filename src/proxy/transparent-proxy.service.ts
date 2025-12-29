import { Injectable, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'unknown';

/**
 * Transparent Proxy Service
 *
 * Forwards requests to AI providers.
 * For most providers: forwards exactly as-is.
 * For Anthropic: transforms request/response to maintain OpenAI SDK compatibility.
 */
@Injectable()
export class TransparentProxyService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Transform OpenAI-format request to Anthropic format
   */
  private transformRequestForAnthropic(body: any): any {
    // Extract system message if present
    const systemMessage = body.messages?.find((m: any) => m.role === 'system');
    const nonSystemMessages =
      body.messages?.filter((m: any) => m.role !== 'system') || [];

    return {
      model: body.model,
      max_tokens: body.max_tokens || 4096, // Anthropic requires max_tokens
      messages: nonSystemMessages,
      ...(systemMessage && { system: systemMessage.content }),
      ...(body.temperature !== undefined && { temperature: body.temperature }),
      ...(body.top_p !== undefined && { top_p: body.top_p }),
      ...(body.stream !== undefined && { stream: body.stream }),
    };
  }

  /**
   * Transform Anthropic response to OpenAI format
   */
  private transformResponseFromAnthropic(response: any, model: string): any {
    return {
      id: response.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.content?.[0]?.text || '',
          },
          finish_reason: this.mapAnthropicStopReason(response.stop_reason),
        },
      ],
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens:
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
      },
    };
  }

  /**
   * Map Anthropic stop_reason to OpenAI finish_reason
   */
  private mapAnthropicStopReason(stopReason: string): string {
    const mapping: Record<string, string> = {
      end_turn: 'stop',
      max_tokens: 'length',
      stop_sequence: 'stop',
    };
    return mapping[stopReason] || 'stop';
  }

  /**
   * Transform Anthropic streaming chunk to OpenAI format
   */
  private transformStreamChunkFromAnthropic(
    chunk: any,
    model: string,
  ): any | null {
    // Handle different Anthropic event types
    if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            delta: {
              content: chunk.delta.text,
            },
            finish_reason: null,
          },
        ],
      };
    }

    if (chunk.type === 'message_stop') {
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
      };
    }

    if (chunk.type === 'message_delta' && chunk.usage) {
      // Include usage info in final chunk
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: this.mapAnthropicStopReason(
              chunk.delta?.stop_reason,
            ),
          },
        ],
        usage: {
          prompt_tokens: chunk.usage?.input_tokens || 0,
          completion_tokens: chunk.usage?.output_tokens || 0,
          total_tokens:
            (chunk.usage?.input_tokens || 0) +
            (chunk.usage?.output_tokens || 0),
        },
      };
    }

    // Skip other event types (message_start, content_block_start, etc.)
    return null;
  }

  /**
   * Provider base URLs for chat completions
   */
  private readonly providerUrls: Record<ProviderType, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google:
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
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
      const isAnthropic = providerUrl.includes('anthropic.com');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Prepare request body (transform for Anthropic)
      let requestBody = body;
      if (isAnthropic) {
        const apiKey = authorization.replace('Bearer ', '');
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        requestBody = this.transformRequestForAnthropic(body);
      } else {
        headers['Authorization'] = authorization;
      }

      const response = await firstValueFrom(
        this.httpService.post(providerUrl, requestBody, { headers }),
      );

      // Transform response (for Anthropic)
      if (isAnthropic) {
        return this.transformResponseFromAnthropic(response.data, body.model);
      }

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
      const isAnthropic = providerUrl.includes('anthropic.com');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Prepare request body (transform for Anthropic)
      let requestBody = body;
      if (isAnthropic) {
        const apiKey = authorization.replace('Bearer ', '');
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        requestBody = this.transformRequestForAnthropic(body);
      } else {
        headers['Authorization'] = authorization;
      }

      const response = await firstValueFrom(
        this.httpService.post(providerUrl, requestBody, {
          headers,
          responseType: 'stream',
        }),
      );

      const stream = response.data;

      // Buffer for incomplete lines across chunk boundaries
      // HTTP chunks can split SSE events mid-line, so we must reassemble them
      let buffer = '';

      for await (const chunk of stream) {
        // Append chunk to buffer instead of processing independently
        buffer += chunk.toString();
        const lines = buffer.split('\n');

        // Keep the last (potentially incomplete) line in the buffer for next iteration
        // If the chunk ended with \n, the last element will be empty string which is fine
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);

              // Transform Anthropic streaming chunks to OpenAI format
              if (isAnthropic) {
                const transformed = this.transformStreamChunkFromAnthropic(
                  parsed,
                  body.model,
                );
                if (transformed) {
                  yield transformed;
                }
                // Check for message_stop to end stream
                if (parsed.type === 'message_stop') {
                  return;
                }
              } else {
                yield parsed;
              }
            } catch (e) {
              // Log malformed JSON for debugging (should be rare with proper buffering)
              console.warn('Failed to parse SSE data:', data.substring(0, 100));
            }
          }
        }
      }

      // Process any remaining buffered data after stream ends
      if (buffer.trim() !== '' && buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            if (isAnthropic) {
              const transformed = this.transformStreamChunkFromAnthropic(
                parsed,
                body.model,
              );
              if (transformed) {
                yield transformed;
              }
            } else {
              yield parsed;
            }
          } catch (e) {
            console.warn('Failed to parse final SSE data:', data.substring(0, 100));
          }
        }
      }
    } catch (error) {
      // Extract error details from provider response
      let errorMessage = error.message || 'Failed to stream from AI provider';
      let errorDetails = null;
      
      // Try to extract error from response data (may be a buffer)
      if (error.response?.data) {
        try {
          const data = error.response.data;
          if (Buffer.isBuffer(data)) {
            errorDetails = JSON.parse(data.toString());
          } else if (typeof data === 'string') {
            errorDetails = JSON.parse(data);
          } else {
            errorDetails = data;
          }
          errorMessage = errorDetails?.error?.message || errorMessage;
        } catch (e) {
          // Couldn't parse error response
        }
      }
      
      console.error('Transparent proxy stream error:', {
        status: error.response?.status,
        message: errorMessage,
        details: errorDetails,
      });

      throw new BadGatewayException({
        error: 'provider_error',
        message: errorMessage,
        status: error.response?.status,
      });
    }
  }
}
