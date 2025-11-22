import { Injectable, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OpenAIProviderService {
  constructor(private readonly httpService: HttpService) {}

  async chat(apiKey: string, baseUrl: string, payload: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(baseUrl, payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      // PRIVACY: Don't expose OpenAI errors or keys
      console.error('OpenAI API error:', {
        status: error.response?.status,
        // Don't log error details that may contain prompts
      });
      throw new BadGatewayException('Failed to communicate with AI service');
    }
  }

  async *chatStream(
    apiKey: string,
    baseUrl: string,
    payload: any,
  ): AsyncGenerator<any, void, unknown> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(baseUrl, payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
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
      console.error('OpenAI streaming error:', {
        status: error.response?.status,
      });
      throw new BadGatewayException('Failed to stream from AI service');
    }
  }
}

