import { Injectable } from '@nestjs/common';

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  pattern?: string;
  severity?: 'low' | 'medium' | 'high';
}

@Injectable()
export class SecurityService {
  /**
   * Extract text content from message content (handles both string and array formats)
   * 
   * OpenAI's API supports two content formats:
   * 1. String format (simple text): { content: "Hello" }
   * 2. Array format (multi-modal): { content: [{ type: "text", text: "Hello" }, { type: "image_url", ... }] }
   * 
   * This method ensures security checks work correctly regardless of format.
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
        .join('\n');  // Join multiple text parts with newlines
    }

    // Unknown format - return empty string (safe default)
    return '';
  }

  // Known prompt injection patterns categorized by attack type
  private readonly injectionPatterns = {
    // Direct system prompt extraction
    systemPromptExtraction: [
      /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
      /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|commands|directives)/i,
      /forget\s+(all\s+)?(previous|prior|above)\s+instructions/i,
      /what\s+(is|are|was|were)\s+your\s+(initial|original|system)\s+(prompt|instructions)/i,
      /show\s+(me\s+)?(your|the)\s+system\s+prompt/i,
      /print\s+(your|the)\s+system\s+prompt/i,
      /reveal\s+(your|the)\s+system\s+(prompt|instructions)/i,
      /output\s+(your|the)\s+system\s+(prompt|instructions)/i,
      /what\s+are\s+you\s+programmed\s+to/i,
      /repeat\s+(your|the)\s+(system|initial)\s+(prompt|instructions)/i,
      /tell\s+me\s+(your|the)\s+(instructions|rules)\s+you\s+follow/i,
    ],

    // Role manipulation
    roleManipulation: [
      /you\s+are\s+now\s+(a\s+)?(?!assistant|helpful)/i,
      /act\s+as\s+(a\s+)?(?!assistant|helpful)/i,
      /pretend\s+to\s+be/i,
      /simulate\s+(a|an)\s+/i,
      /roleplay\s+as/i,
      /new\s+role:/i,
      /you\s+are\s+in\s+developer\s+mode/i,
      /enable\s+developer\s+mode/i,
      /DAN\s+mode/i, // "Do Anything Now" jailbreak
      /sudo\s+mode/i,
    ],

    // Instruction override attempts
    instructionOverride: [
      /\[SYSTEM\]/i,
      /\[INST\]/i,
      /\[\/INST\]/i,
      /<\|system\|>/i,
      /<\|im_start\|>system/i,
      /new\s+system\s+message:/i,
      /system\s+override:/i,
      /admin\s+override:/i,
      /root\s+command:/i,
    ],

    // Prompt boundary breaking
    boundaryBreaking: [
      /\-{3,}\s*(end|stop|ignore|new)\s+/i,
      /={3,}\s*(end|stop|ignore|new)\s+/i,
      /\*{3,}\s*(end|stop|ignore|new)\s+/i,
      /end\s+of\s+(prompt|instructions|context)/i,
      /start\s+new\s+(prompt|instructions|context)/i,
    ],

    // Encoding/obfuscation attempts
    obfuscation: [
      /base64|rot13|hex|encode|decode/i,
      /translate\s+to\s+(?!english|spanish|french|german|chinese|japanese)/i,
      /(?:cipher|encrypt|decrypt)\s+(?!password|data)/i,
    ],

    // Direct leakage requests
    directLeakage: [
      /show\s+me\s+(the|your)\s+(?:first|initial|original)/i,
      /what\s+was\s+your\s+first\s+message/i,
      /repeat\s+everything\s+above/i,
      /output\s+everything\s+before\s+this/i,
      /print\s+your\s+context/i,
      /dump\s+your\s+memory/i,
    ],
  };

  /**
   * Run security scan on raw text against injection patterns.
   * This is the core scanning engine used by all public-facing methods.
   */
  private scanText(
    text: string,
    enabledCategories?: string[],
  ): SecurityCheckResult {
    if (!text) {
      return { allowed: true };
    }

    const categories = enabledCategories || Object.keys(this.injectionPatterns);

    for (const category of categories) {
      const patterns = this.injectionPatterns[category];
      if (!patterns) continue;

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return {
            allowed: false,
            reason: this.getReasonForCategory(category),
            pattern: category,
            severity: this.getSeverityForCategory(category),
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Extract all scannable text from a message object.
   * Collects text from content, tool_calls, function_call, and name fields
   * since attackers can place prompt injections in any of these.
   */
  private extractAllMessageText(message: any): string {
    const parts: string[] = [];

    // Extract from content (string or multimodal array)
    const contentText = this.extractTextContent(message.content);
    if (contentText) {
      parts.push(contentText);
    }

    // Extract from tool_calls (OpenAI function calling format)
    if (Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls) {
        if (call.function?.name) {
          parts.push(call.function.name);
        }
        if (call.function?.arguments) {
          parts.push(call.function.arguments);
        }
      }
    }

    // Extract from function_call (legacy OpenAI function calling format)
    if (message.function_call) {
      if (message.function_call.name) {
        parts.push(message.function_call.name);
      }
      if (message.function_call.arguments) {
        parts.push(message.function_call.arguments);
      }
    }

    // Extract from name field (used in tool/function response messages)
    if (typeof message.name === 'string') {
      parts.push(message.name);
    }

    return parts.join('\n');
  }

  /**
   * Check if a message contains prompt injection attempts
   * Supports both string content and array content (multi-modal/vision format)
   */
  checkMessage(
    content: string | any[],
    enabledCategories?: string[],
  ): SecurityCheckResult {
    const textContent = this.extractTextContent(content);
    return this.scanText(textContent, enabledCategories);
  }

  /**
   * Check all messages in a conversation
   * Supports both string content and array content (multi-modal/vision format)
   * 
   * SECURITY: Check ALL messages since the entire messages array is user-controlled input.
   * An attacker can inject malicious content in any role (system/assistant/user).
   * Scans content, tool_calls, function_call, and name fields for injection attempts.
   */
  checkMessages(
    messages: Array<any>,
    enabledCategories?: string[],
  ): SecurityCheckResult {
    // Check all messages - the entire messages array is user-controlled input
    for (const message of messages) {
      // Collect all scannable text from every field of the message
      const allText = this.extractAllMessageText(message);
      const result = this.scanText(allText, enabledCategories);
      if (!result.allowed) {
        return result;
      }
    }

    return { allowed: true };
  }

  /**
   * Advanced heuristic checks for sophisticated attacks.
   * Accepts either a content field (string/array) or a full message object.
   * When a full message object is passed, all text fields are inspected.
   */
  checkAdvancedHeuristics(contentOrMessage: string | any[] | { content?: any; tool_calls?: any; function_call?: any; name?: string }): SecurityCheckResult {
    // If it looks like a full message object (has role, tool_calls, function_call, etc.),
    // extract all text fields. Otherwise treat as a content value.
    let textContent: string;
    if (contentOrMessage !== null && typeof contentOrMessage === 'object' && !Array.isArray(contentOrMessage) && ('tool_calls' in contentOrMessage || 'function_call' in contentOrMessage || 'role' in contentOrMessage)) {
      textContent = this.extractAllMessageText(contentOrMessage);
    } else {
      textContent = this.extractTextContent(contentOrMessage as string | any[]);
    }
    
    // If no text content, allow (nothing to check)
    if (!textContent) {
      return { allowed: true };
    }

    // Check for unusual repetition of special characters
    const specialCharCount = (textContent.match(/[<>[\]{}|\\]/g) || []).length;
    if (specialCharCount > 20) {
      return {
        allowed: false,
        reason: 'Excessive special characters detected',
        pattern: 'heuristic',
        severity: 'medium',
      };
    }

    // Check for very long words (possible obfuscation)
    const words = textContent.split(/\s+/);
    const hasVeryLongWord = words.some((word) => word.length > 100);
    if (hasVeryLongWord) {
      return {
        allowed: false,
        reason: 'Suspicious token pattern detected',
        pattern: 'heuristic',
        severity: 'low',
      };
    }

    // Check for excessive newlines (boundary breaking attempt)
    const newlineCount = (textContent.match(/\n/g) || []).length;
    if (newlineCount > 50) {
      return {
        allowed: false,
        reason: 'Suspicious formatting detected',
        pattern: 'heuristic',
        severity: 'low',
      };
    }

    return { allowed: true };
  }

  private getReasonForCategory(category: string): string {
    const reasons = {
      systemPromptExtraction:
        'Attempt to extract system prompt detected. This violates security policies.',
      roleManipulation:
        'Attempt to manipulate AI role detected. This violates security policies.',
      instructionOverride:
        'Attempt to override system instructions detected. This violates security policies.',
      boundaryBreaking:
        'Attempt to break prompt boundaries detected. This violates security policies.',
      obfuscation:
        'Suspicious encoding or obfuscation detected. This violates security policies.',
      directLeakage:
        'Attempt to leak internal context detected. This violates security policies.',
    };

    return reasons[category] || 'Security policy violation detected.';
  }

  private getSeverityForCategory(category: string): 'low' | 'medium' | 'high' {
    const severities = {
      systemPromptExtraction: 'high',
      roleManipulation: 'high',
      instructionOverride: 'high',
      boundaryBreaking: 'medium',
      obfuscation: 'medium',
      directLeakage: 'high',
    };

    return (severities[category] as 'low' | 'medium' | 'high') || 'medium';
  }

  /**
   * Get available security categories for configuration
   */
  getAvailableCategories() {
    return Object.keys(this.injectionPatterns).map((key) => ({
      id: key,
      name: this.formatCategoryName(key),
      description: this.getCategoryDescription(key),
      severity: this.getSeverityForCategory(key),
    }));
  }

  private formatCategoryName(category: string): string {
    return category.replace(/([A-Z])/g, ' $1').trim();
  }

  private getCategoryDescription(category: string): string {
    const descriptions = {
      systemPromptExtraction:
        'Detects attempts to extract or reveal system prompts and instructions',
      roleManipulation:
        'Detects attempts to change the AI role or behavior (e.g., "DAN mode")',
      instructionOverride:
        'Detects attempts to inject system-level commands or overrides',
      boundaryBreaking:
        'Detects attempts to break out of the conversation context',
      obfuscation: 'Detects suspicious encoding or obfuscation techniques',
      directLeakage:
        'Detects direct requests to leak internal context or memory',
    };

    return descriptions[category] || 'Security pattern detection';
  }
}
