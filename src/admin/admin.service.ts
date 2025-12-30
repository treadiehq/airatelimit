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
   * Get all organizations with user counts
   */
  async getAllOrganizations() {
    const organizations = await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Get user counts for each organization
    const orgsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const userCount = await this.userRepository.count({
          where: { organizationId: org.id },
        });

        // Normalize plan to valid values (handle legacy 'free' or null values)
        const validPlans = ['trial', 'basic', 'pro', 'enterprise'];
        const normalizedPlan = validPlans.includes(org.plan) ? org.plan : 'trial';

        return {
          id: org.id,
          name: org.name,
          plan: normalizedPlan,
          userCount,
          createdAt: org.createdAt,
        };
      }),
    );

    return { organizations: orgsWithStats };
  }

  /**
   * Update an organization's plan
   */
  async updateOrganizationPlan(
    organizationId: string,
    plan: 'trial' | 'basic' | 'pro' | 'enterprise',
  ) {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    org.plan = plan;
    await this.organizationRepository.save(org);

    return org;
  }
}

