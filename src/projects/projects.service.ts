import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './projects.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateUserProjectDto } from './dto/create-user-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
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

    return project;
  }

  async findAll(): Promise<Project[]> {
    return this.projectsRepository.find();
  }

  // User-facing methods
  async createForUser(
    userId: string,
    organizationId: string,
    dto: CreateUserProjectDto,
  ): Promise<Project> {
    // TRANSPARENT PROXY MODE: Always generate project key on creation
    // API keys are now passed per-request, not stored
    const projectKey = this.generateProjectKey();
    
    // Only set provider and baseUrl if actually provided in DTO (legacy support)
    const provider = dto.provider || null;
    const baseUrl = dto.baseUrl || (provider ? this.getDefaultBaseUrl(provider) : null);
    
    const project = this.projectsRepository.create({
      ...dto,
      projectKey,
      ownerId: userId,
      organizationId,
      provider,
      baseUrl,
      limitExceededResponse: dto.limitExceededResponse
        ? JSON.stringify(dto.limitExceededResponse)
        : null,
    });
    return this.projectsRepository.save(project);
  }

  async findByOwner(userId: string): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updateData: any = { ...dto };
    
    // Handle multi-provider configuration
    if (dto.providerKeys) {
      // Merge with existing providerKeys if any
      updateData.providerKeys = {
        ...(project.providerKeys || {}),
        ...dto.providerKeys,
      };
      
      // Generate project key if this is the first provider configured
      if (!project.projectKey && Object.keys(updateData.providerKeys).length > 0) {
        // Ensure at least one provider has an API key
        const hasValidKey = Object.values(updateData.providerKeys).some(
          (config: any) => config?.apiKey
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

  private getDefaultBaseUrl(provider: string): string {
    const baseUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/messages',
      google: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      xai: 'https://api.x.ai/v1/chat/completions',
      other: '', // For "other", baseUrl must be provided by user
    };
    return baseUrls[provider] || baseUrls.openai;
  }
}

