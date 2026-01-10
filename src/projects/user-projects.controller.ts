import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateUserProjectDto } from './dto/create-user-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class UserProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async listProjects(@Request() req) {
    const projects = await this.projectsService.findByOwner(req.user.userId);
    // Mask API keys in list view
    return projects.map((p) => this.maskApiKey(p));
  }

  @Post()
  async createProject(@Request() req, @Body() dto: CreateUserProjectDto) {
    const project = await this.projectsService.createForUser(
      req.user.userId,
      req.user.organizationId,
      dto,
    );
    return this.maskApiKey(project);
  }

  @Get(':id')
  async getProject(@Request() req, @Param('id') id: string) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Access denied');
    }
    return this.maskApiKey(project);
  }

  @Patch(':id')
  async updateProject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.projectsService.update(id, dto);
    return this.maskApiKey(updated);
  }

  @Delete(':id')
  async deleteProject(@Request() req, @Param('id') id: string) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    await this.projectsService.delete(id);
    return { message: 'Project deleted' };
  }

  @Post(':id/regenerate-secret')
  async regenerateSecretKey(@Request() req, @Param('id') id: string) {
    const project = await this.projectsService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    const newSecretKey = await this.projectsService.regenerateSecretKey(id);
    return { secretKey: newSecretKey };
  }

  private maskApiKey(project: any) {
    let result = { ...project };

    // Mask legacy openaiApiKey
    if (result.openaiApiKey) {
      const key = result.openaiApiKey;
      result.openaiApiKey = key.length > 11 
        ? key.substring(0, 7) + '****' + key.slice(-4)
        : '****';
    }

    // Mask providerKeys - only show that a key exists, not the actual key
    if (result.providerKeys) {
      const maskedProviderKeys: Record<string, { apiKey: string; baseUrl?: string; configured: boolean }> = {};
      for (const [provider, config] of Object.entries(result.providerKeys)) {
        const providerConfig = config as { apiKey: string; baseUrl?: string };
        if (providerConfig?.apiKey) {
          const key = providerConfig.apiKey;
          maskedProviderKeys[provider] = {
            // Show first 4 and last 4 chars only
            apiKey: key.length > 12 
              ? key.substring(0, 4) + '••••••••' + key.slice(-4)
              : '••••••••',
            ...(providerConfig.baseUrl && { baseUrl: providerConfig.baseUrl }),
            configured: true,
          };
        }
      }
      result.providerKeys = maskedProviderKeys;
    }

    return result;
  }
}
