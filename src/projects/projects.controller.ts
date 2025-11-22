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
    const periodStart = this.getPeriodStart(project.limitPeriod || 'daily');

    const usage = await this.usageService.getUsage({
      projectId: project.id,
      identity,
      periodStart,
    });

    return {
      projectKey: project.projectKey,
      identity,
      periodStart: periodStart.toISOString(),
      limitPeriod: project.limitPeriod || 'daily',
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

  private getPeriodStart(limitPeriod: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    switch (limitPeriod) {
      case 'daily':
        return new Date(Date.UTC(year, month, date));
      
      case 'weekly':
        // Start of week (Monday)
        const daysToMonday = (day + 6) % 7; // Calculate days back to Monday
        const weekStart = new Date(Date.UTC(year, month, date - daysToMonday));
        return weekStart;
      
      case 'monthly':
        // Start of month
        return new Date(Date.UTC(year, month, 1));
      
      default:
        return new Date(Date.UTC(year, month, date));
    }
  }
}

