import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { SponsorKey, SponsorKeyProvider } from './sponsor-key.entity';
import { Sponsorship, SponsorshipStatus } from './sponsorship.entity';
import { SponsoredToken } from './sponsored-token.entity';
import { SponsorshipUsage } from './sponsorship-usage.entity';
import { SponsorshipPool } from './sponsorship-pool.entity';
import { SponsorshipPoolMember } from './sponsorship-pool-member.entity';
import { PoolToken } from './pool-token.entity';

import { CryptoService } from '../common/crypto.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { CreateSponsorKeyDto, UpdateSponsorKeyDto } from './dto/create-sponsor-key.dto';
import {
  CreateSponsorshipDto,
  UpdateSponsorshipDto,
  RevokeSponsorshipDto,
} from './dto/create-sponsorship.dto';

// Token prefixes
const SPONSORED_TOKEN_PREFIX = 'spt_live_';
const POOL_TOKEN_PREFIX = 'spp_live_';
const TOKEN_BYTES = 24; // 48 hex chars
const BCRYPT_ROUNDS = 10;

export interface SponsorshipBudgetCheck {
  allowed: boolean;
  reason?: string;
  remainingUsd?: number;
  remainingTokens?: number;
  sponsorship?: Sponsorship;
  decryptedApiKey?: string;
}

export interface UsageLogParams {
  sponsorshipId: string;
  sponsoredTokenId?: string;
  organizationId?: string;  // Recipient org that made the request
  projectId?: string;       // Project that made the request
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  requestId?: string;
  isStreaming?: boolean;
  statusCode?: number;
}

@Injectable()
export class SponsorshipService {
  private readonly logger = new Logger(SponsorshipService.name);

  constructor(
    @InjectRepository(SponsorKey)
    private sponsorKeyRepository: Repository<SponsorKey>,
    @InjectRepository(Sponsorship)
    private sponsorshipRepository: Repository<Sponsorship>,
    @InjectRepository(SponsoredToken)
    private sponsoredTokenRepository: Repository<SponsoredToken>,
    @InjectRepository(SponsorshipUsage)
    private usageRepository: Repository<SponsorshipUsage>,
    @InjectRepository(SponsorshipPool)
    private poolRepository: Repository<SponsorshipPool>,
    @InjectRepository(SponsorshipPoolMember)
    private poolMemberRepository: Repository<SponsorshipPoolMember>,
    @InjectRepository(PoolToken)
    private poolTokenRepository: Repository<PoolToken>,
    private cryptoService: CryptoService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // =====================================================
  // SPONSOR KEY MANAGEMENT
  // =====================================================

  /**
   * Register a new provider API key for sponsorship
   */
  async createSponsorKey(
    organizationId: string,
    dto: CreateSponsorKeyDto,
  ): Promise<{ key: SponsorKey; keyHint: string }> {
    // Encrypt the API key
    const encryptedApiKey = this.cryptoService.encrypt(dto.apiKey);
    const keyHint = '...' + dto.apiKey.slice(-4);

    const key = this.sponsorKeyRepository.create({
      organizationId,
      name: dto.name,
      provider: dto.provider,
      encryptedApiKey,
      keyHint,
      baseUrl: dto.baseUrl,
      // IP Restrictions
      ipRestrictionsEnabled: dto.ipRestrictionsEnabled || false,
      allowedIpRanges: dto.allowedIpRanges || null,
    });

    await this.sponsorKeyRepository.save(key);

    this.logger.log(`Sponsor key created: ${key.id} for org ${organizationId}`);

    return { key, keyHint };
  }

  /**
   * List sponsor keys for an organization
   */
  async listSponsorKeys(organizationId: string): Promise<SponsorKey[]> {
    return this.sponsorKeyRepository.find({
      where: { organizationId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get sponsor key by ID (with ownership check)
   */
  async getSponsorKey(id: string, organizationId: string): Promise<SponsorKey> {
    const key = await this.sponsorKeyRepository.findOne({
      where: { id, organizationId, isDeleted: false },
    });

    if (!key) {
      throw new NotFoundException('Sponsor key not found');
    }

    return key;
  }

  /**
   * Update sponsor key
   */
  async updateSponsorKey(
    id: string,
    organizationId: string,
    dto: UpdateSponsorKeyDto,
  ): Promise<SponsorKey> {
    const key = await this.getSponsorKey(id, organizationId);

    if (dto.name) key.name = dto.name;
    if (dto.baseUrl !== undefined) key.baseUrl = dto.baseUrl;
    
    // IP Restrictions
    if (dto.ipRestrictionsEnabled !== undefined) key.ipRestrictionsEnabled = dto.ipRestrictionsEnabled;
    if (dto.allowedIpRanges !== undefined) key.allowedIpRanges = dto.allowedIpRanges;

    await this.sponsorKeyRepository.save(key);
    return key;
  }

  /**
   * Soft delete sponsor key
   */
  async deleteSponsorKey(id: string, organizationId: string): Promise<void> {
    const key = await this.getSponsorKey(id, organizationId);

    // Check if any active sponsorships use this key
    const activeCount = await this.sponsorshipRepository.count({
      where: { sponsorKeyId: id, status: 'active' },
    });

    if (activeCount > 0) {
      throw new BadRequestException(
        `Cannot delete key with ${activeCount} active sponsorship(s). Revoke them first.`,
      );
    }

    key.isDeleted = true;
    await this.sponsorKeyRepository.save(key);

    this.logger.log(`Sponsor key deleted: ${id}`);
  }

  // =====================================================
  // SPONSORSHIP MANAGEMENT
  // =====================================================

  /**
   * Create a new sponsorship
   */
  async createSponsorship(
    organizationId: string,
    dto: CreateSponsorshipDto,
  ): Promise<{ sponsorship: Sponsorship; token: string | null }> {
    // Validate sponsor key belongs to org
    const sponsorKey = await this.getSponsorKey(dto.sponsorKeyId, organizationId);

    // At least one budget must be set
    if (!dto.spendCapUsd && !dto.spendCapTokens) {
      throw new BadRequestException('At least one budget (USD or tokens) must be set');
    }

    // If targeting by email or GitHub username (no immediate recipient), use pending status
    const hasPendingRecipient = dto.recipientEmail || dto.targetGitHubUsername;
    
    const sponsorship = this.sponsorshipRepository.create({
      sponsorKeyId: sponsorKey.id,
      sponsorOrgId: organizationId,
      name: dto.name,
      description: dto.description,
      spendCapUsd: dto.spendCapUsd,
      spendCapTokens: dto.spendCapTokens,
      recipientEmail: dto.recipientEmail?.toLowerCase(),
      targetGitHubUsername: dto.targetGitHubUsername?.toLowerCase(),
      allowedModels: dto.allowedModels,
      maxTokensPerRequest: dto.maxTokensPerRequest,
      maxRequestsPerMinute: dto.maxRequestsPerMinute,
      maxRequestsPerDay: dto.maxRequestsPerDay,
      billingPeriod: dto.billingPeriod || 'one_time',
      currentPeriodStart: new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      // IP Restrictions
      ipRestrictionMode: dto.ipRestrictionMode || 'inherit',
      allowedIpRanges: dto.allowedIpRanges || null,
      // Pending if targeting someone who needs to accept, active otherwise
      status: hasPendingRecipient ? 'pending' : 'active',
    });

    await this.sponsorshipRepository.save(sponsorship);

    // Only generate token immediately if not pending (direct sponsorship)
    let tokenResult: { token: string } | null = null;
    if (!hasPendingRecipient) {
      tokenResult = await this.generateSponsoredToken(sponsorship.id);
    }

    this.logger.log(`Sponsorship created: ${sponsorship.id} by org ${organizationId} (status: ${sponsorship.status})`);

    // Send email notification if targeting a GitHub user with an email
    if (dto.targetGitHubUsername && dto.recipientEmail) {
      const dashboardUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:3001';
      
      // Get sponsor org name for the email
      const sponsorshipWithOrg = await this.sponsorshipRepository.findOne({
        where: { id: sponsorship.id },
        relations: ['sponsorOrg'],
      });
      
      await this.emailService.sendSponsorshipNotification({
        recipientEmail: dto.recipientEmail,
        sponsorName: sponsorshipWithOrg?.sponsorOrg?.name || 'Someone',
        sponsorshipName: dto.name,
        targetGitHubUsername: dto.targetGitHubUsername,
        budgetUsd: dto.spendCapUsd,
        provider: sponsorKey.provider,
        claimLink: `${dashboardUrl}/sponsorships?tab=received`,
      });
    }

    return { sponsorship, token: tokenResult?.token || null };
  }

  /**
   * List sponsorships where org is the sponsor
   */
  async listSponsorshipsAsSponsor(organizationId: string): Promise<Sponsorship[]> {
    return this.sponsorshipRepository.find({
      where: { sponsorOrgId: organizationId },
      relations: ['sponsorKey', 'recipientOrg'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * List sponsorships where org is a recipient (has used the token)
   * A recipient is determined by:
   * 1. recipientOrgId is set to this org, OR
   * 2. This org has usage records against the sponsorship
   * Only returns ACTIVE sponsorships (pending must be accepted first)
   */
  async listSponsorshipsAsRecipient(organizationId: string): Promise<Sponsorship[]> {
    // Find active sponsorships where this org is recipient
    const sponsorshipsWithUsage = await this.sponsorshipRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.sponsorKey', 'sponsorKey')
      .leftJoinAndSelect('s.sponsorOrg', 'sponsorOrg')
      .where('s.status = :status', { status: 'active' })
      .andWhere(
        '(s."recipientOrgId" = :orgId OR EXISTS (SELECT 1 FROM sponsorship_usage u WHERE u."sponsorshipId" = s.id AND u."organizationId" = :orgId))',
        { orgId: organizationId },
      )
      .orderBy('s."createdAt"', 'DESC')
      .getMany();

    return sponsorshipsWithUsage;
  }

  /**
   * List pending sponsorships targeted at this organization
   * These need to be accepted before becoming active
   */
  async listPendingSponsorshipsForOrg(organizationId: string): Promise<Sponsorship[]> {
    return this.sponsorshipRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.sponsorKey', 'sponsorKey')
      .leftJoinAndSelect('s.sponsorOrg', 'sponsorOrg')
      .where('s.status = :status', { status: 'pending' })
      .andWhere('s."recipientOrgId" = :orgId', { orgId: organizationId })
      .orderBy('s."createdAt"', 'DESC')
      .getMany();
  }

  /**
   * Accept a pending sponsorship that's already linked to an org
   * (from the badge flow where recipientOrgId is set during creation)
   */
  async acceptPendingSponsorship(
    sponsorshipId: string,
    organizationId: string,
  ): Promise<{ sponsorship: Sponsorship; token: string }> {
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { 
        id: sponsorshipId,
        recipientOrgId: organizationId,
        status: 'pending',
      },
    });

    if (!sponsorship) {
      throw new NotFoundException('Pending sponsorship not found or does not belong to your organization');
    }

    // Activate the sponsorship
    sponsorship.status = 'active';
    await this.sponsorshipRepository.save(sponsorship);

    // Generate a sponsored token for the recipient
    const tokenResult = await this.generateSponsoredToken(sponsorship.id);

    this.logger.log(`Accepted sponsorship ${sponsorshipId} for org ${organizationId}`);

    return { sponsorship, token: tokenResult.token };
  }

  /**
   * Get sponsorship by ID
   */
  async getSponsorship(
    id: string,
    organizationId: string,
    role: 'sponsor' | 'recipient' | 'any',
  ): Promise<Sponsorship> {
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { id },
      relations: ['sponsorKey', 'sponsorOrg', 'recipientOrg'],
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    // Check access based on role
    if (role === 'sponsor') {
      if (sponsorship.sponsorOrgId !== organizationId) {
        throw new ForbiddenException('Access denied to this sponsorship');
      }
    } else if (role === 'recipient') {
      // Recipient can access if recipientOrgId matches OR they have usage records
      const hasUsage = await this.usageRepository.findOne({
        where: { sponsorshipId: id, organizationId },
      });
      if (sponsorship.recipientOrgId !== organizationId && !hasUsage) {
        throw new ForbiddenException('Access denied to this sponsorship');
      }
    } else if (role === 'any') {
      // Check if org is sponsor, recipient, or has usage
      const hasUsage = await this.usageRepository.findOne({
        where: { sponsorshipId: id, organizationId },
      });
      if (
        sponsorship.sponsorOrgId !== organizationId &&
        sponsorship.recipientOrgId !== organizationId &&
        !hasUsage
      ) {
        throw new ForbiddenException('Access denied to this sponsorship');
      }
    }

    return sponsorship;
  }

  /**
   * Update sponsorship (sponsor only)
   */
  async updateSponsorship(
    id: string,
    organizationId: string,
    dto: UpdateSponsorshipDto,
  ): Promise<Sponsorship> {
    const sponsorship = await this.getSponsorship(id, organizationId, 'sponsor');

    // Can't update revoked/exhausted sponsorships
    if (sponsorship.status === 'revoked' || sponsorship.status === 'exhausted') {
      throw new BadRequestException(`Cannot update ${sponsorship.status} sponsorship`);
    }

    // Validate budget changes (can't decrease below spent)
    if (dto.spendCapUsd !== undefined) {
      if (dto.spendCapUsd < Number(sponsorship.spentUsd)) {
        throw new BadRequestException(
          `Cannot set budget below already spent amount ($${sponsorship.spentUsd})`,
        );
      }
      sponsorship.spendCapUsd = dto.spendCapUsd;
    }

    if (dto.spendCapTokens !== undefined) {
      if (dto.spendCapTokens < Number(sponsorship.spentTokens)) {
        throw new BadRequestException(
          `Cannot set budget below already used tokens (${sponsorship.spentTokens})`,
        );
      }
      sponsorship.spendCapTokens = dto.spendCapTokens;
    }

    // Update other fields
    if (dto.name) sponsorship.name = dto.name;
    if (dto.description !== undefined) sponsorship.description = dto.description;
    if (dto.allowedModels) sponsorship.allowedModels = dto.allowedModels;
    if (dto.maxTokensPerRequest !== undefined)
      sponsorship.maxTokensPerRequest = dto.maxTokensPerRequest;
    if (dto.maxRequestsPerMinute !== undefined)
      sponsorship.maxRequestsPerMinute = dto.maxRequestsPerMinute;
    if (dto.maxRequestsPerDay !== undefined)
      sponsorship.maxRequestsPerDay = dto.maxRequestsPerDay;
    if (dto.expiresAt !== undefined)
      sponsorship.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    await this.sponsorshipRepository.save(sponsorship);

    this.logger.log(`Sponsorship updated: ${id}`);

    return sponsorship;
  }

  /**
   * Pause sponsorship (sponsor only)
   */
  async pauseSponsorship(id: string, organizationId: string): Promise<Sponsorship> {
    const sponsorship = await this.getSponsorship(id, organizationId, 'sponsor');

    if (sponsorship.status !== 'active') {
      throw new BadRequestException(`Cannot pause ${sponsorship.status} sponsorship`);
    }

    sponsorship.status = 'paused';
    await this.sponsorshipRepository.save(sponsorship);

    this.logger.log(`Sponsorship paused: ${id}`);

    return sponsorship;
  }

  /**
   * Resume paused sponsorship (sponsor only)
   */
  async resumeSponsorship(id: string, organizationId: string): Promise<Sponsorship> {
    const sponsorship = await this.getSponsorship(id, organizationId, 'sponsor');

    if (sponsorship.status !== 'paused') {
      throw new BadRequestException(`Cannot resume ${sponsorship.status} sponsorship`);
    }

    sponsorship.status = 'active';
    await this.sponsorshipRepository.save(sponsorship);

    this.logger.log(`Sponsorship resumed: ${id}`);

    return sponsorship;
  }

  /**
   * Revoke sponsorship instantly (sponsor only)
   */
  async revokeSponsorship(
    id: string,
    organizationId: string,
    dto: RevokeSponsorshipDto,
  ): Promise<Sponsorship> {
    const sponsorship = await this.getSponsorship(id, organizationId, 'sponsor');

    if (sponsorship.status === 'revoked') {
      throw new BadRequestException('Sponsorship already revoked');
    }

    sponsorship.status = 'revoked';
    sponsorship.revokedAt = new Date();
    sponsorship.revokedReason = dto.reason;

    // Deactivate all tokens
    await this.sponsoredTokenRepository.update(
      { sponsorshipId: id },
      { isActive: false, revokedAt: new Date() },
    );

    await this.sponsorshipRepository.save(sponsorship);

    this.logger.log(`Sponsorship revoked: ${id}, reason: ${dto.reason || 'none'}`);

    return sponsorship;
  }

  /**
   * Delete a sponsorship (only if revoked)
   */
  async deleteSponsorship(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const sponsorship = await this.getSponsorship(id, organizationId, 'sponsor');

    if (sponsorship.status !== 'revoked') {
      throw new BadRequestException('Only revoked sponsorships can be deleted');
    }

    // Delete all associated tokens first
    await this.sponsoredTokenRepository.delete({ sponsorshipId: id });

    // Delete the sponsorship
    await this.sponsorshipRepository.remove(sponsorship);

    this.logger.log(`Sponsorship deleted: ${id} by org ${organizationId}`);
  }

  // =====================================================
  // TOKEN MANAGEMENT
  // =====================================================

  /**
   * Generate a new sponsored token for a sponsorship
   */
  async generateSponsoredToken(
    sponsorshipId: string,
  ): Promise<{ tokenId: string; token: string; tokenHint: string }> {
    // Generate random token
    const rawToken = SPONSORED_TOKEN_PREFIX + crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
    const tokenHint = '...' + rawToken.slice(-4);

    const token = this.sponsoredTokenRepository.create({
      sponsorshipId,
      tokenHash,
      tokenHint,
      isActive: true,
    });

    await this.sponsoredTokenRepository.save(token);

    this.logger.log(`Sponsored token generated: ${token.id} for sponsorship ${sponsorshipId}`);

    return { tokenId: token.id, token: rawToken, tokenHint };
  }

  /**
   * Regenerate token (revokes old one, creates new)
   */
  async regenerateToken(
    sponsorshipId: string,
    organizationId: string,
  ): Promise<{ tokenId: string; token: string; tokenHint: string }> {
    // Verify ownership
    await this.getSponsorship(sponsorshipId, organizationId, 'sponsor');

    // Revoke existing tokens
    await this.sponsoredTokenRepository.update(
      { sponsorshipId },
      { isActive: false, revokedAt: new Date() },
    );

    // Generate new token
    return this.generateSponsoredToken(sponsorshipId);
  }

  /**
   * Validate a sponsored token and return sponsorship details
   * @param rawToken The sponsored token (spt_live_...)
   * @param recipientOrgId Optional - if provided, auto-links sponsorship to recipient org on first use
   */
  async validateSponsoredToken(
    rawToken: string,
    recipientOrgId?: string,
  ): Promise<SponsorshipBudgetCheck> {
    // Check prefix
    if (!rawToken.startsWith('spt_')) {
      return { allowed: false, reason: 'Invalid token format' };
    }

    // Find all active tokens and check hash
    const tokens = await this.sponsoredTokenRepository.find({
      where: { isActive: true },
      relations: ['sponsorship', 'sponsorship.sponsorKey'],
    });

    for (const token of tokens) {
      const matches = await bcrypt.compare(rawToken, token.tokenHash);
      if (matches) {
        const sponsorship = token.sponsorship;

        // Update usage stats
        token.lastUsedAt = new Date();
        token.usageCount += 1;
        await this.sponsoredTokenRepository.save(token);

        // Auto-link recipient org on first use if not already set
        if (recipientOrgId && !sponsorship.recipientOrgId) {
          sponsorship.recipientOrgId = recipientOrgId;
          await this.sponsorshipRepository.save(sponsorship);
          this.logger.log(
            `Auto-linked sponsorship ${sponsorship.id} to recipient org ${recipientOrgId}`,
          );
        }

        // Check sponsorship status
        if (sponsorship.status !== 'active') {
          return {
            allowed: false,
            reason: `Sponsorship is ${sponsorship.status}`,
            sponsorship,
          };
        }

        // Check expiry
        if (sponsorship.expiresAt && sponsorship.expiresAt < new Date()) {
          return {
            allowed: false,
            reason: 'Sponsorship has expired',
            sponsorship,
          };
        }

        // Check if monthly budget needs reset
        if (sponsorship.billingPeriod === 'monthly') {
          await this.checkAndResetMonthlyBudget(sponsorship);
        }

        // Check budget
        const remainingUsd = sponsorship.spendCapUsd
          ? Number(sponsorship.spendCapUsd) - Number(sponsorship.spentUsd)
          : null;
        const remainingTokens = sponsorship.spendCapTokens
          ? Number(sponsorship.spendCapTokens) - Number(sponsorship.spentTokens)
          : null;

        if (remainingUsd !== null && remainingUsd <= 0) {
          return {
            allowed: false,
            reason: 'Budget exhausted (USD)',
            remainingUsd: 0,
            sponsorship,
          };
        }

        if (remainingTokens !== null && remainingTokens <= 0) {
          return {
            allowed: false,
            reason: 'Budget exhausted (tokens)',
            remainingTokens: 0,
            sponsorship,
          };
        }

        // Get decrypted API key
        const decryptedApiKey = this.cryptoService.decrypt(
          sponsorship.sponsorKey.encryptedApiKey,
        );

        return {
          allowed: true,
          remainingUsd,
          remainingTokens,
          sponsorship,
          decryptedApiKey,
        };
      }
    }

    return { allowed: false, reason: 'Invalid or revoked token' };
  }

  /**
   * Check if model is allowed for this sponsorship
   */
  checkModelAllowed(sponsorship: Sponsorship, model: string): boolean {
    if (!sponsorship.allowedModels || sponsorship.allowedModels.length === 0) {
      return true; // No restrictions
    }
    return sponsorship.allowedModels.includes(model);
  }

  /**
   * Check if request size is within limits
   */
  checkRequestSize(sponsorship: Sponsorship, requestedTokens: number): boolean {
    if (!sponsorship.maxTokensPerRequest) {
      return true; // No limit
    }
    return requestedTokens <= sponsorship.maxTokensPerRequest;
  }

  /**
   * Check if a monthly sponsorship needs budget reset and perform it
   */
  private async checkAndResetMonthlyBudget(sponsorship: Sponsorship): Promise<void> {
    if (sponsorship.billingPeriod !== 'monthly') return;
    if (!sponsorship.currentPeriodStart) {
      // Initialize period start if missing
      sponsorship.currentPeriodStart = new Date();
      await this.sponsorshipRepository.save(sponsorship);
      return;
    }

    const now = new Date();
    const periodStart = new Date(sponsorship.currentPeriodStart);
    
    // Calculate the next period start (add 1 month to current period start)
    const nextPeriodStart = new Date(periodStart);
    nextPeriodStart.setMonth(nextPeriodStart.getMonth() + 1);

    // If we've passed the next period start, reset the budget
    if (now >= nextPeriodStart) {
      this.logger.log(`Resetting monthly budget for sponsorship ${sponsorship.id}`);
      
      await this.sponsorshipRepository.update(sponsorship.id, {
        spentUsd: 0,
        spentTokens: 0,
        currentPeriodStart: now,
        // If it was exhausted, reactivate it
        status: sponsorship.status === 'exhausted' ? 'active' : sponsorship.status,
      });

      // Update the in-memory object too
      sponsorship.spentUsd = 0;
      sponsorship.spentTokens = 0;
      sponsorship.currentPeriodStart = now;
      if (sponsorship.status === 'exhausted') {
        sponsorship.status = 'active';
      }
    }
  }

  // =====================================================
  // USAGE TRACKING
  // =====================================================

  /**
   * Log usage and update budget (atomic)
   */
  async logUsage(params: UsageLogParams): Promise<{ success: boolean; reason?: string }> {
    const totalTokens = params.inputTokens + params.outputTokens;

    // Atomic budget update
    const result = await this.sponsorshipRepository.query(
      `UPDATE sponsorships
       SET 
         "spentUsd" = "spentUsd" + $1,
         "spentTokens" = "spentTokens" + $2,
         "updatedAt" = NOW()
       WHERE id = $3
         AND status = 'active'
         AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
         AND ("spendCapUsd" IS NULL OR "spentUsd" + $1 <= "spendCapUsd")
         AND ("spendCapTokens" IS NULL OR "spentTokens" + $2 <= "spendCapTokens")
       RETURNING *`,
      [params.costUsd, totalTokens, params.sponsorshipId],
    );

    if (!result || result.length === 0) {
      return { success: false, reason: 'Budget exceeded or sponsorship inactive' };
    }

    // Log usage record
    const usage = this.usageRepository.create({
      sponsorshipId: params.sponsorshipId,
      sponsoredTokenId: params.sponsoredTokenId,
      organizationId: params.organizationId,
      projectId: params.projectId,
      model: params.model,
      provider: params.provider,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens,
      costUsd: params.costUsd,
      requestId: params.requestId,
      isStreaming: params.isStreaming || false,
      statusCode: params.statusCode,
    });

    await this.usageRepository.save(usage);

    return { success: true };
  }

  /**
   * Get usage history for a sponsorship
   * @param role - 'sponsor' sees all usage, 'recipient' sees only their org's usage
   */
  async getUsageHistory(
    sponsorshipId: string,
    organizationId: string,
    days: number = 30,
    role: 'sponsor' | 'recipient' = 'sponsor',
  ): Promise<SponsorshipUsage[]> {
    // Verify access
    await this.getSponsorship(sponsorshipId, organizationId, role);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause - recipients only see their own usage
    const whereClause: any = { sponsorshipId };
    if (role === 'recipient') {
      whereClause.organizationId = organizationId;
    }

    return this.usageRepository.find({
      where: whereClause,
      order: { timestamp: 'DESC' },
      take: 1000, // Limit results
    });
  }

  /**
   * Get usage summary for a sponsorship
   * @param role - 'sponsor' sees all usage, 'recipient' sees only their org's usage
   */
  async getUsageSummary(
    sponsorshipId: string,
    organizationId: string,
    role: 'sponsor' | 'recipient' = 'sponsor',
  ): Promise<{
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    byModel: Record<string, { cost: number; tokens: number; requests: number }>;
  }> {
    await this.getSponsorship(sponsorshipId, organizationId, role);

    // Build where clause - recipients only see their own usage
    const whereClause: any = { sponsorshipId };
    if (role === 'recipient') {
      whereClause.organizationId = organizationId;
    }

    const usage = await this.usageRepository.find({
      where: whereClause,
    });

    const byModel: Record<string, { cost: number; tokens: number; requests: number }> = {};
    let totalCost = 0;
    let totalTokens = 0;

    for (const u of usage) {
      totalCost += Number(u.costUsd);
      totalTokens += u.totalTokens;

      if (!byModel[u.model]) {
        byModel[u.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      byModel[u.model].cost += Number(u.costUsd);
      byModel[u.model].tokens += u.totalTokens;
      byModel[u.model].requests += 1;
    }

    return {
      totalCost,
      totalTokens,
      totalRequests: usage.length,
      byModel,
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Get spending by a specific organization for a sponsorship
   */
  async getOrgSpend(
    sponsorshipId: string,
    organizationId: string,
  ): Promise<{ spentUsd: number; spentTokens: number }> {
    const result = await this.usageRepository
      .createQueryBuilder('u')
      .select('COALESCE(SUM(u.costUsd), 0)', 'spentUsd')
      .addSelect('COALESCE(SUM(u.totalTokens), 0)', 'spentTokens')
      .where('u.sponsorshipId = :sponsorshipId', { sponsorshipId })
      .andWhere('u.organizationId = :organizationId', { organizationId })
      .getRawOne();

    return {
      spentUsd: Number(result.spentUsd),
      spentTokens: Number(result.spentTokens),
    };
  }

  /**
   * Claim a sponsorship by a recipient (links their org)
   */
  async claimSponsorship(
    sponsorshipId: string,
    recipientOrgId: string,
  ): Promise<Sponsorship> {
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { id: sponsorshipId },
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    if (sponsorship.recipientOrgId && sponsorship.recipientOrgId !== recipientOrgId) {
      throw new ForbiddenException('Sponsorship already claimed by another organization');
    }

    sponsorship.recipientOrgId = recipientOrgId;
    await this.sponsorshipRepository.save(sponsorship);

    this.logger.log(`Sponsorship ${sponsorshipId} claimed by org ${recipientOrgId}`);

    return sponsorship;
  }

  /**
   * Get provider from sponsor key for a sponsorship
   */
  async getProviderForSponsorship(sponsorshipId: string): Promise<SponsorKeyProvider> {
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { id: sponsorshipId },
      relations: ['sponsorKey'],
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    return sponsorship.sponsorKey.provider;
  }

  // =====================================================
  // GITHUB-BASED CLAIMING
  // =====================================================

  /**
   * Find pending sponsorships targeted at a GitHub username
   * These are sponsorships that haven't been claimed yet
   */
  async findPendingSponsorshipsByGitHub(
    githubUsername: string,
  ): Promise<Sponsorship[]> {
    return this.sponsorshipRepository.find({
      where: {
        targetGitHubUsername: githubUsername.toLowerCase(),
        recipientOrgId: IsNull(),
        status: 'pending',
      },
      relations: ['sponsorOrg', 'sponsorKey'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Claim sponsorships by GitHub username
   * Called after a user verifies their GitHub identity
   */
  async claimSponsorshipsByGitHub(
    githubUsername: string,
    recipientOrgId: string,
  ): Promise<Sponsorship[]> {
    // Find all unclaimed sponsorships for this GitHub user
    const pending = await this.findPendingSponsorshipsByGitHub(githubUsername);

    if (pending.length === 0) {
      return [];
    }

    // Claim all of them
    const claimed: Sponsorship[] = [];
    for (const sponsorship of pending) {
      sponsorship.recipientOrgId = recipientOrgId;
      sponsorship.status = 'active';
      await this.sponsorshipRepository.save(sponsorship);
      
      // Generate a sponsored token for the recipient
      await this.generateSponsoredToken(sponsorship.id);
      
      claimed.push(sponsorship);
      this.logger.log(
        `GitHub-claimed sponsorship ${sponsorship.id} for @${githubUsername} → org ${recipientOrgId}`,
      );
    }

    return claimed;
  }

  /**
   * Claim a single sponsorship by GitHub username verification
   */
  async claimSponsorshipByGitHub(
    sponsorshipId: string,
    githubUsername: string,
    recipientOrgId: string,
  ): Promise<{ sponsorship: Sponsorship; token: string }> {
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { id: sponsorshipId },
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    // Verify this sponsorship requires GitHub and targets this user
    if (!sponsorship.targetGitHubUsername) {
      throw new BadRequestException('This sponsorship does not require GitHub verification');
    }

    if (sponsorship.targetGitHubUsername.toLowerCase() !== githubUsername.toLowerCase()) {
      throw new ForbiddenException(
        `This sponsorship is for GitHub user @${sponsorship.targetGitHubUsername}, not @${githubUsername}`,
      );
    }

    // Check if already claimed
    if (sponsorship.recipientOrgId && sponsorship.recipientOrgId !== recipientOrgId) {
      throw new ForbiddenException('Sponsorship already claimed by another organization');
    }

    // Claim it
    sponsorship.recipientOrgId = recipientOrgId;
    sponsorship.status = 'active';
    await this.sponsorshipRepository.save(sponsorship);
    
    // Generate a sponsored token for the recipient
    const tokenResult = await this.generateSponsoredToken(sponsorship.id);

    this.logger.log(
      `GitHub-claimed sponsorship ${sponsorshipId} for @${githubUsername} → org ${recipientOrgId}`,
    );

    return { sponsorship, token: tokenResult.token };
  }

  /**
   * Get count of pending sponsorships for a GitHub username
   */
  async countPendingSponsorshipsByGitHub(githubUsername: string): Promise<number> {
    return this.sponsorshipRepository.count({
      where: {
        targetGitHubUsername: githubUsername.toLowerCase(),
        recipientOrgId: IsNull(),
        status: 'pending',
      },
    });
  }

  /**
   * Find pending sponsorships targeted at an email address
   * These are sponsorships that haven't been claimed yet
   */
  async findPendingSponsorshipsByEmail(email: string): Promise<Sponsorship[]> {
    return this.sponsorshipRepository.find({
      where: {
        recipientEmail: email.toLowerCase(),
        recipientOrgId: IsNull(),
        status: 'pending',
      },
      relations: ['sponsorOrg', 'sponsorKey'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Claim a sponsorship by email (for email-targeted sponsorships without GitHub requirement)
   */
  async claimSponsorshipByEmail(
    sponsorshipId: string,
    email: string,
    recipientOrgId: string,
  ): Promise<{ sponsorship: Sponsorship; token: string }> {
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { id: sponsorshipId },
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    // If GitHub is required, don't allow email-only claim
    if (sponsorship.targetGitHubUsername) {
      throw new BadRequestException('This sponsorship requires GitHub verification to claim');
    }

    // Verify email matches (only if recipientEmail is set)
    if (!sponsorship.recipientEmail) {
      throw new ForbiddenException('This sponsorship has no email recipient set');
    }
    
    if (sponsorship.recipientEmail.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException('Email does not match sponsorship recipient');
    }

    if (sponsorship.recipientOrgId) {
      throw new BadRequestException('Sponsorship already claimed');
    }

    sponsorship.recipientOrgId = recipientOrgId;
    sponsorship.status = 'active';
    await this.sponsorshipRepository.save(sponsorship);
    
    // Generate a sponsored token for the recipient
    const tokenResult = await this.generateSponsoredToken(sponsorship.id);

    this.logger.log(`Email-claimed sponsorship ${sponsorshipId} for ${email} → org ${recipientOrgId}`);

    return { sponsorship, token: tokenResult.token };
  }
}

