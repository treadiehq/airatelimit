import { Injectable } from '@nestjs/common';

/**
 * Model pricing in USD per 1M tokens
 * Updated: Nov 2024
 */
interface ModelPricing {
  input: number;  // $ per 1M input tokens
  output: number; // $ per 1M output tokens
}

@Injectable()
export class PricingService {
  // Pricing per 1M tokens (converted to per-token in calculations)
  private readonly pricing: Record<string, ModelPricing> = {
    // OpenAI Models
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
    'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-4-32k': { input: 60.00, output: 120.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-3.5-turbo-16k': { input: 3.00, output: 4.00 },
    'o1-preview': { input: 15.00, output: 60.00 },
    'o1-mini': { input: 3.00, output: 12.00 },

    // Anthropic Models
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-sonnet-latest': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
    'claude-3-5-haiku-latest': { input: 0.80, output: 4.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-opus-latest': { input: 15.00, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

    // Google Models
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.0-pro': { input: 0.50, output: 1.50 },

    // xAI Models
    'grok-beta': { input: 5.00, output: 15.00 },
    'grok-2': { input: 2.00, output: 10.00 },
  };

  // Default pricing for unknown models (conservative estimate)
  private readonly defaultPricing: ModelPricing = { input: 5.00, output: 15.00 };

  /**
   * Get pricing for a model
   */
  getPricing(model: string): ModelPricing {
    // Try exact match
    if (this.pricing[model]) {
      return this.pricing[model];
    }

    // Try prefix match (e.g., "gpt-4o-2024-05-13" → "gpt-4o")
    const modelLower = model.toLowerCase();
    for (const [key, pricing] of Object.entries(this.pricing)) {
      if (modelLower.startsWith(key.toLowerCase())) {
        return pricing;
      }
    }

    // Try contains match for model families
    if (modelLower.includes('gpt-4o-mini')) return this.pricing['gpt-4o-mini'];
    if (modelLower.includes('gpt-4o')) return this.pricing['gpt-4o'];
    if (modelLower.includes('gpt-4-turbo')) return this.pricing['gpt-4-turbo'];
    if (modelLower.includes('gpt-4')) return this.pricing['gpt-4'];
    if (modelLower.includes('gpt-3.5')) return this.pricing['gpt-3.5-turbo'];
    if (modelLower.includes('claude-3-5-sonnet')) return this.pricing['claude-3-5-sonnet-latest'];
    if (modelLower.includes('claude-3-5-haiku')) return this.pricing['claude-3-5-haiku-latest'];
    if (modelLower.includes('claude-3-opus')) return this.pricing['claude-3-opus-latest'];
    if (modelLower.includes('claude-3-sonnet')) return this.pricing['claude-3-sonnet-20240229'];
    if (modelLower.includes('claude-3-haiku')) return this.pricing['claude-3-haiku-20240307'];
    if (modelLower.includes('gemini-1.5-pro')) return this.pricing['gemini-1.5-pro'];
    if (modelLower.includes('gemini-1.5-flash')) return this.pricing['gemini-1.5-flash'];
    if (modelLower.includes('gemini')) return this.pricing['gemini-1.0-pro'];
    if (modelLower.includes('grok')) return this.pricing['grok-2'];

    return this.defaultPricing;
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.getPricing(model);
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Estimate cost for a blocked request (assumes average token counts)
   */
  estimateBlockedCost(model: string, estimatedInputTokens: number = 500): number {
    const pricing = this.getPricing(model);
    // For blocked requests, we only count potential input cost
    // (they never got output tokens)
    const inputCost = (estimatedInputTokens / 1_000_000) * pricing.input;
    // Assume they would have gotten ~2x output tokens
    const estimatedOutputCost = ((estimatedInputTokens * 2) / 1_000_000) * pricing.output;
    return inputCost + estimatedOutputCost;
  }

  /**
   * Get all available model pricings
   */
  getAllPricing(): Record<string, ModelPricing> {
    return { ...this.pricing };
  }
}

