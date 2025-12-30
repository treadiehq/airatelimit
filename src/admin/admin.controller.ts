import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardAdminGuard } from '../common/guards/dashboard-admin.guard';
import { AdminService } from './admin.service';
import { UpdateOrgPlanDto } from './dto/update-org-plan.dto';
import { getDeploymentMode } from '../config/features';

@Controller('admin')
@UseGuards(JwtAuthGuard, DashboardAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get all organizations (admin only, cloud only)
   */
  @Get('organizations')
  async getOrganizations() {
    // Only available in cloud mode
    if (getDeploymentMode() !== 'cloud') {
      throw new ForbiddenException('Admin features are only available in cloud mode');
    }

    return this.adminService.getAllOrganizations();
  }

  /**
   * Update an organization's plan (admin only, cloud only)
   */
  @Patch('organizations/:id/plan')
  async updateOrganizationPlan(
    @Param('id') organizationId: string,
    @Body() updateDto: UpdateOrgPlanDto,
  ) {
    // Only available in cloud mode
    if (getDeploymentMode() !== 'cloud') {
      throw new ForbiddenException('Admin features are only available in cloud mode');
    }

    await this.adminService.updateOrganizationPlan(
      organizationId,
      updateDto.plan,
      updateDto.durationDays,
    );
    return { success: true, message: `Plan updated to ${updateDto.plan}` };
  }
}

