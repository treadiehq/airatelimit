import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Or } from 'typeorm';
import * as crypto from 'crypto';
import { KeyPoolEntry } from './key-pool.entity';
import { KeyPoolInvite } from './key-pool-invite.entity';
import { CreateKeyPoolEntryDto } from './dto/create-key-pool-entry.dto';
import { UpdateKeyPoolEntryDto } from './dto/update-key-pool-entry.dto';
import { CryptoService } from '../common/crypto.service';
import { Project } from '../projects/projects.entity';

/**
 * Load balancing strategies for key selection
 */
type LoadBalancingStrategy = 'weighted-random' | 'round-robin' | 'least-used' | 'priority';

interface KeySelectionResult {
  entry: KeyPoolEntry;
  decryptedApiKey: string;
}

@Injectable()
export class KeyPoolService {
  private roundRobinIndex: Map<string, number> = new Map();

  constructor(
    @InjectRepository(KeyPoolEntry)
    private readonly keyPoolRepository: Repository<KeyPoolEntry>,
    @InjectRepository(KeyPoolInvite)
    private readonly inviteRepository: Repository<KeyPoolInvite>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Contribute a new API key to the pool
   * Note: Users cannot contribute keys to their own projects (use Project Settings instead)
   */
  async contribute(contributorId: string, dto: CreateKeyPoolEntryDto): Promise<KeyPoolEntry> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Prevent contributing to own project - use Project Settings instead
    if (project.ownerId === contributorId) {
      throw new BadRequestException(
        'You cannot contribute keys to your own project. Use Project Settings → Provider Keys instead.'
      );
    }

    // Encrypt the API key before storage
    const encryptedApiKey = this.cryptoService.encrypt(dto.apiKey);

    const entry = this.keyPoolRepository.create({
      projectId: dto.projectId,
      contributorId,
      provider: dto.provider,
      apiKey: encryptedApiKey,
      baseUrl: dto.baseUrl,
      name: dto.name,
      monthlyTokenLimit: dto.monthlyTokenLimit || 0,
      monthlyCostLimitCents: dto.monthlyCostLimitCents || 0,
      weight: dto.weight ?? 1,
      priority: dto.priority ?? 0,
      allowedModels: dto.allowedModels,
      allowedIdentities: dto.allowedIdentities,
      currentPeriodStart: new Date(),
      active: true,
    });

    const saved = await this.keyPoolRepository.save(entry);
    
    // Don't return the encrypted key in the response
    saved.apiKey = '[ENCRYPTED]';
    return saved;
  }

  /**
   * Get all key pool entries for a project
   */
  async findByProject(projectId: string): Promise<KeyPoolEntry[]> {
    const entries = await this.keyPoolRepository.find({
      where: { projectId },
      relations: ['contributor'],
      order: { priority: 'ASC', createdAt: 'DESC' },
    });

    // Mask API keys in response
    return entries.map(e => ({ ...e, apiKey: '[ENCRYPTED]' }));
  }

  /**
   * Get all keys contributed by a user
   */
  async findByContributor(contributorId: string): Promise<KeyPoolEntry[]> {
    const entries = await this.keyPoolRepository.find({
      where: { contributorId },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });

    return entries.map(e => ({ ...e, apiKey: '[ENCRYPTED]' }));
  }

  /**
   * Update a key pool entry (only contributor can update)
   */
  async update(id: string, contributorId: string, dto: UpdateKeyPoolEntryDto): Promise<KeyPoolEntry> {
    const entry = await this.keyPoolRepository.findOne({ where: { id } });

    if (!entry) {
      throw new NotFoundException('Key pool entry not found');
    }

    if (entry.contributorId !== contributorId) {
      throw new ForbiddenException('You can only update your own contributed keys');
    }

    // Encrypt new API key if provided
    if (dto.apiKey) {
      entry.apiKey = this.cryptoService.encrypt(dto.apiKey);
    }

    if (dto.baseUrl !== undefined) entry.baseUrl = dto.baseUrl;
    if (dto.name !== undefined) entry.name = dto.name;
    if (dto.monthlyTokenLimit !== undefined) entry.monthlyTokenLimit = dto.monthlyTokenLimit;
    if (dto.monthlyCostLimitCents !== undefined) entry.monthlyCostLimitCents = dto.monthlyCostLimitCents;
    if (dto.weight !== undefined) entry.weight = dto.weight;
    if (dto.priority !== undefined) entry.priority = dto.priority;
    if (dto.active !== undefined) entry.active = dto.active;
    if (dto.allowedModels !== undefined) entry.allowedModels = dto.allowedModels;
    if (dto.allowedIdentities !== undefined) entry.allowedIdentities = dto.allowedIdentities;

    const saved = await this.keyPoolRepository.save(entry);
    saved.apiKey = '[ENCRYPTED]';
    return saved;
  }

  /**
   * Remove a key from the pool (only contributor can remove)
   */
  async remove(id: string, contributorId: string): Promise<void> {
    const entry = await this.keyPoolRepository.findOne({ where: { id } });

    if (!entry) {
      throw new NotFoundException('Key pool entry not found');
    }

    if (entry.contributorId !== contributorId) {
      throw new ForbiddenException('You can only remove your own contributed keys');
    }

    await this.keyPoolRepository.remove(entry);
  }

  /**
   * Select a key from the pool using load balancing
   * This is the core function used by the proxy
   */
  async selectKey(
    projectId: string,
    provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'other' | 'unknown',
    options?: {
      model?: string;
      identity?: string;
      strategy?: LoadBalancingStrategy;
    },
  ): Promise<KeySelectionResult | null> {
    // Handle unknown provider - can't select from pool
    if (provider === 'unknown') {
      return null;
    }
    const now = new Date();
    
    // Get all active, non-rate-limited keys for this provider
    const entries = await this.keyPoolRepository.find({
      where: {
        projectId,
        provider,
        active: true,
        weight: MoreThan(0),
      },
      order: { priority: 'ASC', weight: 'DESC' },
    });

    if (entries.length === 0) {
      return null;
    }

    // Filter by model restrictions if specified
    let eligibleEntries = entries.filter(e => {
      // Skip rate-limited keys
      if (e.rateLimited && e.rateLimitedUntil && e.rateLimitedUntil > now) {
        return false;
      }

      // Check model restrictions
      if (options?.model && e.allowedModels?.length) {
        if (!e.allowedModels.includes(options.model)) {
          return false;
        }
      }

      // Check identity restrictions
      if (options?.identity && e.allowedIdentities?.length) {
        if (!e.allowedIdentities.includes(options.identity)) {
          return false;
        }
      }

      // Check budget limits
      if (e.monthlyTokenLimit > 0 && Number(e.currentPeriodTokens) >= e.monthlyTokenLimit) {
        return false;
      }
      if (e.monthlyCostLimitCents > 0 && e.currentPeriodCostCents >= e.monthlyCostLimitCents) {
        return false;
      }

      return true;
    });

    if (eligibleEntries.length === 0) {
      return null;
    }

    // Reset periods if needed
    for (const entry of eligibleEntries) {
      await this.maybeResetPeriod(entry);
    }

    // Select key based on strategy
    const strategy = options?.strategy || 'weighted-random';
    let selected: KeyPoolEntry;

    switch (strategy) {
      case 'weighted-random':
        selected = this.selectWeightedRandom(eligibleEntries);
        break;
      case 'round-robin':
        selected = this.selectRoundRobin(projectId, provider, eligibleEntries);
        break;
      case 'least-used':
        selected = this.selectLeastUsed(eligibleEntries);
        break;
      case 'priority':
        selected = eligibleEntries[0]; // Already sorted by priority
        break;
      default:
        selected = eligibleEntries[0];
    }

    // Decrypt the API key
    const decryptedApiKey = this.cryptoService.decrypt(selected.apiKey);

    return { entry: selected, decryptedApiKey };
  }

  /**
   * Weighted random selection
   */
  private selectWeightedRandom(entries: KeyPoolEntry[]): KeyPoolEntry {
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of entries) {
      random -= entry.weight;
      if (random <= 0) {
        return entry;
      }
    }

    return entries[entries.length - 1];
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(
    projectId: string,
    provider: string,
    entries: KeyPoolEntry[],
  ): KeyPoolEntry {
    const key = `${projectId}:${provider}`;
    const currentIndex = this.roundRobinIndex.get(key) || 0;
    const selected = entries[currentIndex % entries.length];
    this.roundRobinIndex.set(key, (currentIndex + 1) % entries.length);
    return selected;
  }

  /**
   * Least-used selection (by current period tokens)
   */
  private selectLeastUsed(entries: KeyPoolEntry[]): KeyPoolEntry {
    return entries.reduce((min, e) => 
      Number(e.currentPeriodTokens) < Number(min.currentPeriodTokens) ? e : min
    );
  }

  /**
   * Record usage for a key
   */
  async recordUsage(
    entryId: string,
    tokens: number,
    costCents: number,
  ): Promise<void> {
    await this.keyPoolRepository
      .createQueryBuilder()
      .update(KeyPoolEntry)
      .set({
        currentPeriodTokens: () => `"currentPeriodTokens" + ${tokens}`,
        currentPeriodCostCents: () => `"currentPeriodCostCents" + ${costCents}`,
        currentPeriodRequests: () => `"currentPeriodRequests" + 1`,
        totalTokens: () => `"totalTokens" + ${tokens}`,
        totalCostCents: () => `"totalCostCents" + ${costCents}`,
        totalRequests: () => `"totalRequests" + 1`,
        lastUsedAt: new Date(),
        consecutiveErrors: 0,
      })
      .where('id = :id', { id: entryId })
      .execute();
  }

  /**
   * Record an error for a key
   */
  async recordError(entryId: string, error: string, isRateLimit: boolean = false): Promise<void> {
    const updateSet: any = {
      consecutiveErrors: () => `"consecutiveErrors" + 1`,
      lastErrorAt: new Date(),
      lastError: error.substring(0, 1000),
    };

    if (isRateLimit) {
      updateSet.rateLimited = true;
      // Back off for 60 seconds on rate limit
      updateSet.rateLimitedUntil = new Date(Date.now() + 60000);
    }

    await this.keyPoolRepository
      .createQueryBuilder()
      .update(KeyPoolEntry)
      .set(updateSet)
      .where('id = :id', { id: entryId })
      .execute();
  }

  /**
   * Clear rate limit status for a key
   */
  async clearRateLimit(entryId: string): Promise<void> {
    await this.keyPoolRepository.update(entryId, {
      rateLimited: false,
      rateLimitedUntil: null,
    });
  }

  /**
   * Reset period if we're in a new month
   */
  private async maybeResetPeriod(entry: KeyPoolEntry): Promise<void> {
    const now = new Date();
    const periodStart = entry.currentPeriodStart;

    if (!periodStart ||
        periodStart.getMonth() !== now.getMonth() ||
        periodStart.getFullYear() !== now.getFullYear()) {
      await this.keyPoolRepository.update(entry.id, {
        currentPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        currentPeriodTokens: 0,
        currentPeriodCostCents: 0,
        currentPeriodRequests: 0,
      });
    }
  }

  /**
   * Get pool stats for a project
   */
  async getPoolStats(projectId: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    byProvider: Record<string, { count: number; totalTokens: number; totalCost: number }>;
    contributors: number;
  }> {
    const entries = await this.keyPoolRepository.find({
      where: { projectId },
    });

    const active = entries.filter(e => e.active && e.weight > 0);
    const uniqueContributors = new Set(entries.map(e => e.contributorId));

    const byProvider: Record<string, { count: number; totalTokens: number; totalCost: number }> = {};
    for (const entry of entries) {
      if (!byProvider[entry.provider]) {
        byProvider[entry.provider] = { count: 0, totalTokens: 0, totalCost: 0 };
      }
      byProvider[entry.provider].count++;
      byProvider[entry.provider].totalTokens += Number(entry.totalTokens);
      byProvider[entry.provider].totalCost += Number(entry.totalCostCents) / 100;
    }

    return {
      totalKeys: entries.length,
      activeKeys: active.length,
      byProvider,
      contributors: uniqueContributors.size,
    };
  }

  /**
   * Get contributor stats
   */
  async getContributorStats(contributorId: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    totalTokensServed: number;
    totalCostServed: number;
    projects: number;
  }> {
    const entries = await this.findByContributor(contributorId);
    const active = entries.filter(e => e.active && e.weight > 0);
    const uniqueProjects = new Set(entries.map(e => e.projectId));

    return {
      totalKeys: entries.length,
      activeKeys: active.length,
      totalTokensServed: entries.reduce((sum, e) => sum + Number(e.totalTokens), 0),
      totalCostServed: entries.reduce((sum, e) => sum + Number(e.totalCostCents), 0) / 100,
      projects: uniqueProjects.size,
    };
  }

  // ============================================
  // INVITE LINK MANAGEMENT
  // ============================================

  /**
   * Generate a new invite link for a project
   */
  async createInvite(
    projectId: string,
    createdById: string,
    options?: {
      name?: string;
      expiresAt?: Date;
      maxContributions?: number;
    },
  ): Promise<KeyPoolInvite> {
    // Verify project exists and user owns it
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== createdById) {
      throw new ForbiddenException('Only project owners can create invite links');
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    const invite = this.inviteRepository.create({
      projectId,
      createdById,
      token,
      name: options?.name,
      expiresAt: options?.expiresAt,
      maxContributions: options?.maxContributions,
      active: true,
    });

    return this.inviteRepository.save(invite);
  }

  /**
   * Get all invites for a project
   */
  async getInvitesByProject(projectId: string, userId: string): Promise<KeyPoolInvite[]> {
    // Verify user owns the project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project || project.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.inviteRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke an invite
   */
  async revokeInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
      relations: ['project'],
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.project.ownerId !== userId) {
      throw new ForbiddenException('Only project owners can revoke invites');
    }

    invite.active = false;
    await this.inviteRepository.save(invite);
  }

  /**
   * Delete an invite
   */
  async deleteInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
      relations: ['project'],
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.project.ownerId !== userId) {
      throw new ForbiddenException('Only project owners can delete invites');
    }

    await this.inviteRepository.remove(invite);
  }

  /**
   * Get invite by token (public - for contribution page)
   */
  async getInviteByToken(token: string): Promise<{
    invite: KeyPoolInvite;
    project: { id: string; name: string };
  } | null> {
    const invite = await this.inviteRepository.findOne({
      where: { token, active: true },
      relations: ['project'],
    });

    if (!invite) {
      return null;
    }

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return null;
    }

    // Check if max contributions reached
    if (invite.maxContributions && invite.contributionCount >= invite.maxContributions) {
      return null;
    }

    return {
      invite,
      project: {
        id: invite.project.id,
        name: invite.project.name,
      },
    };
  }

  /**
   * Contribute via invite token (can be authenticated or anonymous)
   * For anonymous contributors, generates a management token they can use to manage/revoke their key
   */
  async contributeViaInvite(
    token: string,
    dto: CreateKeyPoolEntryDto,
    contributorId?: string,
  ): Promise<KeyPoolEntry & { managementToken?: string }> {
    const result = await this.getInviteByToken(token);

    if (!result) {
      throw new BadRequestException('Invalid or expired invite link');
    }

    const { invite, project } = result;

    // Encrypt the API key before storage
    const encryptedApiKey = this.cryptoService.encrypt(dto.apiKey);

    // Generate management token for anonymous contributors
    const managementToken = !contributorId
      ? crypto.randomBytes(32).toString('hex')
      : null;

    const entry = this.keyPoolRepository.create({
      projectId: project.id,
      contributorId: contributorId || null,
      managementToken,
      contributorEmail: dto.contributorEmail || null,
      provider: dto.provider,
      apiKey: encryptedApiKey,
      baseUrl: dto.baseUrl,
      name: dto.name,
      monthlyTokenLimit: dto.monthlyTokenLimit || 0,
      monthlyCostLimitCents: dto.monthlyCostLimitCents || 0,
      weight: dto.weight ?? 1,
      priority: dto.priority ?? 0,
      allowedModels: dto.allowedModels,
      allowedIdentities: dto.allowedIdentities,
      currentPeriodStart: new Date(),
      active: true,
    });

    const saved = await this.keyPoolRepository.save(entry);

    // Increment contribution count on invite
    invite.contributionCount++;
    await this.inviteRepository.save(invite);

    // Don't return the encrypted key in the response
    saved.apiKey = '[ENCRYPTED]';
    
    // Return management token for anonymous contributors (only returned once!)
    return {
      ...saved,
      managementToken: managementToken || undefined,
    };
  }

  /**
   * Get a contribution by management token (for anonymous contributors)
   */
  async getByManagementToken(managementToken: string): Promise<KeyPoolEntry | null> {
    const entry = await this.keyPoolRepository.findOne({
      where: { managementToken },
      relations: ['project'],
    });

    if (entry) {
      entry.apiKey = '[ENCRYPTED]';
    }

    return entry;
  }

  /**
   * Update a contribution by management token (for anonymous contributors)
   */
  async updateByManagementToken(
    managementToken: string,
    updates: { active?: boolean; monthlyTokenLimit?: number },
  ): Promise<KeyPoolEntry | null> {
    const entry = await this.keyPoolRepository.findOne({
      where: { managementToken },
    });

    if (!entry) {
      return null;
    }

    if (updates.active !== undefined) {
      entry.active = updates.active;
    }
    if (updates.monthlyTokenLimit !== undefined) {
      entry.monthlyTokenLimit = updates.monthlyTokenLimit;
    }

    const saved = await this.keyPoolRepository.save(entry);
    saved.apiKey = '[ENCRYPTED]';
    return saved;
  }

  /**
   * Delete a contribution by management token (for anonymous contributors)
   */
  async deleteByManagementToken(managementToken: string): Promise<boolean> {
    const result = await this.keyPoolRepository.delete({ managementToken });
    return (result.affected || 0) > 0;
  }
}

