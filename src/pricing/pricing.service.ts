import { Injectable } from '@nestjs/common';

/**
 * Model pricing in USD per 1M tokens
 * 
 * Pricing is matched by:
 * 1. Exact model name match
 * 2. Model family patterns (e.g., "gpt-4o-2024-12-01" → gpt-4o family)
 * 3. Default fallback for completely unknown models
 * 
 * To add new models: just add them to the pricing map or rely on pattern matching
 */
interface ModelPricing {
  input: number;  // $ per 1M input tokens
  output: number; // $ per 1M output tokens
}

@Injectable()
export class PricingService {
  // Pricing per 1M tokens - organized by model family
  private readonly pricing: Record<string, ModelPricing> = {
    // ═══════════════════════════════════════════════════════════════
    // OpenAI Models (https://openai.com/api/pricing)
    // ═══════════════════════════════════════════════════════════════
    
    // GPT-5 family (newest)
    'gpt-5': { input: 5.00, output: 20.00 },
    'gpt-5.1': { input: 5.00, output: 20.00 },
    'gpt-5-turbo': { input: 5.00, output: 20.00 },
    'gpt-5-mini': { input: 0.50, output: 2.00 },
    
    // GPT-4o family
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
    'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
    'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
    'chatgpt-4o-latest': { input: 5.00, output: 15.00 },
    
    // GPT-4o mini (cost-effective)
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
    
    // GPT-4o Audio
    'gpt-4o-audio-preview': { input: 2.50, output: 10.00 },
    'gpt-4o-realtime-preview': { input: 5.00, output: 20.00 },
    
    // o1 reasoning models
    'o1': { input: 15.00, output: 60.00 },
    'o1-2024-12-17': { input: 15.00, output: 60.00 },
    'o1-preview': { input: 15.00, output: 60.00 },
    'o1-preview-2024-09-12': { input: 15.00, output: 60.00 },
    'o1-mini': { input: 3.00, output: 12.00 },
    'o1-mini-2024-09-12': { input: 3.00, output: 12.00 },
    'o3-mini': { input: 1.10, output: 4.40 }, // Announced pricing
    
    // GPT-4 Turbo
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4-turbo-2024-04-09': { input: 10.00, output: 30.00 },
    'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
    'gpt-4-0125-preview': { input: 10.00, output: 30.00 },
    'gpt-4-1106-preview': { input: 10.00, output: 30.00 },
    'gpt-4-vision-preview': { input: 10.00, output: 30.00 },
    
    // GPT-4 (original)
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-4-0613': { input: 30.00, output: 60.00 },
    'gpt-4-32k': { input: 60.00, output: 120.00 },
    'gpt-4-32k-0613': { input: 60.00, output: 120.00 },
    
    // GPT-3.5 Turbo
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
    'gpt-3.5-turbo-1106': { input: 1.00, output: 2.00 },
    'gpt-3.5-turbo-instruct': { input: 1.50, output: 2.00 },
    'gpt-3.5-turbo-16k': { input: 3.00, output: 4.00 },

    // ═══════════════════════════════════════════════════════════════
    // Anthropic Models (https://anthropic.com/pricing)
    // ═══════════════════════════════════════════════════════════════
    
    // Claude 4.5 / Claude 4 (newest)
    'claude-4.5-sonnet': { input: 3.00, output: 15.00 },
    'claude-4.5-opus': { input: 15.00, output: 75.00 },
    'claude-4-sonnet': { input: 3.00, output: 15.00 },
    'claude-4-opus': { input: 15.00, output: 75.00 },
    'claude-sonnet-4': { input: 3.00, output: 15.00 },
    'claude-opus-4': { input: 15.00, output: 75.00 },
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
    
    // Claude 3.5 Sonnet
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },
    'claude-3-5-sonnet-latest': { input: 3.00, output: 15.00 },
    
    // Claude 3.5 Haiku (fast & cheap)
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
    'claude-3-5-haiku-latest': { input: 0.80, output: 4.00 },
    
    // Claude 3 Opus (most capable)
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-opus-latest': { input: 15.00, output: 75.00 },
    
    // Claude 3 Sonnet
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    
    // Claude 3 Haiku
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

    // ═══════════════════════════════════════════════════════════════
    // Google Models (https://ai.google.dev/pricing)
    // ═══════════════════════════════════════════════════════════════
    
    // Gemini 3 (newest)
    'gemini-3-pro': { input: 2.00, output: 8.00 },
    'gemini-3-ultra': { input: 5.00, output: 20.00 },
    'gemini-3-flash': { input: 0.15, output: 0.60 },
    'gemini-3.0-pro': { input: 2.00, output: 8.00 },
    'gemini-3.0-ultra': { input: 5.00, output: 20.00 },
    'gemini-3.0-flash': { input: 0.15, output: 0.60 },
    
    // Gemini 2.5
    'gemini-2.5-pro': { input: 1.50, output: 6.00 },
    'gemini-2.5-flash': { input: 0.10, output: 0.40 },
    
    // Gemini 2.0
    'gemini-2.0-flash-exp': { input: 0.10, output: 0.40 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-2.0-pro': { input: 1.25, output: 5.00 },
    
    // Gemini 1.5 Pro
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-pro-latest': { input: 1.25, output: 5.00 },
    'gemini-1.5-pro-002': { input: 1.25, output: 5.00 },
    
    // Gemini 1.5 Flash
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-latest': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-002': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
    
    // Gemini 1.0
    'gemini-1.0-pro': { input: 0.50, output: 1.50 },
    'gemini-pro': { input: 0.50, output: 1.50 },

    // ═══════════════════════════════════════════════════════════════
    // xAI Models (https://x.ai)
    // ═══════════════════════════════════════════════════════════════
    'grok-4': { input: 3.00, output: 15.00 },
    'grok-4.1': { input: 3.00, output: 15.00 },
    'grok-4-vision': { input: 3.00, output: 15.00 },
    'grok-3': { input: 2.50, output: 12.00 },
    'grok-3-vision': { input: 2.50, output: 12.00 },
    'grok-beta': { input: 5.00, output: 15.00 },
    'grok-2': { input: 2.00, output: 10.00 },
    'grok-2-1212': { input: 2.00, output: 10.00 },
    'grok-2-vision-1212': { input: 2.00, output: 10.00 },
    'grok-vision-beta': { input: 5.00, output: 15.00 },

    // ═══════════════════════════════════════════════════════════════
    // Mistral Models (https://mistral.ai/pricing)
    // ═══════════════════════════════════════════════════════════════
    'mistral-large-latest': { input: 2.00, output: 6.00 },
    'mistral-large-2411': { input: 2.00, output: 6.00 },
    'mistral-small-latest': { input: 0.20, output: 0.60 },
    'mistral-medium-latest': { input: 2.70, output: 8.10 },
    'codestral-latest': { input: 0.20, output: 0.60 },
    'ministral-8b-latest': { input: 0.10, output: 0.10 },
    'ministral-3b-latest': { input: 0.04, output: 0.04 },
    'pixtral-large-latest': { input: 2.00, output: 6.00 },
    'open-mistral-nemo': { input: 0.15, output: 0.15 },
    'open-mixtral-8x22b': { input: 2.00, output: 6.00 },

    // ═══════════════════════════════════════════════════════════════
    // Meta Llama (via various providers - estimated averages)
    // ═══════════════════════════════════════════════════════════════
    'llama-3.2-90b-vision-preview': { input: 0.90, output: 0.90 },
    'llama-3.2-11b-vision-preview': { input: 0.055, output: 0.055 },
    'llama-3.1-405b': { input: 3.00, output: 3.00 },
    'llama-3.1-70b': { input: 0.35, output: 0.40 },
    'llama-3.1-8b': { input: 0.05, output: 0.08 },
    'llama-3-70b': { input: 0.59, output: 0.79 },
    'llama-3-8b': { input: 0.05, output: 0.08 },

    // ═══════════════════════════════════════════════════════════════
    // Cohere Models
    // ═══════════════════════════════════════════════════════════════
    'command-r-plus': { input: 2.50, output: 10.00 },
    'command-r': { input: 0.15, output: 0.60 },
    'command': { input: 1.00, output: 2.00 },
    'command-light': { input: 0.30, output: 0.60 },

    // ═══════════════════════════════════════════════════════════════
    // Deepseek Models
    // ═══════════════════════════════════════════════════════════════
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-coder': { input: 0.14, output: 0.28 },
  };

  // Model family patterns for fuzzy matching (checked if exact match fails)
  private readonly modelFamilyPatterns: Array<{ pattern: RegExp; pricing: ModelPricing }> = [
    // OpenAI - order matters (more specific first)
    { pattern: /^gpt-5-mini/i, pricing: { input: 0.50, output: 2.00 } },
    { pattern: /^gpt-5/i, pricing: { input: 5.00, output: 20.00 } },
    { pattern: /^gpt-4o-mini/i, pricing: { input: 0.15, output: 0.60 } },
    { pattern: /^gpt-4o/i, pricing: { input: 2.50, output: 10.00 } },
    { pattern: /^o1-mini/i, pricing: { input: 3.00, output: 12.00 } },
    { pattern: /^o1/i, pricing: { input: 15.00, output: 60.00 } },
    { pattern: /^o3-mini/i, pricing: { input: 1.10, output: 4.40 } },
    { pattern: /^o3/i, pricing: { input: 10.00, output: 40.00 } },
    { pattern: /^gpt-4-turbo/i, pricing: { input: 10.00, output: 30.00 } },
    { pattern: /^gpt-4-32k/i, pricing: { input: 60.00, output: 120.00 } },
    { pattern: /^gpt-4/i, pricing: { input: 30.00, output: 60.00 } },
    { pattern: /^gpt-3\.5-turbo-16k/i, pricing: { input: 3.00, output: 4.00 } },
    { pattern: /^gpt-3\.5/i, pricing: { input: 0.50, output: 1.50 } },
    
    // Anthropic - order matters (more specific first)
    { pattern: /^claude-4\.5-opus|^claude-opus-4\.5/i, pricing: { input: 15.00, output: 75.00 } },
    { pattern: /^claude-4\.5-sonnet|^claude-sonnet-4\.5/i, pricing: { input: 3.00, output: 15.00 } },
    { pattern: /^claude-4-opus|^claude-opus-4/i, pricing: { input: 15.00, output: 75.00 } },
    { pattern: /^claude-4-sonnet|^claude-sonnet-4/i, pricing: { input: 3.00, output: 15.00 } },
    { pattern: /^claude-4/i, pricing: { input: 3.00, output: 15.00 } },
    { pattern: /^claude-3-5-sonnet/i, pricing: { input: 3.00, output: 15.00 } },
    { pattern: /^claude-3-5-haiku/i, pricing: { input: 0.80, output: 4.00 } },
    { pattern: /^claude-3-opus/i, pricing: { input: 15.00, output: 75.00 } },
    { pattern: /^claude-3-sonnet/i, pricing: { input: 3.00, output: 15.00 } },
    { pattern: /^claude-3-haiku/i, pricing: { input: 0.25, output: 1.25 } },
    { pattern: /^claude.*opus/i, pricing: { input: 15.00, output: 75.00 } },
    { pattern: /^claude.*sonnet/i, pricing: { input: 3.00, output: 15.00 } },
    { pattern: /^claude.*haiku/i, pricing: { input: 0.80, output: 4.00 } },
    { pattern: /^claude/i, pricing: { input: 3.00, output: 15.00 } }, // Default Claude
    
    // Google - order matters (more specific first)
    { pattern: /^gemini-3.*ultra/i, pricing: { input: 5.00, output: 20.00 } },
    { pattern: /^gemini-3.*pro/i, pricing: { input: 2.00, output: 8.00 } },
    { pattern: /^gemini-3.*flash/i, pricing: { input: 0.15, output: 0.60 } },
    { pattern: /^gemini-3/i, pricing: { input: 2.00, output: 8.00 } },
    { pattern: /^gemini-2\.5-pro/i, pricing: { input: 1.50, output: 6.00 } },
    { pattern: /^gemini-2\.5/i, pricing: { input: 0.10, output: 0.40 } },
    { pattern: /^gemini-2\.0/i, pricing: { input: 0.10, output: 0.40 } },
    { pattern: /^gemini-2/i, pricing: { input: 0.10, output: 0.40 } },
    { pattern: /^gemini-1\.5-pro/i, pricing: { input: 1.25, output: 5.00 } },
    { pattern: /^gemini-1\.5-flash-8b/i, pricing: { input: 0.0375, output: 0.15 } },
    { pattern: /^gemini-1\.5-flash/i, pricing: { input: 0.075, output: 0.30 } },
    { pattern: /^gemini.*ultra/i, pricing: { input: 5.00, output: 20.00 } },
    { pattern: /^gemini.*pro/i, pricing: { input: 1.25, output: 5.00 } },
    { pattern: /^gemini.*flash/i, pricing: { input: 0.075, output: 0.30 } },
    { pattern: /^gemini/i, pricing: { input: 1.25, output: 5.00 } }, // Default Gemini
    
    // xAI
    { pattern: /^grok-4/i, pricing: { input: 3.00, output: 15.00 } },
    { pattern: /^grok-3/i, pricing: { input: 2.50, output: 12.00 } },
    { pattern: /^grok-2/i, pricing: { input: 2.00, output: 10.00 } },
    { pattern: /^grok/i, pricing: { input: 3.00, output: 15.00 } },
    
    // Mistral
    { pattern: /^mistral-large/i, pricing: { input: 2.00, output: 6.00 } },
    { pattern: /^mistral-small/i, pricing: { input: 0.20, output: 0.60 } },
    { pattern: /^mistral-medium/i, pricing: { input: 2.70, output: 8.10 } },
    { pattern: /^codestral/i, pricing: { input: 0.20, output: 0.60 } },
    { pattern: /^ministral/i, pricing: { input: 0.10, output: 0.10 } },
    { pattern: /^pixtral/i, pricing: { input: 2.00, output: 6.00 } },
    { pattern: /^mistral|^mixtral/i, pricing: { input: 0.50, output: 1.50 } },
    
    // Meta Llama
    { pattern: /^llama-3\.2-90b/i, pricing: { input: 0.90, output: 0.90 } },
    { pattern: /^llama-3\.2-11b/i, pricing: { input: 0.055, output: 0.055 } },
    { pattern: /^llama-3\.1-405b/i, pricing: { input: 3.00, output: 3.00 } },
    { pattern: /^llama-3\.1-70b/i, pricing: { input: 0.35, output: 0.40 } },
    { pattern: /^llama-3\.1-8b/i, pricing: { input: 0.05, output: 0.08 } },
    { pattern: /^llama-3-70b/i, pricing: { input: 0.59, output: 0.79 } },
    { pattern: /^llama/i, pricing: { input: 0.20, output: 0.30 } }, // Default Llama
    
    // Cohere
    { pattern: /^command-r-plus/i, pricing: { input: 2.50, output: 10.00 } },
    { pattern: /^command-r/i, pricing: { input: 0.15, output: 0.60 } },
    { pattern: /^command/i, pricing: { input: 1.00, output: 2.00 } },
    
    // Deepseek
    { pattern: /^deepseek/i, pricing: { input: 0.14, output: 0.28 } },
  ];

  // Default pricing for completely unknown models (conservative estimate)
  private readonly defaultPricing: ModelPricing = { input: 2.00, output: 8.00 };

  /**
   * Get pricing for a model
   * 
   * Matching order:
   * 1. Exact match (fastest)
   * 2. Case-insensitive exact match
   * 3. Regex pattern matching for model families
   * 4. Default fallback
   */
  getPricing(model: string): ModelPricing {
    // 1. Try exact match
    if (this.pricing[model]) {
      return this.pricing[model];
    }

    // 2. Try case-insensitive exact match
    const modelLower = model.toLowerCase();
    for (const [key, pricing] of Object.entries(this.pricing)) {
      if (key.toLowerCase() === modelLower) {
        return pricing;
      }
    }

    // 3. Try pattern matching for model families
    for (const { pattern, pricing } of this.modelFamilyPatterns) {
      if (pattern.test(model)) {
        return pricing;
      }
    }

    // 4. Fallback to default
    console.warn(`Unknown model pricing: "${model}" - using default estimate`);
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

