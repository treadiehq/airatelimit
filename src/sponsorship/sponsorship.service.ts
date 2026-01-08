import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Sponsorship } from './sponsorship.entity';
import { CreateSponsorshipDto } from './dto/create-sponsorship.dto';
import { UpdateSponsorshipDto } from './dto/update-sponsorship.dto';
import { Project } from '../projects/projects.entity';
import { User } from '../users/user.entity';

@Injectable()
export class SponsorshipService {
  constructor(
    @InjectRepository(Sponsorship)
    private readonly sponsorshipRepository: Repository<Sponsorship>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Transform sponsorship entity for API response
   * Maps monthlyBudget → budget for frontend compatibility
   */
  private toResponse(sponsorship: Sponsorship): any {
    const { monthlyBudget, ...rest } = sponsorship as any;
    return {
      ...rest,
      budget: monthlyBudget, // Map monthlyBudget → budget for frontend
    };
  }

  /**
   * Transform array of sponsorships for API response
   */
  private toResponseArray(sponsorships: Sponsorship[]): any[] {
    return sponsorships.map(s => this.toResponse(s));
  }

  /**
   * Create a new sponsorship
   */
  async create(sponsorId: string, sponsorOrgId: string, dto: CreateSponsorshipDto): Promise<any> {
    // Verify project exists and sponsor has access
    const project = await this.projectRepository.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if sponsorship already exists for this sponsor-recipient pair
    const existing = await this.sponsorshipRepository.findOne({
      where: {
        sponsorId,
        recipientIdentity: dto.recipientIdentity,
        projectId: dto.projectId,
      },
    });

    if (existing) {
      throw new BadRequestException('You already have an active sponsorship for this recipient');
    }

    const sponsorship = this.sponsorshipRepository.create({
      projectId: dto.projectId,
      sponsorId,
      sponsorOrgId,
      recipientIdentity: dto.recipientIdentity,
      recipientName: dto.recipientName,
      budgetType: dto.budgetType,
      renewalType: dto.renewalType ?? 'monthly',
      monthlyBudget: dto.budget,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      message: dto.message,
      isPublic: dto.isPublic ?? true,
      notifications: dto.notifications ?? {
        notifyOnLowBudget: true,
        lowBudgetThreshold: 20,
        notifyRecipientOnCreate: true,
      },
      currentPeriodStart: new Date(),
      active: true,
    });

    const saved = await this.sponsorshipRepository.save(sponsorship);
    return this.toResponse(saved);
  }

  /**
   * Get all sponsorships created by a sponsor
   */
  async findBySponsor(sponsorId: string): Promise<any[]> {
    const sponsorships = await this.sponsorshipRepository.find({
      where: { sponsorId },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
    return this.toResponseArray(sponsorships);
  }

  /**
   * Get all sponsorships for a recipient identity
   */
  async findByRecipient(recipientIdentity: string, projectId?: string): Promise<any[]> {
    const where: any = {
      recipientIdentity,
      active: true,
    };
    
    if (projectId) {
      where.projectId = projectId;
    }

    const sponsorships = await this.sponsorshipRepository.find({
      where,
      relations: ['sponsor', 'project'],
      order: { monthlyBudget: 'DESC' },
    });
    return this.toResponseArray(sponsorships);
  }

  /**
   * Get a single sponsorship by ID (internal use - returns raw entity)
   */
  private async findOneRaw(id: string): Promise<Sponsorship> {
    const sponsorship = await this.sponsorshipRepository.findOne({
      where: { id },
      relations: ['sponsor', 'project'],
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    return sponsorship;
  }

  /**
   * Get a single sponsorship by ID (public API - returns transformed response)
   */
  async findOne(id: string): Promise<any> {
    const sponsorship = await this.findOneRaw(id);
    return this.toResponse(sponsorship);
  }

  /**
   * Update a sponsorship (only sponsor can update)
   */
  async update(id: string, sponsorId: string, dto: UpdateSponsorshipDto): Promise<any> {
    const sponsorship = await this.findOneRaw(id);

    if (sponsorship.sponsorId !== sponsorId) {
      throw new ForbiddenException('You can only update your own sponsorships');
    }

    // Apply updates
    if (dto.recipientName !== undefined) sponsorship.recipientName = dto.recipientName;
    if (dto.budget !== undefined) sponsorship.monthlyBudget = dto.budget;
    if (dto.renewalType !== undefined) sponsorship.renewalType = dto.renewalType;
    if (dto.active !== undefined) sponsorship.active = dto.active;
    if (dto.expiresAt !== undefined) {
      sponsorship.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.message !== undefined) sponsorship.message = dto.message;
    if (dto.isPublic !== undefined) sponsorship.isPublic = dto.isPublic;
    if (dto.notifications !== undefined) {
      sponsorship.notifications = { ...sponsorship.notifications, ...dto.notifications };
    }

    const saved = await this.sponsorshipRepository.save(sponsorship);
    return this.toResponse(saved);
  }

  /**
   * Delete a sponsorship (only sponsor can delete)
   */
  async remove(id: string, sponsorId: string): Promise<void> {
    const sponsorship = await this.findOneRaw(id);

    if (sponsorship.sponsorId !== sponsorId) {
      throw new ForbiddenException('You can only delete your own sponsorships');
    }

    await this.sponsorshipRepository.remove(sponsorship);
  }

  /**
   * Check available budget for a recipient from all active sponsorships
   * Returns total available tokens/requests across all sponsors
   */
  async getAvailableBudget(
    projectId: string,
    recipientIdentity: string,
    budgetType: 'tokens' | 'requests',
  ): Promise<{ total: number; remaining: number; sponsorships: Array<{ id: string; sponsorName: string; remaining: number }> }> {
    const sponsorships = await this.sponsorshipRepository.find({
      where: {
        projectId,
        recipientIdentity,
        budgetType,
        active: true,
      },
      relations: ['sponsor'],
    });

    // Filter out expired sponsorships
    const activeSponshorships = sponsorships.filter(s => 
      !s.expiresAt || s.expiresAt > new Date()
    );

    const result = activeSponshorships.map(s => ({
      id: s.id,
      sponsorName: s.isPublic ? (s.sponsor?.email || 'Anonymous') : 'Anonymous Sponsor',
      remaining: Math.max(0, s.monthlyBudget - s.currentPeriodUsage),
    }));

    const total = activeSponshorships.reduce((sum, s) => sum + s.monthlyBudget, 0);
    const remaining = result.reduce((sum, s) => sum + s.remaining, 0);

    return { total, remaining, sponsorships: result };
  }

  /**
   * Record usage against a sponsorship
   * Returns true if usage was recorded, false if budget exhausted
   */
  async recordUsage(
    projectId: string,
    recipientIdentity: string,
    budgetType: 'tokens' | 'requests',
    amount: number,
  ): Promise<{ recorded: boolean; sponsorshipId?: string; remaining?: number }> {
    const sponsorships = await this.sponsorshipRepository.find({
      where: {
        projectId,
        recipientIdentity,
        budgetType,
        active: true,
      },
      order: { currentPeriodUsage: 'ASC' }, // Use least-used sponsorship first
    });

    // Find a sponsorship with available budget
    for (const sponsorship of sponsorships) {
      // Skip expired sponsorships
      if (sponsorship.expiresAt && sponsorship.expiresAt < new Date()) {
        continue;
      }

      // Reset period if needed (monthly reset)
      await this.maybeResetPeriod(sponsorship);

      const remaining = sponsorship.monthlyBudget - sponsorship.currentPeriodUsage;
      if (remaining >= amount) {
        // Record usage
        sponsorship.currentPeriodUsage += amount;
        sponsorship.totalUsage = Number(sponsorship.totalUsage) + amount;
        await this.sponsorshipRepository.save(sponsorship);

        return {
          recorded: true,
          sponsorshipId: sponsorship.id,
          remaining: sponsorship.monthlyBudget - sponsorship.currentPeriodUsage,
        };
      }
    }

    return { recorded: false };
  }

  /**
   * Reset period usage if we're in a new month (only for monthly renewals)
   * One-time sponsorships never reset - they're like gifted tokens
   */
  private async maybeResetPeriod(sponsorship: Sponsorship): Promise<void> {
    // One-time sponsorships never reset
    if (sponsorship.renewalType === 'one-time') {
      return;
    }

    const now = new Date();
    const periodStart = sponsorship.currentPeriodStart;

    if (!periodStart || 
        periodStart.getMonth() !== now.getMonth() || 
        periodStart.getFullYear() !== now.getFullYear()) {
      sponsorship.currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      sponsorship.currentPeriodUsage = 0;
      await this.sponsorshipRepository.save(sponsorship);
    }
  }

  /**
   * Get sponsorship stats for a sponsor with breakdown by type
   */
  async getSponsorStats(sponsorId: string): Promise<{
    totalSponsorships: number;
    activeSponsorships: number;
    recipients: number;
    tokens: {
      monthly: { budget: number; used: number; count: number };
      oneTime: { budget: number; used: number; count: number };
    };
    requests: {
      monthly: { budget: number; used: number; count: number };
      oneTime: { budget: number; used: number; count: number };
    };
  }> {
    const sponsorships = await this.findBySponsor(sponsorId);
    
    const active = sponsorships.filter((s: any) => s.active && (!s.expiresAt || new Date(s.expiresAt) > new Date()));
    const uniqueRecipients = new Set(sponsorships.map((s: any) => s.recipientIdentity));

    // Initialize breakdown structure
    const stats = {
      totalSponsorships: sponsorships.length,
      activeSponsorships: active.length,
      recipients: uniqueRecipients.size,
      tokens: {
        monthly: { budget: 0, used: 0, count: 0 },
        oneTime: { budget: 0, used: 0, count: 0 },
      },
      requests: {
        monthly: { budget: 0, used: 0, count: 0 },
        oneTime: { budget: 0, used: 0, count: 0 },
      },
    };

    // Aggregate by budget type and renewal type
    for (const s of active) {
      const budgetType = s.budgetType as 'tokens' | 'requests';
      const renewalKey = s.renewalType === 'one-time' ? 'oneTime' : 'monthly';
      
      stats[budgetType][renewalKey].budget += s.budget;
      stats[budgetType][renewalKey].used += s.currentPeriodUsage;
      stats[budgetType][renewalKey].count += 1;
    }

    return stats;
  }
}

