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
   */
  async giftCredits(
    projectId: string,
    identity: string,
    tokens: number,
    requests: number,
    reason?: string,
  ): Promise<IdentityLimit> {
    let existing = await this.getForIdentity(projectId, identity);

    if (!existing) {
      // Create a new record for this identity
      existing = this.identityLimitRepository.create({
        projectId,
        identity,
        giftedTokens: 0,
        giftedRequests: 0,
        enabled: true,
      });
    }

    // Add to existing gifted amounts
    existing.giftedTokens = (existing.giftedTokens || 0) + tokens;
    existing.giftedRequests = (existing.giftedRequests || 0) + requests;

    // Store reason in metadata
    if (reason) {
      existing.metadata = {
        ...existing.metadata,
        lastGiftReason: reason,
        lastGiftDate: new Date().toISOString(),
      };
    }

    return this.identityLimitRepository.save(existing);
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
   * Returns true if gifted credits were consumed, false if none available
   */
  async consumeGiftedCredits(
    projectId: string,
    identity: string,
    tokensNeeded: number,
    requestsNeeded: number,
  ): Promise<{ consumed: boolean; tokensConsumed: number; requestsConsumed: number }> {
    const existing = await this.getForIdentity(projectId, identity);
    if (!existing) {
      return { consumed: false, tokensConsumed: 0, requestsConsumed: 0 };
    }

    const tokensToConsume = Math.min(tokensNeeded, existing.giftedTokens || 0);
    const requestsToConsume = Math.min(requestsNeeded, existing.giftedRequests || 0);

    if (tokensToConsume > 0 || requestsToConsume > 0) {
      existing.giftedTokens = (existing.giftedTokens || 0) - tokensToConsume;
      existing.giftedRequests = (existing.giftedRequests || 0) - requestsToConsume;
      await this.identityLimitRepository.save(existing);
      return { consumed: true, tokensConsumed: tokensToConsume, requestsConsumed: requestsToConsume };
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
