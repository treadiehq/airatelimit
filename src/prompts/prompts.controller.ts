import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectAuthGuard } from '../common/guards/project-auth.guard';
import { PlanGuard, RequirePlanFeature } from '../common/guards/plan.guard';
import { PromptsService, CreatePromptDto, UpdatePromptDto } from './prompts.service';
import { ProjectsService } from '../projects/projects.service';

/**
 * System Prompts Controller
 *
 * Manage system prompts stored server-side.
 * Supports JWT and secret key authentication.
 * Requires Pro plan or higher.
 *
 * Example:
 *   curl -X POST /api/projects/pk_xxx/prompts \
 *     -H "Authorization: Bearer sk_xxx" \
 *     -d '{"name": "assistant-v1", "content": "You are a helpful assistant..."}'
 */
@Controller('projects/:projectKey/prompts')
@UseGuards(ProjectAuthGuard, PlanGuard)
@RequirePlanFeature('promptsConfig')
export class PromptsController {
  constructor(
    private readonly promptsService: PromptsService,
    private readonly projectsService: ProjectsService,
  ) {}

  private async getProject(projectKey: string, request: any) {
    // If authenticated via secret key, project is already attached
    if (request.authType === 'secret_key' && request.project) {
      // Verify the projectKey matches the authenticated project
      if (request.project.projectKey !== projectKey) {
        throw new Error('Project key does not match authenticated project');
      }
      return request.project;
    }

    // Otherwise, look up by projectKey (JWT auth)
    const project = await this.projectsService.findByProjectKey(projectKey);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user is in the same organization - allows team access
    if (project.organizationId !== request.user?.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  /**
   * List all prompts for a project
   * GET /api/projects/:projectKey/prompts
   */
  @Get()
  async list(
    @Param('projectKey') projectKey: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const result = await this.promptsService.listForProject(project.id, {
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      items: result.items.map(this.formatPrompt),
      total: result.total,
    };
  }

  /**
   * Get a specific prompt
   * GET /api/projects/:projectKey/prompts/:name
   */
  @Get(':name')
  async get(
    @Param('projectKey') projectKey: string,
    @Param('name') name: string,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const prompt = await this.promptsService.findByName(project.id, name);

    if (!prompt) {
      return { name, found: false };
    }

    return this.formatPrompt(prompt);
  }

  /**
   * Create or update a prompt (upsert)
   * POST /api/projects/:projectKey/prompts
   */
  @Post()
  async create(
    @Param('projectKey') projectKey: string,
    @Body() dto: CreatePromptDto,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const prompt = await this.promptsService.create(project.id, dto);
    return this.formatPrompt(prompt);
  }

  /**
   * Update a prompt
   * PUT /api/projects/:projectKey/prompts/:name
   */
  @Put(':name')
  async update(
    @Param('projectKey') projectKey: string,
    @Param('name') name: string,
    @Body() dto: UpdatePromptDto,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    const prompt = await this.promptsService.update(project.id, name, dto);
    return this.formatPrompt(prompt);
  }

  /**
   * Delete a prompt
   * DELETE /api/projects/:projectKey/prompts/:name
   */
  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('projectKey') projectKey: string,
    @Param('name') name: string,
    @Req() request?: any,
  ) {
    const project = await this.getProject(projectKey, request);
    await this.promptsService.delete(project.id, name);
  }

  private formatPrompt(prompt: any) {
    return {
      name: prompt.name,
      content: prompt.content,
      description: prompt.description,
      enabled: prompt.enabled,
      version: prompt.version,
      metadata: prompt.metadata,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
  }
}

