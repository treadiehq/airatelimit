import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityLimit } from './identity-limit.entity';

export interface CreateIdentityLimitDto {
  identity: string;
  requestLimit?: number | null;
  tokenLimit?: number | null;
  customResponse?: any;
  metadata?: Record<string, any>;
  enabled?: boolean;
}

export interface UpdateIdentityLimitDto {
  requestLimit?: number | null;
  tokenLimit?: number | null;
  customResponse?: any;
  metadata?: Record<string, any>;
  enabled?: boolean;
}

@Injectable()
export class IdentityLimitsService {
  constructor(
    @InjectRepository(IdentityLimit)
    private identityLimitRepository: Repository<IdentityLimit>,
  ) {}

  /**
   * Get limit overrides for a specific identity
   * Returns null if no custom limits are set
   */
  async getForIdentity(
    projectId: string,
    identity: string,
  ): Promise<IdentityLimit | null> {
    return this.identityLimitRepository.findOne({
      where: { projectId, identity },
    });
  }

  /**
   * List all identity limits for a project
   */
  async listForProject(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: IdentityLimit[]; total: number }> {
    const [items, total] = await this.identityLimitRepository.findAndCount({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return { items, total };
  }

  /**
   * Create or update identity limits (upsert)
   */
  async upsert(
    projectId: string,
    dto: CreateIdentityLimitDto,
  ): Promise<IdentityLimit> {
    const existing = await this.getForIdentity(projectId, dto.identity);

    if (existing) {
      // Update existing
      Object.assign(existing, {
        requestLimit: dto.requestLimit ?? existing.requestLimit,
        tokenLimit: dto.tokenLimit ?? existing.tokenLimit,
        customResponse: dto.customResponse ?? existing.customResponse,
        metadata: dto.metadata ?? existing.metadata,
        enabled: dto.enabled ?? existing.enabled,
      });
      return this.identityLimitRepository.save(existing);
    }

    // Create new
    const identityLimit = this.identityLimitRepository.create({
      projectId,
      identity: dto.identity,
      requestLimit: dto.requestLimit,
      tokenLimit: dto.tokenLimit,
      customResponse: dto.customResponse,
      metadata: dto.metadata,
      enabled: dto.enabled ?? true,
    });

    return this.identityLimitRepository.save(identityLimit);
  }

  /**
   * Update an existing identity limit
   */
  async update(
    projectId: string,
    identity: string,
    dto: UpdateIdentityLimitDto,
  ): Promise<IdentityLimit> {
    const existing = await this.getForIdentity(projectId, identity);

    if (!existing) {
      throw new NotFoundException(`No limits found for identity: ${identity}`);
    }

    Object.assign(existing, dto);
    return this.identityLimitRepository.save(existing);
  }

  /**
   * Delete identity limits
   */
  async delete(projectId: string, identity: string): Promise<void> {
    const result = await this.identityLimitRepository.delete({
      projectId,
      identity,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`No limits found for identity: ${identity}`);
    }
  }

  /**
   * Bulk upsert identity limits
   */
  async bulkUpsert(
    projectId: string,
    items: CreateIdentityLimitDto[],
  ): Promise<IdentityLimit[]> {
    const results: IdentityLimit[] = [];

    for (const item of items) {
      const result = await this.upsert(projectId, item);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if an identity is enabled (not disabled)
   * Returns true if no limit record exists (default enabled)
   */
  async isEnabled(projectId: string, identity: string): Promise<boolean> {
    const limit = await this.getForIdentity(projectId, identity);
    return limit?.enabled ?? true;
  }

  /**
   * Gift tokens or requests to an identity (additive)
   * Uses atomic upsert to prevent lost updates under concurrent access.
   */
  async giftCredits(
    projectId: string,
    identity: string,
    tokens: number,
    requests: number,
    reason?: string,
  ): Promise<IdentityLimit> {
    const metadata = reason
      ? JSON.stringify({
          lastGiftReason: reason,
          lastGiftDate: new Date().toISOString(),
        })
      : null;

    // Atomic upsert: creates the row if missing, or atomically increments gifted credits.
    // Using SQL arithmetic (col = col + value) ensures concurrent gifts are additive
    // rather than overwriting each other via read-modify-write.
    await this.identityLimitRepository.query(
      `INSERT INTO identity_limits (id, "projectId", identity, "giftedTokens", "giftedRequests", enabled, metadata, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5::jsonb, NOW(), NOW())
       ON CONFLICT ("projectId", identity)
       DO UPDATE SET
         "giftedTokens" = identity_limits."giftedTokens" + $3,
         "giftedRequests" = identity_limits."giftedRequests" + $4,
         metadata = CASE
           WHEN $5::jsonb IS NOT NULL
           THEN COALESCE(identity_limits.metadata, '{}'::jsonb) || $5::jsonb
           ELSE identity_limits.metadata
         END,
         "updatedAt" = NOW()`,
      [projectId, identity, tokens, requests, metadata],
    );

    // Return the updated entity
    return this.getForIdentity(projectId, identity) as Promise<IdentityLimit>;
  }

  /**
   * Set promotional override (unlimited access until date)
   */
  async setPromoOverride(
    projectId: string,
    identity: string,
    unlimitedUntil: Date | null,
    reason?: string,
  ): Promise<IdentityLimit> {
    let existing = await this.getForIdentity(projectId, identity);

    if (!existing) {
      existing = this.identityLimitRepository.create({
        projectId,
        identity,
        giftedTokens: 0,
        giftedRequests: 0,
        enabled: true,
      });
    }

    existing.unlimitedUntil = unlimitedUntil;

    if (reason) {
      existing.metadata = {
        ...existing.metadata,
        promoReason: reason,
        promoSetDate: new Date().toISOString(),
      };
    }

    return this.identityLimitRepository.save(existing);
  }

  /**
   * Consume gifted credits (called when limits would be exceeded)
   * Returns true if gifted credits were consumed, false if none available.
   * Uses atomic CTE with FOR UPDATE to prevent double-spending under concurrent access.
   */
  async consumeGiftedCredits(
    projectId: string,
    identity: string,
    tokensNeeded: number,
    requestsNeeded: number,
  ): Promise<{ consumed: boolean; tokensConsumed: number; requestsConsumed: number }> {
    // Atomic consume: the CTE locks the row (FOR UPDATE) and computes consumption
    // amounts from the current balance, then the UPDATE atomically deducts them.
    // The WHERE clause (tokens_to_consume > 0 OR requests_to_consume > 0) ensures
    // the UPDATE only proceeds if there are credits to consume, preventing
    // double-spending when concurrent requests race for the same credits.
    const result = await this.identityLimitRepository.query(
      `WITH to_consume AS (
        SELECT
          id,
          LEAST($3::int, COALESCE("giftedTokens", 0)) as tokens_to_consume,
          LEAST($4::int, COALESCE("giftedRequests", 0)) as requests_to_consume
        FROM identity_limits
        WHERE "projectId" = $1 AND identity = $2
        FOR UPDATE
      )
      UPDATE identity_limits il
      SET
        "giftedTokens" = COALESCE(il."giftedTokens", 0) - tc.tokens_to_consume,
        "giftedRequests" = COALESCE(il."giftedRequests", 0) - tc.requests_to_consume,
        "updatedAt" = NOW()
      FROM to_consume tc
      WHERE il.id = tc.id
        AND (tc.tokens_to_consume > 0 OR tc.requests_to_consume > 0)
      RETURNING tc.tokens_to_consume as "tokensConsumed", tc.requests_to_consume as "requestsConsumed"`,
      [projectId, identity, tokensNeeded, requestsNeeded],
    );

    // TypeORM raw query returns [rows, affectedCount] for PostgreSQL
    const rows = Array.isArray(result[0]) ? result[0] : result;

    if (rows.length > 0) {
      return {
        consumed: true,
        tokensConsumed: parseInt(rows[0].tokensConsumed, 10),
        requestsConsumed: parseInt(rows[0].requestsConsumed, 10),
      };
    }

    return { consumed: false, tokensConsumed: 0, requestsConsumed: 0 };
  }

  /**
   * Check if identity has active promotional override
   */
  async hasActivePromo(projectId: string, identity: string): Promise<boolean> {
    const existing = await this.getForIdentity(projectId, identity);
    if (!existing?.unlimitedUntil) return false;
    return existing.unlimitedUntil > new Date();
  }
}
