import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { ReservedOrganizationName } from './reserved-names.entity';
import { CryptoService } from '../common/crypto.service';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(ReservedOrganizationName)
    private reservedNamesRepository: Repository<ReservedOrganizationName>,
    private configService: ConfigService,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Check if an email is in the admin list (gets enterprise plan)
   */
  isAdminEmail(email: string): boolean {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS') || '';
    const adminList = adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
    return adminList.includes(email.toLowerCase());
  }

  async create(
    name: string,
    description?: string,
    options?: { email?: string },
  ): Promise<Organization> {
    // Check if name is reserved
    const reserved = await this.isNameReserved(name);
    if (reserved) {
      throw new BadRequestException(
        'This organization name is reserved and cannot be used',
      );
    }

    // Check if organization name already exists
    const existing = await this.findByName(name);
    if (existing) {
      throw new ConflictException('Organization name already taken');
    }

    // Determine plan: enterprise for admin emails, trial for everyone else
    const plan =
      options?.email && this.isAdminEmail(options.email) ? 'enterprise' : 'trial';

    const organization = this.organizationsRepository.create({
      name,
      description,
      plan,
    });
    return this.organizationsRepository.save(organization);
  }

  async isNameReserved(name: string): Promise<boolean> {
    const reserved = await this.reservedNamesRepository.findOne({
      where: { name: name.toLowerCase() },
    });
    return !!reserved;
  }

  async reserveName(
    name: string,
    reason?: string,
  ): Promise<ReservedOrganizationName> {
    const existing = await this.reservedNamesRepository.findOne({
      where: { name: name.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Name already reserved');
    }

    const reserved = this.reservedNamesRepository.create({
      name: name.toLowerCase(),
      reason,
    });
    return this.reservedNamesRepository.save(reserved);
  }

  async unreserveName(name: string): Promise<void> {
    await this.reservedNamesRepository.delete({ name: name.toLowerCase() });
  }

  async listReservedNames(): Promise<ReservedOrganizationName[]> {
    return this.reservedNamesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { name } });
  }

  async findByIdWithUsers(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async update(
    id: string,
    updates: Partial<Pick<Organization, 'name' | 'description'>>,
  ): Promise<Organization> {
    await this.organizationsRepository.update(id, updates);
    return this.findById(id);
  }

  /**
   * Upgrade an organization's plan
   */
  async upgradePlan(
    id: string,
    plan: 'trial' | 'basic' | 'pro' | 'enterprise',
  ): Promise<void> {
    await this.organizationsRepository.update(id, { plan });
  }

  // =====================================================
  // ORGANIZATION API KEY MANAGEMENT
  // =====================================================

  /**
   * Generate a new organization API key
   * Format: org_sk_<orgId>_<32 hex chars>
   * Embedding the org ID allows lookup by ID instead of storing plaintext
   */
  private generateOrgApiKey(organizationId: string): string {
    const random = crypto.randomBytes(16).toString('hex');
    return `org_sk_${organizationId}_${random}`;
  }

  /**
   * Extract organization ID from API key format
   * Returns null if the key format is invalid
   */
  private extractOrgIdFromApiKey(apiKey: string): string | null {
    if (!apiKey || !apiKey.startsWith('org_sk_')) {
      return null;
    }
    // Format: org_sk_<orgId>_<random>
    // Split by underscore: ['org', 'sk', '<orgId>', '<random>']
    const parts = apiKey.split('_');
    if (parts.length !== 4) {
      return null;
    }
    return parts[2];
  }

  /**
   * Generate or regenerate API key for an organization
   * Returns the plaintext key (only shown once)
   * Only the hash is stored in the database for security
   */
  async generateApiKey(organizationId: string): Promise<string> {
    const org = await this.findById(organizationId);
    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const apiKey = this.generateOrgApiKey(organizationId);
    const apiKeyHash = await this.cryptoService.hashSecretKey(apiKey);

    await this.organizationsRepository.update(organizationId, {
      apiKey: null, // Don't store plaintext - extract org ID from key format instead
      apiKeyHash,
    });

    return apiKey;
  }

  /**
   * Find organization by API key
   * Extracts the org ID from the key format and looks up by ID
   */
  async findByApiKey(apiKey: string): Promise<Organization | null> {
    const orgId = this.extractOrgIdFromApiKey(apiKey);
    if (!orgId) {
      return null;
    }
    return this.findById(orgId);
  }

  /**
   * Verify API key against stored hash
   */
  async verifyApiKey(apiKey: string, org: Organization): Promise<boolean> {
    if (!org.apiKeyHash) {
      return false;
    }
    return this.cryptoService.verifySecretKey(apiKey, org.apiKeyHash);
  }

  /**
   * Revoke organization API key
   */
  async revokeApiKey(organizationId: string): Promise<void> {
    await this.organizationsRepository.update(organizationId, {
      apiKey: null,
      apiKeyHash: null,
    });
  }

  /**
   * Check if organization has an API key configured
   */
  hasApiKey(org: Organization): boolean {
    return !!org.apiKeyHash;
  }
}
