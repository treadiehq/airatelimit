import { Injectable } from '@nestjs/common';

export interface AnonymizationResult {
  text: string;
  replacements: Array<{
    type: string;
    original: string;
    replacement: string;
    start: number;
    end: number;
  }>;
  piiDetected: boolean;
}

export interface AnonymizationConfig {
  enabled: boolean;
  // Which PII types to detect and mask
  detectEmail?: boolean;
  detectPhone?: boolean;
  detectSSN?: boolean;
  detectCreditCard?: boolean;
  detectName?: boolean;
  detectAddress?: boolean;
  detectIpAddress?: boolean;
  // Custom patterns (regex strings)
  customPatterns?: Array<{
    name: string;
    pattern: string;
    replacement?: string;
  }>;
  // Masking style
  maskingStyle?: 'redact' | 'hash' | 'placeholder';
}

const DEFAULT_CONFIG: AnonymizationConfig = {
  enabled: true,
  detectEmail: true,
  detectPhone: true,
  detectSSN: true,
  detectCreditCard: true,
  detectName: false, // Names require NLP, disabled by default
  detectAddress: false, // Addresses require NLP, disabled by default
  detectIpAddress: true,
  maskingStyle: 'placeholder',
};

/**
 * Anonymization Service ("Tofu Box")
 *
 * Detects and masks PII before sending to third-party AI providers.
 * This protects user privacy while still enabling AI functionality.
 */
@Injectable()
export class AnonymizationService {
  // Regex patterns for common PII types
  private readonly patterns = {
    // Email: standard email format
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // Phone: various formats (US-focused but catches international)
    phone: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

    // SSN: xxx-xx-xxxx format
    ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,

    // Credit Card: 13-19 digits with optional separators
    creditCard: /\b(?:\d{4}[-.\s]?){3,4}\d{1,4}\b/g,

    // IP Address: IPv4 format
    ipAddress:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

    // Date of Birth patterns (MM/DD/YYYY, DD-MM-YYYY, etc.)
    dateOfBirth:
      /\b(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:19|20)\d{2}\b/g,
  };

  // Placeholder tokens for each PII type
  private readonly placeholders = {
    email: '[EMAIL_REDACTED]',
    phone: '[PHONE_REDACTED]',
    ssn: '[SSN_REDACTED]',
    creditCard: '[CARD_REDACTED]',
    ipAddress: '[IP_REDACTED]',
    dateOfBirth: '[DOB_REDACTED]',
    name: '[NAME_REDACTED]',
    address: '[ADDRESS_REDACTED]',
    custom: '[PII_REDACTED]',
  };

  /**
   * Anonymize text content by detecting and masking PII
   */
  anonymizeText(
    text: string,
    config: Partial<AnonymizationConfig> = {},
  ): AnonymizationResult {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    if (!mergedConfig.enabled) {
      return { text, replacements: [], piiDetected: false };
    }

    let result = text;
    const replacements: AnonymizationResult['replacements'] = [];

    // Process each enabled PII type
    if (mergedConfig.detectEmail) {
      const emailResult = this.maskPattern(
        result,
        this.patterns.email,
        'email',
        mergedConfig.maskingStyle,
      );
      result = emailResult.text;
      replacements.push(...emailResult.replacements);
    }

    if (mergedConfig.detectPhone) {
      const phoneResult = this.maskPattern(
        result,
        this.patterns.phone,
        'phone',
        mergedConfig.maskingStyle,
      );
      result = phoneResult.text;
      replacements.push(...phoneResult.replacements);
    }

    if (mergedConfig.detectSSN) {
      const ssnResult = this.maskPattern(
        result,
        this.patterns.ssn,
        'ssn',
        mergedConfig.maskingStyle,
      );
      result = ssnResult.text;
      replacements.push(...ssnResult.replacements);
    }

    if (mergedConfig.detectCreditCard) {
      const ccResult = this.maskPattern(
        result,
        this.patterns.creditCard,
        'creditCard',
        mergedConfig.maskingStyle,
      );
      result = ccResult.text;
      replacements.push(...ccResult.replacements);
    }

    if (mergedConfig.detectIpAddress) {
      const ipResult = this.maskPattern(
        result,
        this.patterns.ipAddress,
        'ipAddress',
        mergedConfig.maskingStyle,
      );
      result = ipResult.text;
      replacements.push(...ipResult.replacements);
    }

    // Process custom patterns
    if (mergedConfig.customPatterns) {
      for (const customPattern of mergedConfig.customPatterns) {
        try {
          const regex = new RegExp(customPattern.pattern, 'g');
          const customResult = this.maskPattern(
            result,
            regex,
            customPattern.name,
            mergedConfig.maskingStyle,
            customPattern.replacement,
          );
          result = customResult.text;
          replacements.push(...customResult.replacements);
        } catch (e) {
          // Invalid regex, skip
          console.warn(`Invalid custom pattern: ${customPattern.pattern}`);
        }
      }
    }

    return {
      text: result,
      replacements,
      piiDetected: replacements.length > 0,
    };
  }

  /**
   * Extract text content from message content (handles both string and array formats)
   * Used for multimodal/vision model messages where content is an array
   */
  private extractTextContent(content: string | any[]): string {
    // Handle string content (simple text messages)
    if (typeof content === 'string') {
      return content;
    }

    // Handle array content (multi-modal messages - vision models)
    if (Array.isArray(content)) {
      return content
        .filter(part => part?.type === 'text' && typeof part.text === 'string')
        .map(part => part.text)
        .join('\n');
    }

    // Unknown format - return empty string (safe default)
    return '';
  }

  /**
   * Anonymize content and reconstruct in original format
   * For array content, processes each text part individually
   */
  private anonymizeContent(
    content: string | any[],
    config: Partial<AnonymizationConfig>,
  ): { content: string | any[]; piiDetected: boolean; replacementCount: number } {
    // Handle string content (simple text messages)
    if (typeof content === 'string') {
      const result = this.anonymizeText(content, config);
      return {
        content: result.text,
        piiDetected: result.piiDetected,
        replacementCount: result.replacements.length,
      };
    }

    // Handle array content (multi-modal messages - vision models)
    if (Array.isArray(content)) {
      let piiDetected = false;
      let replacementCount = 0;

      const anonymizedContent = content.map(part => {
        // Only process text parts
        if (part?.type === 'text' && typeof part.text === 'string') {
          const result = this.anonymizeText(part.text, config);
          if (result.piiDetected) {
            piiDetected = true;
            replacementCount += result.replacements.length;
          }
          return {
            ...part,
            text: result.text,
          };
        }
        // Return non-text parts unchanged (images, etc.)
        return part;
      });

      return {
        content: anonymizedContent,
        piiDetected,
        replacementCount,
      };
    }

    // Unknown format - return unchanged
    return { content, piiDetected: false, replacementCount: 0 };
  }

  /**
   * Anonymize messages array (for chat completions)
   * Handles both string content and array content (multimodal/vision models)
   */
  anonymizeMessages(
    messages: Array<{ role: string; content: string | any[] }>,
    config: Partial<AnonymizationConfig> = {},
  ): {
    messages: Array<{ role: string; content: string | any[] }>;
    piiDetected: boolean;
    totalReplacements: number;
  } {
    let piiDetected = false;
    let totalReplacements = 0;

    const anonymizedMessages = messages.map((message) => {
      // Only anonymize user messages by default (assistant/system messages are our own)
      if (message.role !== 'user') {
        return message;
      }

      const result = this.anonymizeContent(message.content, config);
      if (result.piiDetected) {
        piiDetected = true;
        totalReplacements += result.replacementCount;
      }

      return {
        ...message,
        content: result.content,
      };
    });

    return { messages: anonymizedMessages, piiDetected, totalReplacements };
  }

  /**
   * Anonymize a prompt string (for embeddings, images, etc.)
   */
  anonymizePrompt(
    prompt: string,
    config: Partial<AnonymizationConfig> = {},
  ): AnonymizationResult {
    return this.anonymizeText(prompt, config);
  }

  /**
   * Check if content contains PII without modifying it
   * Handles both string content and array content (multimodal/vision models)
   */
  detectPII(
    content: string | any[],
    config: Partial<AnonymizationConfig> = {},
  ): {
    hasPII: boolean;
    types: string[];
    count: number;
  } {
    // Extract text from content (handles both string and array formats)
    const text = this.extractTextContent(content);
    
    if (!text) {
      return { hasPII: false, types: [], count: 0 };
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const detectedTypes: string[] = [];
    let count = 0;

    if (mergedConfig.detectEmail) {
      const matches = text.match(this.patterns.email);
      if (matches) {
        detectedTypes.push('email');
        count += matches.length;
      }
    }

    if (mergedConfig.detectPhone) {
      const matches = text.match(this.patterns.phone);
      if (matches) {
        detectedTypes.push('phone');
        count += matches.length;
      }
    }

    if (mergedConfig.detectSSN) {
      const matches = text.match(this.patterns.ssn);
      if (matches) {
        detectedTypes.push('ssn');
        count += matches.length;
      }
    }

    if (mergedConfig.detectCreditCard) {
      const matches = text.match(this.patterns.creditCard);
      if (matches) {
        detectedTypes.push('creditCard');
        count += matches.length;
      }
    }

    if (mergedConfig.detectIpAddress) {
      const matches = text.match(this.patterns.ipAddress);
      if (matches) {
        detectedTypes.push('ipAddress');
        count += matches.length;
      }
    }

    return {
      hasPII: count > 0,
      types: detectedTypes,
      count,
    };
  }

  /**
   * Get available anonymization categories for configuration UI
   */
  getAvailableCategories() {
    return [
      {
        id: 'email',
        name: 'Email Addresses',
        description: 'Detects email addresses like user@example.com',
        default: true,
      },
      {
        id: 'phone',
        name: 'Phone Numbers',
        description: 'Detects phone numbers in various formats',
        default: true,
      },
      {
        id: 'ssn',
        name: 'Social Security Numbers',
        description: 'Detects SSN patterns (xxx-xx-xxxx)',
        default: true,
      },
      {
        id: 'creditCard',
        name: 'Credit Card Numbers',
        description: 'Detects credit card number patterns',
        default: true,
      },
      {
        id: 'ipAddress',
        name: 'IP Addresses',
        description: 'Detects IPv4 addresses',
        default: true,
      },
    ];
  }

  /**
   * Mask matches of a pattern in text
   */
  private maskPattern(
    text: string,
    pattern: RegExp,
    type: string,
    maskingStyle: AnonymizationConfig['maskingStyle'] = 'placeholder',
    customReplacement?: string,
  ): { text: string; replacements: AnonymizationResult['replacements'] } {
    const replacements: AnonymizationResult['replacements'] = [];

    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    let match;
    let offset = 0;
    let result = text;

    // Create a new regex for each iteration to avoid issues with global flag
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      const original = match[0];
      const start = match.index;
      const end = start + original.length;

      let replacement: string;
      switch (maskingStyle) {
        case 'redact':
          replacement = '*'.repeat(original.length);
          break;
        case 'hash':
          replacement = `[${type.toUpperCase()}_${this.simpleHash(original)}]`;
          break;
        case 'placeholder':
        default:
          replacement =
            customReplacement || this.placeholders[type] || '[PII_REDACTED]';
      }

      replacements.push({
        type,
        original,
        replacement,
        start,
        end,
      });

      // Apply replacement with offset tracking
      const adjustedStart = start + offset;
      result =
        result.slice(0, adjustedStart) +
        replacement +
        result.slice(adjustedStart + original.length);
      offset += replacement.length - original.length;
    }

    return { text: result, replacements };
  }

  /**
   * Simple hash for consistent replacement tokens
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).slice(0, 6).toUpperCase();
  }
}
