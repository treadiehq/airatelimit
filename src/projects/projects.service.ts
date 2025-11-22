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

  // Admin methods (Phase 0 compatibility)
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

  // User-facing methods (Phase 1)
  async createForUser(
    userId: string,
    organizationId: string,
    dto: CreateUserProjectDto,
  ): Promise<Project> {
    const projectKey = this.generateProjectKey();
    const project = this.projectsRepository.create({
      ...dto,
      projectKey,
      ownerId: userId,
      organizationId,
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1/chat/completions',
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
}

