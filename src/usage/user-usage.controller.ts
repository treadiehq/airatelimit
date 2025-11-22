import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsageService } from './usage.service';
import { ProjectsService } from '../projects/projects.service';

@Controller('projects/:projectId/usage')
@UseGuards(JwtAuthGuard)
export class UserUsageController {
  constructor(
    private readonly usageService: UsageService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get('summary')
  async getSummary(@Request() req, @Param('projectId') projectId: string) {
    // Verify ownership
    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const today = this.getTodayUTC();
    const summary = await this.usageService.getSummaryForProject(
      projectId,
      today,
    );

    return {
      requestsUsed: summary.totalRequests,
      tokensUsed: summary.totalTokens,
      dailyRequestLimit: project.dailyRequestLimit,
      dailyTokenLimit: project.dailyTokenLimit,
      withinLimits:
        (!project.dailyRequestLimit ||
          summary.totalRequests < project.dailyRequestLimit) &&
        (!project.dailyTokenLimit ||
          summary.totalTokens < project.dailyTokenLimit),
    };
  }

  @Get('by-identity')
  async getByIdentity(
    @Request() req,
    @Param('projectId') projectId: string,
    @Query('date') date?: string,
  ) {
    // Verify ownership
    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.ownerId !== req.user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const periodStart = date ? new Date(date) : this.getTodayUTC();
    const identities = await this.usageService.getByIdentity(
      projectId,
      periodStart,
    );

    return identities;
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}

