import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get all organizations with user counts and status info
   */
  async getAllOrganizations() {
    const organizations = await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });

    const TRIAL_DAYS = 7;
    const now = new Date();

    // Get user counts for each organization
    const orgsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const userCount = await this.userRepository.count({
          where: { organizationId: org.id },
        });

        // Normalize plan to valid values (handle legacy 'free' or null values)
        const validPlans = ['trial', 'basic', 'pro', 'enterprise'];
        const normalizedPlan = validPlans.includes(org.plan) ? org.plan : 'trial';

        // Calculate status based on plan type
        let status: 'active' | 'trial' | 'expired' = 'active';
        let daysRemaining: number | null = null;
        let expiresAt: Date | null = null;

        if (normalizedPlan === 'trial') {
          // Trial: calculate from trialStartedAt or createdAt
          const trialStart = org.trialStartedAt || org.createdAt;
          expiresAt = new Date(trialStart);
          expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS);
          
          const msRemaining = expiresAt.getTime() - now.getTime();
          daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
          
          if (daysRemaining <= 0) {
            status = 'expired';
            daysRemaining = 0;
          } else {
            status = 'trial';
          }
        } else if (org.planExpiresAt) {
          // Paid plan with expiry date
          expiresAt = new Date(org.planExpiresAt);
          const msRemaining = expiresAt.getTime() - now.getTime();
          daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
          
          if (daysRemaining <= 0) {
            status = 'expired';
            daysRemaining = 0;
          } else {
            status = 'active';
          }
        }
        // If paid plan with no expiry, status stays 'active' and expiresAt is null

        return {
          id: org.id,
          name: org.name,
          plan: normalizedPlan,
          status,
          daysRemaining,
          expiresAt: expiresAt?.toISOString() || null,
          userCount,
          createdAt: org.createdAt,
        };
      }),
    );

    return { organizations: orgsWithStats };
  }

  /**
   * Update an organization's plan with optional duration
   */
  async updateOrganizationPlan(
    organizationId: string,
    plan: 'trial' | 'basic' | 'pro' | 'enterprise',
    durationDays?: number | null,
  ) {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    org.plan = plan;

    // Set expiry based on duration
    if (durationDays === null || durationDays === undefined) {
      // No expiry (lifetime/permanent)
      org.planExpiresAt = null;
    } else if (durationDays > 0) {
      // Set expiry from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      org.planExpiresAt = expiresAt;
    }

    // If switching to trial, reset trial start
    if (plan === 'trial') {
      org.trialStartedAt = new Date();
      org.planExpiresAt = null; // Trial uses trialStartedAt
    }

    await this.organizationRepository.save(org);

    return org;
  }
}
