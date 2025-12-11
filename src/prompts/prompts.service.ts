import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt } from './prompt.entity';

export interface CreatePromptDto {
  name: string;
  content: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePromptDto {
  content?: string;
  description?: string;
  enabled?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(Prompt)
    private promptRepository: Repository<Prompt>,
  ) {}

  async create(projectId: string, dto: CreatePromptDto): Promise<Prompt> {
    const existing = await this.findByName(projectId, dto.name);
    if (existing) {
      // Update existing and increment version
      existing.content = dto.content;
      existing.description = dto.description ?? existing.description;
      existing.metadata = dto.metadata ?? existing.metadata;
      existing.version = existing.version + 1;
      return this.promptRepository.save(existing);
    }

    const prompt = this.promptRepository.create({
      projectId,
      name: dto.name,
      content: dto.content,
      description: dto.description,
      metadata: dto.metadata,
      enabled: true,
      version: 1,
    });

    return this.promptRepository.save(prompt);
  }

  async findByName(projectId: string, name: string): Promise<Prompt | null> {
    return this.promptRepository.findOne({
      where: { projectId, name },
    });
  }

  async listForProject(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: Prompt[]; total: number }> {
    const [items, total] = await this.promptRepository.findAndCount({
      where: { projectId },
      order: { name: 'ASC' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return { items, total };
  }

  async update(
    projectId: string,
    name: string,
    dto: UpdatePromptDto,
  ): Promise<Prompt> {
    const prompt = await this.findByName(projectId, name);
    if (!prompt) {
      throw new NotFoundException(`Prompt not found: ${name}`);
    }

    if (dto.content !== undefined) {
      prompt.content = dto.content;
      prompt.version = prompt.version + 1;
    }
    if (dto.description !== undefined) prompt.description = dto.description;
    if (dto.enabled !== undefined) prompt.enabled = dto.enabled;
    if (dto.metadata !== undefined) prompt.metadata = dto.metadata;

    return this.promptRepository.save(prompt);
  }

  async delete(projectId: string, name: string): Promise<void> {
    const result = await this.promptRepository.delete({ projectId, name });
    if (result.affected === 0) {
      throw new NotFoundException(`Prompt not found: ${name}`);
    }
  }

  /**
   * Get the content of a prompt by name (for injection)
   * Returns null if not found or disabled
   */
  async getContent(projectId: string, name: string): Promise<string | null> {
    const prompt = await this.findByName(projectId, name);
    if (!prompt || !prompt.enabled) return null;
    return prompt.content;
  }
}

