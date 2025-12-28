import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { ReservedOrganizationName } from './reserved-names.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(ReservedOrganizationName)
    private reservedNamesRepository: Repository<ReservedOrganizationName>,
    private configService: ConfigService,
  ) {}

  /**
   * Check if an email is in the admin list (gets enterprise plan)
   */
  isAdminEmail(email: string): boolean {
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS') || '';
    const adminList = adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
    return adminList.includes(email.toLowerCase());
  }

  async create(
    name: string,
    description?: string,
    options?: { email?: string },
  ): Promise<Organization> {
    // Check if name is reserved
    const reserved = await this.isNameReserved(name);
    if (reserved) {
      throw new BadRequestException(
        'This organization name is reserved and cannot be used',
      );
    }

    // Check if organization name already exists
    const existing = await this.findByName(name);
    if (existing) {
      throw new ConflictException('Organization name already taken');
    }

    // Determine plan: enterprise for admin emails, trial for everyone else
    const plan =
      options?.email && this.isAdminEmail(options.email) ? 'enterprise' : 'trial';

    const organization = this.organizationsRepository.create({
      name,
      description,
      plan,
    });
    return this.organizationsRepository.save(organization);
  }

  async isNameReserved(name: string): Promise<boolean> {
    const reserved = await this.reservedNamesRepository.findOne({
      where: { name: name.toLowerCase() },
    });
    return !!reserved;
  }

  async reserveName(
    name: string,
    reason?: string,
  ): Promise<ReservedOrganizationName> {
    const existing = await this.reservedNamesRepository.findOne({
      where: { name: name.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Name already reserved');
    }

    const reserved = this.reservedNamesRepository.create({
      name: name.toLowerCase(),
      reason,
    });
    return this.reservedNamesRepository.save(reserved);
  }

  async unreserveName(name: string): Promise<void> {
    await this.reservedNamesRepository.delete({ name: name.toLowerCase() });
  }

  async listReservedNames(): Promise<ReservedOrganizationName[]> {
    return this.reservedNamesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { name } });
  }

  async findByIdWithUsers(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async update(
    id: string,
    updates: Partial<Pick<Organization, 'name' | 'description'>>,
  ): Promise<Organization> {
    await this.organizationsRepository.update(id, updates);
    return this.findById(id);
  }
}
