import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SponsorshipPool, PoolRoutingStrategy } from './sponsorship-pool.entity';
import { SponsorshipPoolMember } from './sponsorship-pool-member.entity';
import { PoolToken } from './pool-token.entity';
import { Sponsorship } from './sponsorship.entity';
import { SponsoredToken } from './sponsored-token.entity';
import { SponsorshipUsage } from './sponsorship-usage.entity';
import { SponsorKey } from './sponsor-key.entity';
import { CryptoService } from '../common/crypto.service';

export interface PoolRouteResult {
  success: boolean;
  sponsorship?: Sponsorship;
  sponsorKey?: SponsorKey;
  decryptedApiKey?: string;
  error?: string;
}

export interface CreatePoolDto {
  name: string;
  description?: string;
  routingStrategy?: PoolRoutingStrategy;
  allowedProviders?: string[];
}

export interface AddPoolMemberDto {
  sponsorshipId: string;
  priority?: number;
  weight?: number;
}

export interface AddPoolMemberByTokenDto {
  token: string;
  priority?: number;
  weight?: number;
}

@Injectable()
export class PoolService {
  private readonly logger = new Logger(PoolService.name);

  constructor(
    @InjectRepository(SponsorshipPool)
    private poolRepository: Repository<SponsorshipPool>,
    @InjectRepository(SponsorshipPoolMember)
    private memberRepository: Repository<SponsorshipPoolMember>,
    @InjectRepository(PoolToken)
    private tokenRepository: Repository<PoolToken>,
    @InjectRepository(Sponsorship)
    private sponsorshipRepository: Repository<Sponsorship>,
    @InjectRepository(SponsoredToken)
    private sponsoredTokenRepository: Repository<SponsoredToken>,
    @InjectRepository(SponsorshipUsage)
    private usageRepository: Repository<SponsorshipUsage>,
    @InjectRepository(SponsorKey)
    private sponsorKeyRepository: Repository<SponsorKey>,
    private cryptoService: CryptoService,
  ) {}

  // =====================================================
  // POOL CRUD OPERATIONS
  // =====================================================

  /**
   * Create a new sponsorship pool
   */
  async createPool(ownerOrgId: string, dto: CreatePoolDto): Promise<SponsorshipPool> {
    const pool = this.poolRepository.create({
      ownerOrgId,
      name: dto.name,
      description: dto.description,
      routingStrategy: dto.routingStrategy || 'proportional',
      allowedProviders: dto.allowedProviders,
      isActive: true,
    });

    return this.poolRepository.save(pool);
  }

  /**
   * List pools owned by an organization
   */
  async listPools(ownerOrgId: string): Promise<SponsorshipPool[]> {
    return this.poolRepository.find({
      where: { ownerOrgId },
      relations: ['members', 'members.sponsorship', 'members.sponsorship.sponsorKey'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a pool by ID
   */
  async getPool(poolId: string, ownerOrgId: string): Promise<SponsorshipPool> {
    const pool = await this.poolRepository.findOne({
      where: { id: poolId },
      relations: ['members', 'members.sponsorship', 'members.sponsorship.sponsorKey', 'members.sponsorship.sponsorOrg'],
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    if (pool.ownerOrgId !== ownerOrgId) {
      throw new ForbiddenException('Access denied to this pool');
    }

    return pool;
  }

  /**
   * Update a pool
   */
  async updatePool(
    poolId: string,
    ownerOrgId: string,
    updates: Partial<CreatePoolDto>,
  ): Promise<SponsorshipPool> {
    const pool = await this.getPool(poolId, ownerOrgId);

    if (updates.name) pool.name = updates.name;
    if (updates.description !== undefined) pool.description = updates.description;
    if (updates.routingStrategy) pool.routingStrategy = updates.routingStrategy;
    if (updates.allowedProviders) pool.allowedProviders = updates.allowedProviders;

    return this.poolRepository.save(pool);
  }

  /**
   * Delete a pool
   */
  async deletePool(poolId: string, ownerOrgId: string): Promise<void> {
    const pool = await this.getPool(poolId, ownerOrgId);
    await this.poolRepository.remove(pool);
  }

  /**
   * Deactivate a pool (soft delete)
   */
  async deactivatePool(poolId: string, ownerOrgId: string): Promise<SponsorshipPool> {
    const pool = await this.getPool(poolId, ownerOrgId);
    pool.isActive = false;
    return this.poolRepository.save(pool);
  }

  // =====================================================
  // POOL MEMBERSHIP
  // =====================================================

  /**
   * Add a sponsorship to a pool
   * Note: The sponsorship must belong to the pool owner OR they need an invitation flow
   */
  async addMember(
    poolId: string,
    ownerOrgId: string,
    dto: AddPoolMemberDto,
  ): Promise<SponsorshipPoolMember> {
    const pool = await this.getPool(poolId, ownerOrgId);

    // Get the sponsorship
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { id: dto.sponsorshipId },
      relations: ['sponsorKey'],
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    // Check if sponsorship is already in this pool
    const existingMember = await this.memberRepository.findOne({
      where: { poolId, sponsorshipId: dto.sponsorshipId },
    });

    if (existingMember) {
      throw new BadRequestException('Sponsorship is already in this pool');
    }

    // Verify sponsorship is active
    if (sponsorship.status !== 'active') {
      throw new BadRequestException('Only active sponsorships can be added to pools');
    }

    // Check provider compatibility if pool has restrictions
    if (pool.allowedProviders?.length > 0) {
      const provider = sponsorship.sponsorKey?.provider;
      if (!pool.allowedProviders.includes(provider)) {
        throw new BadRequestException(
          `Provider ${provider} is not allowed in this pool. Allowed: ${pool.allowedProviders.join(', ')}`,
        );
      }
    }

    const member = this.memberRepository.create({
      poolId,
      sponsorshipId: dto.sponsorshipId,
      priority: dto.priority || 0,
      weight: dto.weight || 1,
      isActive: true,
    });

    return this.memberRepository.save(member);
  }

  /**
   * Add a sponsorship to a pool using a sponsored token
   * This allows adding a sponsorship without having to use it first
   */
  async addMemberByToken(
    poolId: string,
    ownerOrgId: string,
    dto: AddPoolMemberByTokenDto,
  ): Promise<SponsorshipPoolMember> {
    const pool = await this.getPool(poolId, ownerOrgId);

    // Validate the token format
    const rawToken = dto.token.trim();
    if (!rawToken.startsWith('spt_')) {
      throw new BadRequestException('Invalid token format. Expected spt_live_xxx or spt_test_xxx');
    }

    // Hash the token to look it up
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Find the sponsored token
    const sponsoredToken = await this.sponsoredTokenRepository.findOne({
      where: { tokenHash },
      relations: ['sponsorship', 'sponsorship.sponsorKey'],
    });

    if (!sponsoredToken) {
      throw new NotFoundException('Invalid or expired sponsored token');
    }

    const sponsorship = sponsoredToken.sponsorship;

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found for this token');
    }

    // Check if sponsorship is already in this pool
    const existingMember = await this.memberRepository.findOne({
      where: { poolId, sponsorshipId: sponsorship.id },
    });

    if (existingMember) {
      throw new BadRequestException('This sponsorship is already in the pool');
    }

    // Verify sponsorship is active
    if (sponsorship.status !== 'active') {
      throw new BadRequestException(`Sponsorship is ${sponsorship.status}, only active sponsorships can be added`);
    }

    // Check expiration
    if (sponsorship.expiresAt && new Date(sponsorship.expiresAt) < new Date()) {
      throw new BadRequestException('This sponsorship has expired');
    }

    // Check provider compatibility if pool has restrictions
    if (pool.allowedProviders?.length > 0) {
      const provider = sponsorship.sponsorKey?.provider;
      if (!pool.allowedProviders.includes(provider)) {
        throw new BadRequestException(
          `Provider ${provider} is not allowed in this pool. Allowed: ${pool.allowedProviders.join(', ')}`,
        );
      }
    }

    // Auto-link recipientOrgId if not already set
    if (!sponsorship.recipientOrgId) {
      await this.sponsorshipRepository.update(sponsorship.id, {
        recipientOrgId: ownerOrgId,
      });
      this.logger.log(
        `Auto-linked sponsorship ${sponsorship.id} to recipient org ${ownerOrgId} via pool add`,
      );
    } else if (sponsorship.recipientOrgId !== ownerOrgId) {
      // If already linked to a different org, deny
      throw new ForbiddenException('This sponsorship is already linked to a different organization');
    }

    // Create the pool member
    const member = this.memberRepository.create({
      poolId,
      sponsorshipId: sponsorship.id,
      priority: dto.priority || 0,
      weight: dto.weight || 1,
      isActive: true,
    });

    const savedMember = await this.memberRepository.save(member);

    // Reload with relations for response
    return this.memberRepository.findOne({
      where: { id: savedMember.id },
      relations: ['sponsorship', 'sponsorship.sponsorKey', 'sponsorship.sponsorOrg'],
    });
  }

  /**
   * Remove a sponsorship from a pool
   */
  async removeMember(poolId: string, ownerOrgId: string, memberId: string): Promise<void> {
    await this.getPool(poolId, ownerOrgId);

    const member = await this.memberRepository.findOne({
      where: { id: memberId, poolId },
    });

    if (!member) {
      throw new NotFoundException('Pool member not found');
    }

    await this.memberRepository.remove(member);
  }

  /**
   * Update member settings (priority, weight)
   */
  async updateMember(
    poolId: string,
    ownerOrgId: string,
    memberId: string,
    updates: { priority?: number; weight?: number; isActive?: boolean },
  ): Promise<SponsorshipPoolMember> {
    await this.getPool(poolId, ownerOrgId);

    const member = await this.memberRepository.findOne({
      where: { id: memberId, poolId },
    });

    if (!member) {
      throw new NotFoundException('Pool member not found');
    }

    if (updates.priority !== undefined) member.priority = updates.priority;
    if (updates.weight !== undefined) member.weight = updates.weight;
    if (updates.isActive !== undefined) member.isActive = updates.isActive;

    return this.memberRepository.save(member);
  }

  // =====================================================
  // POOL TOKENS
  // =====================================================

  /**
   * Generate a pool token
   */
  async generatePoolToken(poolId: string, ownerOrgId: string): Promise<string> {
    const pool = await this.getPool(poolId, ownerOrgId);

    // Generate token: spp_live_32hexchars
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const rawToken = `spp_live_${randomBytes}`;

    // Hash for storage
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Store token
    const token = this.tokenRepository.create({
      poolId: pool.id,
      tokenHash,
      tokenHint: rawToken.slice(-8),
      isActive: true,
    });

    await this.tokenRepository.save(token);

    // Return raw token (only time it's visible)
    return rawToken;
  }

  /**
   * Revoke a pool token
   */
  async revokePoolToken(poolId: string, ownerOrgId: string, tokenId: string): Promise<void> {
    await this.getPool(poolId, ownerOrgId);

    const token = await this.tokenRepository.findOne({
      where: { id: tokenId, poolId },
    });

    if (!token) {
      throw new NotFoundException('Pool token not found');
    }

    token.isActive = false;
    token.revokedAt = new Date();
    await this.tokenRepository.save(token);
  }

  /**
   * List pool tokens
   */
  async listPoolTokens(poolId: string, ownerOrgId: string): Promise<PoolToken[]> {
    await this.getPool(poolId, ownerOrgId);

    return this.tokenRepository.find({
      where: { poolId },
      order: { createdAt: 'DESC' },
    });
  }

  // =====================================================
  // POOL TOKEN VALIDATION & ROUTING
  // =====================================================

  /**
   * Validate a pool token and route to a sponsor
   */
  async validateAndRoute(
    rawToken: string,
    requestedModel: string,
    estimatedTokens: number,
  ): Promise<PoolRouteResult> {
    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Find the token
    const token = await this.tokenRepository.findOne({
      where: { tokenHash, isActive: true },
      relations: ['pool'],
    });

    if (!token) {
      return { success: false, error: 'Invalid pool token' };
    }

    if (!token.pool.isActive) {
      return { success: false, error: 'Pool is inactive' };
    }

    // Update token usage
    token.lastUsedAt = new Date();
    token.usageCount += 1;
    await this.tokenRepository.save(token);

    // Get pool with members
    const pool = await this.poolRepository.findOne({
      where: { id: token.poolId },
      relations: ['members', 'members.sponsorship', 'members.sponsorship.sponsorKey'],
    });

    // Route to a sponsor
    return this.routeRequest(pool, requestedModel, estimatedTokens);
  }

  /**
   * Route a request to the best available sponsor
   */
  private async routeRequest(
    pool: SponsorshipPool,
    requestedModel: string,
    estimatedTokens: number,
  ): Promise<PoolRouteResult> {
    // Filter eligible sponsorships
    const eligibleMembers = pool.members.filter((m) => {
      if (!m.isActive) return false;

      const s = m.sponsorship;
      if (!s || s.status !== 'active') return false;

      // Check model restrictions
      if (s.allowedModels?.length > 0 && !s.allowedModels.includes(requestedModel)) {
        return false;
      }

      // Check max tokens per request
      if (s.maxTokensPerRequest && estimatedTokens > s.maxTokensPerRequest) {
        return false;
      }

      // Check budget
      if (s.spendCapUsd && Number(s.spentUsd) >= Number(s.spendCapUsd)) {
        return false;
      }
      if (s.spendCapTokens && Number(s.spentTokens) >= Number(s.spendCapTokens)) {
        return false;
      }

      // Check expiration
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
        return false;
      }

      return true;
    });

    if (eligibleMembers.length === 0) {
      return {
        success: false,
        error: 'No eligible sponsors available for this request',
      };
    }

    // Apply routing strategy
    const selectedMember = this.selectSponsor(pool.routingStrategy, eligibleMembers);

    if (!selectedMember) {
      return {
        success: false,
        error: 'Routing failed to select a sponsor',
      };
    }

    const sponsorship = selectedMember.sponsorship;
    const sponsorKey = sponsorship.sponsorKey;

    // Decrypt API key
    let decryptedApiKey: string;
    try {
      decryptedApiKey = this.cryptoService.decrypt(sponsorKey.encryptedApiKey);
    } catch (error) {
      this.logger.error(`Failed to decrypt API key for sponsorship ${sponsorship.id}`);
      return { success: false, error: 'Failed to access sponsor credentials' };
    }

    return {
      success: true,
      sponsorship,
      sponsorKey,
      decryptedApiKey,
    };
  }

  /**
   * Select a sponsor based on routing strategy
   */
  private selectSponsor(
    strategy: PoolRoutingStrategy,
    members: SponsorshipPoolMember[],
  ): SponsorshipPoolMember | null {
    if (members.length === 0) return null;
    if (members.length === 1) return members[0];

    switch (strategy) {
      case 'priority':
        // Sort by priority (highest first), then by remaining budget
        return [...members].sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return this.getRemainingBudget(b.sponsorship) - this.getRemainingBudget(a.sponsorship);
        })[0];

      case 'proportional':
        return this.selectProportional(members);

      case 'round_robin':
        // Simple round robin based on usage count (least used first)
        return [...members].sort((a, b) => {
          const aUsage = this.getSponsorshipUsageCount(a.sponsorship);
          const bUsage = this.getSponsorshipUsageCount(b.sponsorship);
          return aUsage - bUsage;
        })[0];

      case 'cheapest_first':
        // Sort by remaining budget (highest first = most "cheap" to use)
        return [...members].sort(
          (a, b) => this.getRemainingBudget(b.sponsorship) - this.getRemainingBudget(a.sponsorship),
        )[0];

      case 'random':
        return members[Math.floor(Math.random() * members.length)];

      default:
        return members[0];
    }
  }

  /**
   * Select sponsor proportionally based on remaining budget
   */
  private selectProportional(members: SponsorshipPoolMember[]): SponsorshipPoolMember {
    // Calculate total remaining budget
    const budgets = members.map((m) => ({
      member: m,
      remaining: this.getRemainingBudget(m.sponsorship) * m.weight,
    }));

    const totalBudget = budgets.reduce((sum, b) => sum + b.remaining, 0);

    if (totalBudget <= 0) {
      // Fallback to random if no budget info
      return members[Math.floor(Math.random() * members.length)];
    }

    // Weighted random selection
    const rand = Math.random() * totalBudget;
    let cumulative = 0;

    for (const budget of budgets) {
      cumulative += budget.remaining;
      if (rand <= cumulative) {
        return budget.member;
      }
    }

    return members[0];
  }

  /**
   * Get remaining budget for a sponsorship
   */
  private getRemainingBudget(sponsorship: Sponsorship): number {
    if (sponsorship.spendCapUsd) {
      return Math.max(0, Number(sponsorship.spendCapUsd) - Number(sponsorship.spentUsd));
    }
    if (sponsorship.spendCapTokens) {
      // Convert tokens to approximate USD (rough estimate)
      const remainingTokens = Number(sponsorship.spendCapTokens) - Number(sponsorship.spentTokens);
      return Math.max(0, remainingTokens * 0.00001); // ~$10 per 1M tokens
    }
    return 1000000; // No limit = high value
  }

  /**
   * Get usage count for a sponsorship (for round robin)
   */
  private getSponsorshipUsageCount(sponsorship: Sponsorship): number {
    // Use spentTokens as a proxy for usage count
    return Number(sponsorship.spentTokens) || 0;
  }

  // =====================================================
  // POOL STATISTICS
  // =====================================================

  /**
   * Get pool statistics
   */
  async getPoolStats(poolId: string, ownerOrgId: string): Promise<{
    totalBudgetUsd: number;
    totalSpentUsd: number;
    remainingBudgetUsd: number;
    activeSponsors: number;
    totalSponsors: number;
    byProvider: Record<string, { count: number; budgetUsd: number; spentUsd: number }>;
  }> {
    const pool = await this.getPool(poolId, ownerOrgId);

    let totalBudgetUsd = 0;
    let totalSpentUsd = 0;
    let activeSponsors = 0;
    const byProvider: Record<string, { count: number; budgetUsd: number; spentUsd: number }> = {};

    for (const member of pool.members) {
      if (!member.isActive) continue;

      const s = member.sponsorship;
      if (s.status === 'active') {
        activeSponsors++;
      }

      const provider = s.sponsorKey?.provider || s.providerDirect || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, budgetUsd: 0, spentUsd: 0 };
      }

      byProvider[provider].count++;
      byProvider[provider].budgetUsd += Number(s.spendCapUsd) || 0;
      byProvider[provider].spentUsd += Number(s.spentUsd);

      totalBudgetUsd += Number(s.spendCapUsd) || 0;
      totalSpentUsd += Number(s.spentUsd);
    }

    return {
      totalBudgetUsd,
      totalSpentUsd,
      remainingBudgetUsd: Math.max(0, totalBudgetUsd - totalSpentUsd),
      activeSponsors,
      totalSponsors: pool.members.length,
      byProvider,
    };
  }
}

