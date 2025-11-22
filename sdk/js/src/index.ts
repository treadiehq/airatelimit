export interface AIProxyClientOptions {
  baseUrl: string; // e.g. "https://proxy.myapp.com/api" or "http://localhost:3000/api"
  projectKey: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  identity: string;
  tier?: string; // Optional tier/plan identifier (e.g., 'free', 'pro', 'enterprise')
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface ChatResult {
  raw: any; // full response from proxy (OpenAI compatible)
}

export class LimitExceededError extends Error {
  response: any;

  constructor(response: any) {
    super(response.message || 'Rate limit exceeded');
    this.name = 'LimitExceededError';
    this.response = response;
  }
}

export function createClient(options: AIProxyClientOptions) {
  const { baseUrl, projectKey } = options;

  return {
    /**
     * Send a chat completion request
     */
    async chat(opts: ChatOptions): Promise<ChatResult> {
      const payload = {
        identity: opts.identity,
        tier: opts.tier,
        model: opts.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        top_p: opts.topP,
      };

      const response = await fetch(`${baseUrl}/v1/proxy/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-key': projectKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;

      // Check for limit exceeded
      if (response.status === 429 || data.error === 'limit_exceeded') {
        throw new LimitExceededError(data);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return {
        raw: data,
      };
    },

    /**
     * Stream a chat completion request
     * Returns an async generator that yields text chunks
     */
    async *chatStream(opts: ChatOptions): AsyncGenerator<string, void, unknown> {
      const payload = {
        identity: opts.identity,
        tier: opts.tier,
        model: opts.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        top_p: opts.topP,
      };

      const response = await fetch(`${baseUrl}/v1/proxy/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-key': projectKey,
        },
        body: JSON.stringify(payload),
      });

      // Check if response is JSON (error case)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json() as any;
        if (response.status === 429 || data.error === 'limit_exceeded') {
          throw new LimitExceededError(data);
        }
        throw new Error(data.message || 'Request failed');
      }

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                // Extract content from delta
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield content;
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}

// Export default
export default createClient;

