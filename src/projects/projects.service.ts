import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './projects.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateUserProjectDto } from './dto/create-user-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CryptoService } from '../common/crypto.service';
import { PlanService } from '../common/services/plan.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private cryptoService: CryptoService,
    private planService: PlanService,
  ) {}

  // Admin methods (legacy compatibility)
  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectsRepository.create(createProjectDto);
    return this.projectsRepository.save(project);
  }

  async findByProjectKey(projectKey: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { projectKey },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Decrypt provider keys for use
    return this.decryptProject(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectsRepository.find();
  }

  // User-facing methods
  async createForUser(
    userId: string,
    organizationId: string,
    dto: CreateUserProjectDto,
  ): Promise<Project & { secretKeyPlain?: string }> {
    // Enforce project limit based on plan
    await this.planService.enforceProjectLimit(organizationId);

    // TRANSPARENT PROXY MODE: Always generate project key on creation
    // API keys are now passed per-request, not stored
    const projectKey = this.generateProjectKey();

    // Only set provider and baseUrl if actually provided in DTO (legacy support)
    const provider = dto.provider || null;
    const baseUrl =
      dto.baseUrl || (provider ? this.getDefaultBaseUrl(provider) : null);

    // First, create the project without secret key (we need the ID first)
    const project = this.projectsRepository.create({
      ...dto,
      projectKey,
      secretKey: null, // Don't store plaintext
      secretKeyHash: null, // Will be set after we have the project ID
      ownerId: userId,
      organizationId,
      provider,
      baseUrl,
      limitExceededResponse: dto.limitExceededResponse
        ? JSON.stringify(dto.limitExceededResponse)
        : null,
    });

    const saved = await this.projectsRepository.save(project);

    // Now generate secret key with embedded project ID
    const secretKeyPlain = this.generateSecretKey(saved.id);
    const secretKeyHash =
      await this.cryptoService.hashSecretKey(secretKeyPlain);

    // Update with the hash only (not plaintext)
    await this.projectsRepository.update(saved.id, {
      secretKeyHash,
    });

    // Return the plaintext secret key only on creation
    return { ...saved, secretKeyHash, secretKeyPlain };
  }

  async findByOwner(userId: string): Promise<Project[]> {
    const projects = await this.projectsRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });
    // Decrypt provider keys for each project
    return projects.map(p => this.decryptProject(p));
  }

  async findByOrganization(organizationId: string): Promise<Project[]> {
    const projects = await this.projectsRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    // Decrypt provider keys for each project
    return projects.map(p => this.decryptProject(p));
  }

  async findById(id: string): Promise<Project | null> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    return this.decryptProject(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updateData: any = { ...dto };

    // Handle multi-provider configuration
    if (dto.providerKeys) {
      // Merge with existing providerKeys (decrypt existing first)
      const existingDecrypted = this.decryptProviderKeys(project.providerKeys);
      const mergedKeys = {
        ...(existingDecrypted || {}),
        ...dto.providerKeys,
      };

      // Encrypt before saving
      updateData.providerKeys = this.encryptProviderKeys(mergedKeys);

      // Generate project key if this is the first provider configured
      if (
        !project.projectKey &&
        Object.keys(mergedKeys).length > 0
      ) {
        // Ensure at least one provider has an API key
        const hasValidKey = Object.values(mergedKeys).some(
          (config: any) => config?.apiKey,
        );
        if (hasValidKey) {
          updateData.projectKey = this.generateProjectKey();
        }
      }
    }

    // Handle legacy single-provider configuration
    // Generate project key when both provider and API key are set for the first time
    if (dto.openaiApiKey && !project.projectKey && !dto.providerKeys) {
      const finalProvider = dto.provider || project.provider;
      if (!finalProvider) {
        throw new Error('Provider must be configured before setting API key');
      }
      updateData.projectKey = this.generateProjectKey();
    }

    // Set default baseUrl when provider is first configured (if baseUrl not explicitly provided)
    if (dto.provider && !project.provider && !dto.baseUrl) {
      updateData.baseUrl = this.getDefaultBaseUrl(dto.provider);
    }

    // Provider can only be changed if project key doesn't exist yet (legacy mode)
    if (project.projectKey && !dto.providerKeys) {
      delete updateData.provider;
    }

    if (dto.limitExceededResponse) {
      updateData.limitExceededResponse = JSON.stringify(
        dto.limitExceededResponse,
      );
    }

    await this.projectsRepository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.projectsRepository.delete(id);
  }

  private generateProjectKey(): string {
    const random = randomBytes(16).toString('hex');
    return `pk_${random}`;
  }

  /**
   * Generate a secret key with embedded project ID
   * Format: sk_<projectId>_<random>
   * Embedding the project ID allows lookup by ID instead of storing plaintext
   */
  private generateSecretKey(projectId: string): string {
    const random = randomBytes(24).toString('hex');
    return `sk_${projectId}_${random}`;
  }

  /**
   * Extract project ID from secret key format
   * Returns null if the key format is invalid or is a legacy format
   * 
   * New format: sk_<projectId>_<random> (3 parts)
   * Legacy format: sk_<random> (2 parts) - requires hash iteration fallback
   */
  private extractProjectIdFromSecretKey(secretKey: string): string | null {
    if (!secretKey || !secretKey.startsWith('sk_')) {
      return null;
    }
    // Format: sk_<projectId>_<random>
    // Split by underscore: ['sk', '<projectId>', '<random>']
    const parts = secretKey.split('_');
    if (parts.length !== 3) {
      // Legacy format (sk_<random>) - return null to trigger hash fallback
      return null;
    }
    return parts[1];
  }

  async regenerateSecretKey(id: string): Promise<string> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const newSecretKey = this.generateSecretKey(id);
    const secretKeyHash = await this.cryptoService.hashSecretKey(newSecretKey);

    await this.projectsRepository.update(id, {
      secretKey: null, // Don't store plaintext - extract project ID from key format instead
      secretKeyHash,
    });
    return newSecretKey;
  }

  /**
   * Find project by secret key
   * 
   * Supports two formats:
   * 1. New format (sk_<projectId>_<random>): Extract project ID and lookup by ID
   * 2. Legacy format (sk_<random>): Fall back to hash comparison
   */
  async findBySecretKey(secretKey: string): Promise<Project | null> {
    if (!secretKey || !secretKey.startsWith('sk_')) {
      return null;
    }

    // Try new format first: extract project ID from key
    const projectId = this.extractProjectIdFromSecretKey(secretKey);
    if (projectId) {
      return this.findById(projectId);
    }

    // Legacy format fallback: iterate through projects with hashes
    // This is needed for keys created before the new format was introduced
    const projectsWithHash = await this.projectsRepository
      .createQueryBuilder('project')
      .where('project.secretKeyHash IS NOT NULL')
      .getMany();

    for (const project of projectsWithHash) {
      const matches = await this.cryptoService.verifySecretKey(
        secretKey,
        project.secretKeyHash,
      );
      if (matches) {
        return this.decryptProject(project);
      }
    }

    return null;
  }

  /**
   * Verify a secret key against a project (secure comparison)
   */
  async verifySecretKey(secretKey: string, project: Project): Promise<boolean> {
    if (!project.secretKeyHash) {
      return false;
    }
    return this.cryptoService.verifySecretKey(secretKey, project.secretKeyHash);
  }

  private getDefaultBaseUrl(provider: string): string {
    const baseUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/messages',
      google:
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      xai: 'https://api.x.ai/v1/chat/completions',
      other: '', // For "other", baseUrl must be provided by user
    };
    return baseUrls[provider] || baseUrls.openai;
  }

  // ====================================
  // ENCRYPTION: Provider Keys
  // ====================================

  /**
   * Encrypt provider keys before saving to database
   */
  private encryptProviderKeys(
    providerKeys: Record<string, { apiKey: string; baseUrl?: string }>,
  ): Record<string, { apiKey: string; baseUrl?: string }> {
    const encrypted: Record<string, { apiKey: string; baseUrl?: string }> = {};
    
    for (const [provider, config] of Object.entries(providerKeys)) {
      if (config?.apiKey) {
        encrypted[provider] = {
          apiKey: this.cryptoService.encrypt(config.apiKey),
          ...(config.baseUrl && { baseUrl: config.baseUrl }),
        };
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt provider keys after loading from database
   */
  private decryptProviderKeys(
    providerKeys: Record<string, { apiKey: string; baseUrl?: string }> | null,
  ): Record<string, { apiKey: string; baseUrl?: string }> | null {
    if (!providerKeys) return null;
    
    const decrypted: Record<string, { apiKey: string; baseUrl?: string }> = {};
    
    for (const [provider, config] of Object.entries(providerKeys)) {
      if (config?.apiKey) {
        try {
          decrypted[provider] = {
            apiKey: this.cryptoService.decrypt(config.apiKey),
            ...(config.baseUrl && { baseUrl: config.baseUrl }),
          };
        } catch (error) {
          // If decryption fails (e.g., key not encrypted yet), use as-is
          console.warn(`Failed to decrypt ${provider} key, using as-is:`, error.message);
          decrypted[provider] = config;
        }
      }
    }
    
    return decrypted;
  }

  /**
   * Decrypt a single project's provider keys
   */
  private decryptProject(project: Project | null): Project | null {
    if (!project) return null;
    
    if (project.providerKeys) {
      project.providerKeys = this.decryptProviderKeys(project.providerKeys);
    }
    
    return project;
  }
}
