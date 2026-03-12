import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserKey, ByokProvider } from './user-key.entity';
import { ByokConfig } from './byok-config.entity';
import { CryptoService } from '../common/crypto.service';
import { Organization } from '../organizations/organization.entity';
import { isFeatureEnabled } from '../config/features';
import { hasFeature } from '../config/plans';

@Injectable()
export class ByokService {
  constructor(
    @InjectRepository(UserKey)
    private userKeyRepository: Repository<UserKey>,
    @InjectRepository(ByokConfig)
    private byokConfigRepository: Repository<ByokConfig>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Check if BYOK is available for an organization
   */
  async isByokAvailable(organizationId: string): Promise<boolean> {
    if (!isFeatureEnabled('byok')) {
      return false;
    }

    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!org) {
      return false;
    }

    return hasFeature(org.plan, 'byok');
  }

  /**
   * Enforce BYOK availability (throws if not allowed)
   */
  async enforceBYOKAccess(organizationId: string): Promise<void> {
    const isAvailable = await this.isByokAvailable(organizationId);
    if (!isAvailable) {
      throw new ForbiddenException(
        'BYOK (Bring Your Own Key) requires a Pro plan or higher.',
      );
    }
  }

  /**
   * Get or create BYOK config for an organization
   */
  async getOrCreateConfig(organizationId: string): Promise<ByokConfig> {
    let config = await this.byokConfigRepository.findOne({
      where: { organizationId },
    });

    if (!config) {
      config = this.byokConfigRepository.create({
        organizationId,
        enabled: true,
        allowedProviders: ['openai', 'anthropic', 'google', 'xai'],
        validateKeysOnSave: true,
        trackUsage: true,
      });
      await this.byokConfigRepository.save(config);
    }

    return config;
  }

  /**
   * Update BYOK config
   */
  async updateConfig(
    organizationId: string,
    updates: Partial<Pick<ByokConfig, 'enabled' | 'allowedProviders' | 'validateKeysOnSave' | 'trackUsage'>>,
  ): Promise<ByokConfig> {
    await this.enforceBYOKAccess(organizationId);

    const config = await this.getOrCreateConfig(organizationId);

    if (updates.enabled !== undefined) {
      config.enabled = updates.enabled;
    }
    if (updates.allowedProviders !== undefined) {
      config.allowedProviders = updates.allowedProviders;
    }
    if (updates.validateKeysOnSave !== undefined) {
      config.validateKeysOnSave = updates.validateKeysOnSave;
    }
    if (updates.trackUsage !== undefined) {
      config.trackUsage = updates.trackUsage;
    }

    return this.byokConfigRepository.save(config);
  }

  /**
   * Store a user's API key
   */
  async storeKey(
    organizationId: string,
    identity: string,
    provider: ByokProvider,
    apiKey: string,
    baseUrl?: string,
  ): Promise<UserKey> {
    await this.enforceBYOKAccess(organizationId);

    const config = await this.getOrCreateConfig(organizationId);

    if (!config.enabled) {
      throw new BadRequestException('BYOK is disabled for this organization.');
    }

    if (!config.allowedProviders.includes(provider)) {
      throw new BadRequestException(
        `Provider "${provider}" is not allowed. Allowed providers: ${config.allowedProviders.join(', ')}`,
      );
    }

    const encryptedApiKey = this.cryptoService.encrypt(apiKey);
    const keyHint = this.getKeyHint(apiKey);

    let userKey = await this.userKeyRepository.findOne({
      where: { organizationId, identity, provider },
    });

    if (userKey) {
      userKey.encryptedApiKey = encryptedApiKey;
      userKey.keyHint = keyHint;
      userKey.baseUrl = baseUrl || null;
      userKey.isActive = true;
    } else {
      userKey = this.userKeyRepository.create({
        organizationId,
        identity,
        provider,
        encryptedApiKey,
        keyHint,
        baseUrl,
        isActive: true,
      });
    }

    return this.userKeyRepository.save(userKey);
  }

  /**
   * Get key hint (last 4 characters)
   */
  private getKeyHint(apiKey: string): string {
    if (apiKey.length < 4) {
      return '****';
    }
    return '...' + apiKey.slice(-4);
  }

  /**
   * Get a user's decrypted API key for a provider
   */
  async getDecryptedKey(
    organizationId: string,
    identity: string,
    provider: ByokProvider,
  ): Promise<{ apiKey: string; baseUrl?: string } | null> {
    const userKey = await this.userKeyRepository.findOne({
      where: { organizationId, identity, provider, isActive: true },
    });

    if (!userKey) {
      return null;
    }

    const apiKey = this.cryptoService.decrypt(userKey.encryptedApiKey);
    return {
      apiKey,
      baseUrl: userKey.baseUrl || undefined,
    };
  }

  /**
   * List all keys for an identity
   */
  async listKeysForIdentity(
    organizationId: string,
    identity: string,
  ): Promise<Omit<UserKey, 'encryptedApiKey'>[]> {
    const keys = await this.userKeyRepository.find({
      where: { organizationId, identity },
      order: { createdAt: 'DESC' },
    });

    return keys.map((key) => {
      const { encryptedApiKey, ...rest } = key;
      return rest;
    });
  }

  /**
   * List all keys for an organization (admin view)
   */
  async listAllKeys(
    organizationId: string,
    options?: { limit?: number; offset?: number; search?: string },
  ): Promise<{ keys: Omit<UserKey, 'encryptedApiKey'>[]; total: number }> {
    await this.enforceBYOKAccess(organizationId);

    const query = this.userKeyRepository
      .createQueryBuilder('key')
      .where('key.organizationId = :organizationId', { organizationId });

    if (options?.search) {
      query.andWhere('key.identity ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    const total = await query.getCount();

    query
      .orderBy('key.lastUsedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('key.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    const keys = await query.getMany();

    return {
      keys: keys.map((key) => {
        const { encryptedApiKey, ...rest } = key;
        return rest;
      }),
      total,
    };
  }

  /**
   * Delete a user's key
   */
  async deleteKey(organizationId: string, keyId: string): Promise<void> {
    await this.enforceBYOKAccess(organizationId);

    const key = await this.userKeyRepository.findOne({
      where: { id: keyId, organizationId },
    });

    if (!key) {
      throw new NotFoundException('Key not found.');
    }

    await this.userKeyRepository.remove(key);
  }

  /**
   * Revoke (deactivate) a key without deleting
   */
  async revokeKey(organizationId: string, keyId: string): Promise<UserKey> {
    await this.enforceBYOKAccess(organizationId);

    const key = await this.userKeyRepository.findOne({
      where: { id: keyId, organizationId },
    });

    if (!key) {
      throw new NotFoundException('Key not found.');
    }

    key.isActive = false;
    return this.userKeyRepository.save(key);
  }

  /**
   * Update usage stats for a key
   */
  async updateUsageStats(
    organizationId: string,
    identity: string,
    provider: ByokProvider,
    tokens: number,
  ): Promise<void> {
    await this.userKeyRepository
      .createQueryBuilder()
      .update(UserKey)
      .set({
        lastUsedAt: new Date(),
        requestCount: () => 'request_count + 1',
        totalTokens: () => `total_tokens + ${tokens}`,
      })
      .where('organizationId = :organizationId', { organizationId })
      .andWhere('identity = :identity', { identity })
      .andWhere('provider = :provider', { provider })
      .execute();
  }

  /**
   * Get BYOK stats for an organization
   */
  async getStats(organizationId: string): Promise<{
    totalUsers: number;
    totalKeys: number;
    totalRequests: number;
    providerBreakdown: Record<string, { keys: number; requests: number }>;
  }> {
    await this.enforceBYOKAccess(organizationId);

    const stats = await this.userKeyRepository
      .createQueryBuilder('key')
      .select('key.provider', 'provider')
      .addSelect('COUNT(DISTINCT key.identity)', 'users')
      .addSelect('COUNT(*)', 'keys')
      .addSelect('SUM(key.requestCount)', 'requests')
      .where('key.organizationId = :organizationId', { organizationId })
      .groupBy('key.provider')
      .getRawMany();

    const providerBreakdown: Record<string, { keys: number; requests: number }> = {};
    let totalUsers = 0;
    let totalKeys = 0;
    let totalRequests = 0;

    for (const stat of stats) {
      providerBreakdown[stat.provider] = {
        keys: parseInt(stat.keys, 10),
        requests: parseInt(stat.requests, 10) || 0,
      };
      totalKeys += parseInt(stat.keys, 10);
      totalRequests += parseInt(stat.requests, 10) || 0;
    }

    const uniqueUsers = await this.userKeyRepository
      .createQueryBuilder('key')
      .select('COUNT(DISTINCT key.identity)', 'count')
      .where('key.organizationId = :organizationId', { organizationId })
      .getRawOne();

    totalUsers = parseInt(uniqueUsers?.count, 10) || 0;

    return {
      totalUsers,
      totalKeys,
      totalRequests,
      providerBreakdown,
    };
  }
}
