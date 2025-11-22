import { Injectable } from '@nestjs/common';
import { Project } from '../projects/projects.entity';
import { UsageCounter } from './usage.entity';

export interface RuleEvaluationContext {
  project: Project;
  identity: string;
  tier?: string;
  usage: UsageCounter;
  usagePercent: { requests?: number; tokens?: number };
  requestedTokens: number;
  requestedRequests: number;
}

export interface RuleEvaluationResult {
  matched: boolean;
  action?: {
    type: 'allow' | 'block' | 'custom_response';
    response?: any;
    deepLink?: string;
  };
}

@Injectable()
export class RuleEngineService {
  /**
   * Phase 3: Evaluate all enabled rules for a project
   * Returns the first matching rule's action, or null if no rules match
   */
  evaluateRules(context: RuleEvaluationContext): RuleEvaluationResult {
    const { project } = context;

    // If no rules configured, return no match
    if (!project.rules || project.rules.length === 0) {
      return { matched: false };
    }

    // Evaluate rules in order until one matches
    for (const rule of project.rules) {
      if (!rule.enabled) {
        continue;
      }

      if (this.evaluateCondition(rule.condition, context)) {
        return {
          matched: true,
          action: rule.action,
        };
      }
    }

    return { matched: false };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: any, context: RuleEvaluationContext): boolean {
    switch (condition.type) {
      case 'usage_percent':
        return this.evaluateUsagePercent(condition, context);
      
      case 'usage_absolute':
        return this.evaluateUsageAbsolute(condition, context);
      
      case 'tier_match':
        return this.evaluateTierMatch(condition, context);
      
      case 'composite':
        return this.evaluateComposite(condition, context);
      
      default:
        return false;
    }
  }

  /**
   * Check if usage percentage meets condition
   * Example: { type: 'usage_percent', metric: 'requests', operator: 'gte', threshold: 80 }
   */
  private evaluateUsagePercent(condition: any, context: RuleEvaluationContext): boolean {
    const { metric, operator, threshold } = condition;
    const value = context.usagePercent[metric as 'requests' | 'tokens'];

    if (value === undefined) {
      return false;
    }

    return this.compareValues(value, operator, threshold);
  }

  /**
   * Check if absolute usage meets condition
   * Example: { type: 'usage_absolute', metric: 'tokens', operator: 'gt', threshold: 5000 }
   */
  private evaluateUsageAbsolute(condition: any, context: RuleEvaluationContext): boolean {
    const { metric, operator, threshold } = condition;
    const value = metric === 'requests' 
      ? context.usage.requestsUsed + context.requestedRequests
      : context.usage.tokensUsed + context.requestedTokens;

    return this.compareValues(value, operator, threshold);
  }

  /**
   * Check if tier matches
   * Example: { type: 'tier_match', tierValue: 'free' }
   */
  private evaluateTierMatch(condition: any, context: RuleEvaluationContext): boolean {
    return context.tier === condition.tierValue;
  }

  /**
   * Evaluate composite conditions (AND/OR logic)
   * Example: { type: 'composite', operator: 'AND', conditions: [...] }
   */
  private evaluateComposite(condition: any, context: RuleEvaluationContext): boolean {
    const { operator = 'AND', conditions = [] } = condition;

    if (operator === 'AND') {
      return conditions.every((cond: any) => this.evaluateCondition(cond, context));
    } else if (operator === 'OR') {
      return conditions.some((cond: any) => this.evaluateCondition(cond, context));
    }

    return false;
  }

  /**
   * Compare values using operator
   */
  private compareValues(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }
}

