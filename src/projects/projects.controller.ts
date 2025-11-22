import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { UsageService } from '../usage/usage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin/projects')
@UseGuards(AdminGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usageService: UsageService,
  ) {}

  @Post()
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    const project = await this.projectsService.create(createProjectDto);
    // Don't expose the OpenAI API key in response
    const { openaiApiKey, ...safeProject } = project;
    return safeProject;
  }

  @Get(':projectKey/usage/:identity')
  async getUsage(
    @Param('projectKey') projectKey: string,
    @Param('identity') identity: string,
  ) {
    const project = await this.projectsService.findByProjectKey(projectKey);
    const today = this.getTodayUTC();

    const usage = await this.usageService.getUsage({
      projectId: project.id,
      identity,
      periodStart: today,
    });

    return {
      projectKey: project.projectKey,
      identity,
      periodStart: today.toISOString(),
      requestsUsed: usage?.requestsUsed || 0,
      tokensUsed: usage?.tokensUsed || 0,
      dailyRequestLimit: project.dailyRequestLimit,
      dailyTokenLimit: project.dailyTokenLimit,
      requestLimitExceeded:
        project.dailyRequestLimit &&
        (usage?.requestsUsed || 0) >= project.dailyRequestLimit,
      tokenLimitExceeded:
        project.dailyTokenLimit &&
        (usage?.tokensUsed || 0) >= project.dailyTokenLimit,
    };
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}

