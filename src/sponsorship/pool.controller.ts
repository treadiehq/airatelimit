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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '../common/guards/feature.guard';
import { PoolService, CreatePoolDto, AddPoolMemberDto, AddPoolMemberByTokenDto } from './pool.service';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  MaxLength,
  Min,
  IsBoolean,
} from 'class-validator';
import { PoolRoutingStrategy } from './sponsorship-pool.entity';

// DTOs
class CreatePoolRequestDto implements CreatePoolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['proportional', 'round_robin', 'priority', 'cheapest_first', 'random'])
  routingStrategy?: PoolRoutingStrategy;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  allowedProviders?: string[];
}

class UpdatePoolRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['proportional', 'round_robin', 'priority', 'cheapest_first', 'random'])
  routingStrategy?: PoolRoutingStrategy;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  allowedProviders?: string[];
}

class AddMemberRequestDto implements AddPoolMemberDto {
  @IsString()
  @IsNotEmpty()
  sponsorshipId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;
}

class AddMemberByTokenRequestDto implements AddPoolMemberByTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;
}

class UpdateMemberRequestDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Pool Controller
 *
 * Endpoints for managing sponsorship pools (Phase 2).
 * Pools allow multiple sponsors to contribute to a shared budget.
 */
@Controller('pools')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('sponsoredUsage')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  // =====================================================
  // POOL CRUD
  // =====================================================

  /**
   * Create a new pool
   */
  @Post()
  async createPool(@Request() req, @Body() dto: CreatePoolRequestDto) {
    const pool = await this.poolService.createPool(req.user.organizationId, dto);
    return this.formatPool(pool);
  }

  /**
   * List all pools owned by my organization
   */
  @Get()
  async listPools(@Request() req) {
    const pools = await this.poolService.listPools(req.user.organizationId);
    return pools.map((p) => this.formatPoolSummary(p));
  }

  /**
   * Get a specific pool with details
   */
  @Get(':id')
  async getPool(@Request() req, @Param('id') id: string) {
    const pool = await this.poolService.getPool(id, req.user.organizationId);
    const stats = await this.poolService.getPoolStats(id, req.user.organizationId);
    return { ...this.formatPool(pool), stats };
  }

  /**
   * Update a pool
   */
  @Patch(':id')
  async updatePool(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePoolRequestDto,
  ) {
    const pool = await this.poolService.updatePool(id, req.user.organizationId, dto);
    return this.formatPool(pool);
  }

  /**
   * Delete a pool
   */
  @Delete(':id')
  async deletePool(@Request() req, @Param('id') id: string) {
    await this.poolService.deletePool(id, req.user.organizationId);
    return { success: true };
  }

  /**
   * Deactivate a pool (soft delete)
   */
  @Post(':id/deactivate')
  async deactivatePool(@Request() req, @Param('id') id: string) {
    const pool = await this.poolService.deactivatePool(id, req.user.organizationId);
    return this.formatPool(pool);
  }

  /**
   * Reactivate a pool
   */
  @Post(':id/activate')
  async activatePool(@Request() req, @Param('id') id: string) {
    const pool = await this.poolService.getPool(id, req.user.organizationId);
    pool.isActive = true;
    return this.formatPool(pool);
  }

  // =====================================================
  // POOL MEMBERS
  // =====================================================

  /**
   * Add a sponsorship to a pool by sponsorship ID
   */
  @Post(':id/members')
  async addMember(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddMemberRequestDto,
  ) {
    const member = await this.poolService.addMember(id, req.user.organizationId, dto);
    return this.formatMember(member);
  }

  /**
   * Add a sponsorship to a pool by sponsored token
   * This allows adding without having used the token first
   */
  @Post(':id/members/by-token')
  async addMemberByToken(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddMemberByTokenRequestDto,
  ) {
    const member = await this.poolService.addMemberByToken(id, req.user.organizationId, dto);
    return this.formatMember(member);
  }

  /**
   * Update a pool member
   */
  @Patch(':id/members/:memberId')
  async updateMember(
    @Request() req,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRequestDto,
  ) {
    const member = await this.poolService.updateMember(
      id,
      req.user.organizationId,
      memberId,
      dto,
    );
    return this.formatMember(member);
  }

  /**
   * Remove a sponsorship from a pool
   */
  @Delete(':id/members/:memberId')
  async removeMember(
    @Request() req,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    await this.poolService.removeMember(id, req.user.organizationId, memberId);
    return { success: true };
  }

  // =====================================================
  // POOL TOKENS
  // =====================================================

  /**
   * Generate a new pool token
   */
  @Post(':id/tokens')
  async generateToken(@Request() req, @Param('id') id: string) {
    const token = await this.poolService.generatePoolToken(id, req.user.organizationId);
    return { token };
  }

  /**
   * List pool tokens
   */
  @Get(':id/tokens')
  async listTokens(@Request() req, @Param('id') id: string) {
    const tokens = await this.poolService.listPoolTokens(id, req.user.organizationId);
    return tokens.map((t) => ({
      id: t.id,
      tokenHint: `spp_live_...${t.tokenHint}`,
      isActive: t.isActive,
      usageCount: t.usageCount,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
      revokedAt: t.revokedAt,
    }));
  }

  /**
   * Revoke a pool token
   */
  @Delete(':id/tokens/:tokenId')
  async revokeToken(
    @Request() req,
    @Param('id') id: string,
    @Param('tokenId') tokenId: string,
  ) {
    await this.poolService.revokePoolToken(id, req.user.organizationId, tokenId);
    return { success: true };
  }

  // =====================================================
  // POOL STATS
  // =====================================================

  /**
   * Get pool statistics
   */
  @Get(':id/stats')
  async getStats(@Request() req, @Param('id') id: string) {
    return this.poolService.getPoolStats(id, req.user.organizationId);
  }

  // =====================================================
  // FORMATTERS
  // =====================================================

  private formatPool(pool: any) {
    return {
      id: pool.id,
      name: pool.name,
      description: pool.description,
      routingStrategy: pool.routingStrategy,
      allowedProviders: pool.allowedProviders,
      isActive: pool.isActive,
      members: pool.members?.map((m: any) => this.formatMember(m)) || [],
      createdAt: pool.createdAt,
      updatedAt: pool.updatedAt,
    };
  }

  private formatPoolSummary(pool: any) {
    const activeMembers = pool.members?.filter((m: any) => m.isActive && m.sponsorship?.status === 'active') || [];
    const totalBudget = activeMembers.reduce(
      (sum: number, m: any) => sum + (Number(m.sponsorship?.spendCapUsd) || 0),
      0,
    );
    const totalSpent = activeMembers.reduce(
      (sum: number, m: any) => sum + (Number(m.sponsorship?.spentUsd) || 0),
      0,
    );

    return {
      id: pool.id,
      name: pool.name,
      description: pool.description,
      routingStrategy: pool.routingStrategy,
      isActive: pool.isActive,
      memberCount: pool.members?.length || 0,
      activeMemberCount: activeMembers.length,
      totalBudgetUsd: totalBudget,
      totalSpentUsd: totalSpent,
      remainingBudgetUsd: Math.max(0, totalBudget - totalSpent),
      createdAt: pool.createdAt,
    };
  }

  private formatMember(member: any) {
    const s = member.sponsorship;
    return {
      id: member.id,
      sponsorshipId: member.sponsorshipId,
      priority: member.priority,
      weight: member.weight,
      isActive: member.isActive,
      joinedAt: member.joinedAt,
      sponsorship: s
        ? {
            id: s.id,
            name: s.name,
            status: s.status,
            provider: s.sponsorKey?.provider || s.providerDirect,
            sponsorName: s.sponsorOrg?.name,
            spendCapUsd: Number(s.spendCapUsd),
            spentUsd: Number(s.spentUsd),
            remainingUsd: s.spendCapUsd
              ? Math.max(0, Number(s.spendCapUsd) - Number(s.spentUsd))
              : null,
            allowedModels: s.allowedModels,
            expiresAt: s.expiresAt,
          }
        : null,
    };
  }
}

