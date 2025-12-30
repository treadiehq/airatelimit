import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OrganizationMember, MemberRole } from './organization-member.entity';
import { OrganizationInvite } from './organization-invite.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Project } from '../projects/projects.entity';
import { EmailService } from '../email/email.service';
import { PlanService } from '../common/services/plan.service';
import { getPlanLimits } from '../config/plans';
import { isFeatureEnabled, getDeploymentMode } from '../config/features';

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @InjectRepository(OrganizationMember)
    private membersRepo: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvite)
    private invitesRepo: Repository<OrganizationInvite>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Organization)
    private orgsRepo: Repository<Organization>,
    @InjectRepository(Project)
    private projectsRepo: Repository<Project>,
    private emailService: EmailService,
    private configService: ConfigService,
    @Inject(forwardRef(() => PlanService))
    private planService: PlanService,
  ) {}

  /**
   * Check if team management is available for an organization
   */
  async isTeamManagementAvailable(organizationId: string): Promise<boolean> {
    // Check deployment mode feature flag
    if (!isFeatureEnabled('teamManagement')) {
      return false;
    }

    // Use PlanService to get effective plan (handles test overrides, deployment mode, etc.)
    return this.planService.hasFeature(organizationId, 'teamManagement');
  }

  /**
   * Get all members of an organization
   */
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    return this.membersRepo.find({
      where: { organizationId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get a user's membership in an organization
   */
  async getMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    return this.membersRepo.findOne({
      where: { organizationId, userId },
      relations: ['user'],
    });
  }

  /**
   * Get a user's role in an organization
   */
  async getUserRole(
    organizationId: string,
    userId: string,
  ): Promise<MemberRole | null> {
    const membership = await this.getMembership(organizationId, userId);
    return membership?.role ?? null;
  }

  /**
   * Check if user has at least the specified role
   */
  async hasRole(
    organizationId: string,
    userId: string,
    minRole: MemberRole,
  ): Promise<boolean> {
    const role = await this.getUserRole(organizationId, userId);
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
  }

  /**
   * Get all pending invites for an organization
   */
  async getInvites(organizationId: string): Promise<OrganizationInvite[]> {
    // Clean up expired invites first
    await this.invitesRepo.delete({
      organizationId,
      expiresAt: new Date(),
    });

    return this.invitesRepo.find({
      where: { organizationId },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Invite a new member to the organization
   */
  async inviteMember(
    organizationId: string,
    inviterId: string,
    email: string,
    role: MemberRole,
  ): Promise<OrganizationInvite> {
    // Check if team management is available
    if (!(await this.isTeamManagementAvailable(organizationId))) {
      throw new ForbiddenException(
        'Team management is not available on your current plan. Please upgrade to Pro or Enterprise.',
      );
    }

    // Get inviter's role
    const inviterRole = await this.getUserRole(organizationId, inviterId);
    if (!inviterRole) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check permissions: only Owner and Admin can invite
    if (ROLE_HIERARCHY[inviterRole] < ROLE_HIERARCHY['admin']) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    // Admins can only invite members (not owners or other admins)
    if (inviterRole === 'admin' && role !== 'member') {
      throw new ForbiddenException('Admins can only invite members');
    }

    // Get inviter's email to prevent self-invitation
    const inviter = await this.usersRepo.findOne({ where: { id: inviterId } });
    if (inviter && inviter.email.toLowerCase() === email.toLowerCase()) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // Get organization for validation and email
    const org = await this.orgsRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    // Check team size limit using PlanService (handles test overrides, etc.)
    const limits = await this.planService.getOrganizationLimits(organizationId);
    const currentMembers = await this.membersRepo.count({ where: { organizationId } });
    const pendingInvites = await this.invitesRepo.count({ where: { organizationId } });

    if (currentMembers + pendingInvites >= limits.maxTeamMembers) {
      throw new ForbiddenException(
        `Team member limit reached (${limits.maxTeamMembers}). Please upgrade your plan for more members.`,
      );
    }

    // Check if email is already a member
    const existingUser = await this.usersRepo.findOne({ where: { email } });
    if (existingUser) {
      const existingMember = await this.membersRepo.findOne({
        where: { organizationId, userId: existingUser.id },
      });
      if (existingMember) {
        throw new ConflictException('This user is already a member of the organization');
      }

      // Check if user belongs to another organization
      if (existingUser.organizationId && existingUser.organizationId !== organizationId) {
        throw new ConflictException(
          'This user already belongs to another organization. They must leave their current organization first.',
        );
      }
    }

    // Check if already invited
    const existingInvite = await this.invitesRepo.findOne({
      where: { organizationId, email },
    });
    if (existingInvite) {
      throw new ConflictException('An invitation has already been sent to this email');
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite
    const invite = this.invitesRepo.create({
      organizationId,
      email,
      role,
      token,
      invitedById: inviterId,
      expiresAt,
    });
    await this.invitesRepo.save(invite);

    // Send invitation email
    const frontendUrl = this.configService.get('corsOrigin') || 'http://localhost:3001';
    const inviteLink = `${frontendUrl}/auth/invite?token=${token}`;
    
    await this.sendInviteEmail(email, org.name, inviteLink, role);

    this.logger.log(`Invitation sent to ${email} for org ${org.name} with role ${role}`);

    return invite;
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvite(
    organizationId: string,
    inviteId: string,
    userId: string,
  ): Promise<void> {
    const invite = await this.invitesRepo.findOne({
      where: { id: inviteId, organizationId },
    });
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    // Check permissions
    const userRole = await this.getUserRole(organizationId, userId);
    if (!userRole || ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY['admin']) {
      throw new ForbiddenException('Only owners and admins can cancel invitations');
    }

    await this.invitesRepo.remove(invite);
    this.logger.log(`Invitation to ${invite.email} cancelled`);
  }

  /**
   * Accept an invitation and join the organization
   */
  async acceptInvite(token: string, userId: string): Promise<OrganizationMember> {
    const invite = await this.invitesRepo.findOne({
      where: { token },
      relations: ['organization'],
    });

    if (!invite) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invite.expiresAt < new Date()) {
      await this.invitesRepo.remove(invite);
      throw new BadRequestException('This invitation has expired');
    }

    // Get the user
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user's email matches the invite
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    // Check if user already belongs to an organization
    if (user.organizationId && user.organizationId !== invite.organizationId) {
      throw new ConflictException(
        'You already belong to another organization. Please leave your current organization first.',
      );
    }

    // Create membership
    const member = this.membersRepo.create({
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
    });
    await this.membersRepo.save(member);

    // Update user's organizationId
    user.organizationId = invite.organizationId;
    await this.usersRepo.save(user);

    // Remove the invite
    await this.invitesRepo.remove(invite);

    this.logger.log(
      `User ${user.email} joined organization ${invite.organization.name} as ${invite.role}`,
    );

    return member;
  }

  /**
   * Get invitation details by token (for showing invite page)
   */
  async getInviteByToken(token: string): Promise<{
    email: string;
    role: MemberRole;
    organizationId: string;
    organizationName: string;
    expiresAt: Date;
  } | null> {
    const invite = await this.invitesRepo.findOne({
      where: { token },
      relations: ['organization'],
    });

    if (!invite || invite.expiresAt < new Date()) {
      return null;
    }

    return {
      email: invite.email,
      role: invite.role,
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: MemberRole,
    updaterId: string,
  ): Promise<OrganizationMember> {
    // Get target member
    const member = await this.membersRepo.findOne({
      where: { id: memberId, organizationId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Get updater's role
    const updaterRole = await this.getUserRole(organizationId, updaterId);
    if (!updaterRole) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Only owners can change roles
    if (updaterRole !== 'owner') {
      throw new ForbiddenException('Only owners can change member roles');
    }

    // Cannot demote self if you're the last owner
    if (member.userId === updaterId && member.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await this.membersRepo.count({
        where: { organizationId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot demote yourself. You are the only owner. Promote another member to owner first.',
        );
      }
    }

    member.role = newRole;
    await this.membersRepo.save(member);

    this.logger.log(
      `Member ${member.user.email} role changed to ${newRole} in org ${organizationId}`,
    );

    return member;
  }

  /**
   * Remove a member from the organization
   */
  async removeMember(
    organizationId: string,
    memberId: string,
    removerId: string,
  ): Promise<void> {
    // Get target member
    const member = await this.membersRepo.findOne({
      where: { id: memberId, organizationId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove yourself
    if (member.userId === removerId) {
      throw new ForbiddenException(
        'You cannot remove yourself. Contact another owner to remove you.',
      );
    }

    // Get remover's role
    const removerRole = await this.getUserRole(organizationId, removerId);
    if (!removerRole) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check permissions based on roles
    // Owners can remove admins and members (but not other owners)
    // Admins can only remove members
    if (member.role === 'owner') {
      throw new ForbiddenException('Owners cannot be removed. They must demote themselves first.');
    }

    if (member.role === 'admin' && removerRole !== 'owner') {
      throw new ForbiddenException('Only owners can remove admins');
    }

    if (removerRole === 'member') {
      throw new ForbiddenException('Members cannot remove other members');
    }

    // Reassign projects to an owner
    const owner = await this.membersRepo.findOne({
      where: { organizationId, role: 'owner' },
    });
    if (owner) {
      await this.projectsRepo.update(
        { ownerId: member.userId, organizationId },
        { ownerId: owner.userId },
      );
      this.logger.log(
        `Reassigned projects from ${member.user.email} to owner ${owner.userId}`,
      );
    }

    // Remove member
    await this.membersRepo.remove(member);

    // Update user's organizationId to null
    member.user.organizationId = null;
    await this.usersRepo.save(member.user);

    this.logger.log(
      `Member ${member.user.email} removed from organization ${organizationId}`,
    );
  }

  /**
   * Send invitation email
   */
  private async sendInviteEmail(
    email: string,
    orgName: string,
    inviteLink: string,
    role: MemberRole,
  ): Promise<void> {
    await this.emailService.sendTeamInvitation(email, orgName, inviteLink, role);
  }

  /**
   * Ensure a user has a membership record (for migration)
   */
  async ensureMembership(userId: string, organizationId: string): Promise<void> {
    const existing = await this.membersRepo.findOne({
      where: { userId, organizationId },
    });
    
    if (!existing) {
      const member = this.membersRepo.create({
        userId,
        organizationId,
        role: 'owner', // First user is always owner
      });
      await this.membersRepo.save(member);
    }
  }
}

