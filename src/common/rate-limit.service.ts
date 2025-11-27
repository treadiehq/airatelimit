import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis for distributed rate limiting
 */
@Injectable()
export class RateLimitService {
  private readonly limits = new Map<string, RateLimitEntry>();
  
  // Cleanup old entries every 5 minutes
  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an action is allowed under rate limit
   * @param key Unique identifier (e.g., "magic-link:user@email.com")
   * @param maxRequests Maximum requests allowed in the window
   * @param windowMs Time window in milliseconds
   * @returns Object with allowed status and remaining requests
   */
  check(key: string, maxRequests: number, windowMs: number): { 
    allowed: boolean; 
    remaining: number; 
    resetAt: Date;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No existing entry or window expired
    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(now + windowMs),
      };
    }

    // Within window - check count
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    // Increment and allow
    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  }

  /**
   * Reset rate limit for a key (e.g., after successful verification)
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

