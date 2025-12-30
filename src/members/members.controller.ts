import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MembersService } from './members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto';

@Controller('members')
export class MembersController {
  constructor(private membersService: MembersService) {}

  /**
   * Get all members of the current organization
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getMembers(@Request() req) {
    const { organizationId, userId } = req.user;
    
    // Ensure current user has a membership record (for users created before team management)
    await this.membersService.ensureMembership(userId, organizationId);
    
    // Check if team management is available
    const available = await this.membersService.isTeamManagementAvailable(organizationId);
    
    const members = await this.membersService.getMembers(organizationId);
    const userRole = await this.membersService.getUserRole(organizationId, userId);
    
    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        role: m.role,
        createdAt: m.createdAt,
      })),
      currentUserRole: userRole,
      teamManagementAvailable: available,
    };
  }

  /**
   * Get current user's membership info
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyMembership(@Request() req) {
    const { organizationId, userId } = req.user;
    const membership = await this.membersService.getMembership(organizationId, userId);
    
    if (!membership) {
      return { role: null, isMember: false };
    }
    
    return {
      id: membership.id,
      role: membership.role,
      isMember: true,
      createdAt: membership.createdAt,
    };
  }

  /**
   * Get all pending invitations
   */
  @Get('invites')
  @UseGuards(JwtAuthGuard)
  async getInvites(@Request() req) {
    const { organizationId } = req.user;
    const invites = await this.membersService.getInvites(organizationId);
    
    return invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      invitedBy: i.invitedBy?.email,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));
  }

  /**
   * Invite a new member
   */
  @Post('invite')
  @UseGuards(JwtAuthGuard)
  async inviteMember(@Request() req, @Body() dto: InviteMemberDto) {
    const { organizationId, userId } = req.user;
    const invite = await this.membersService.inviteMember(
      organizationId,
      userId,
      dto.email,
      dto.role,
    );
    
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      message: `Invitation sent to ${dto.email}`,
    };
  }

  /**
   * Cancel a pending invitation
   */
  @Delete('invites/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvite(@Request() req, @Param('id') inviteId: string) {
    const { organizationId, userId } = req.user;
    await this.membersService.cancelInvite(organizationId, inviteId, userId);
  }

  /**
   * Get invitation details by token (public endpoint for invite page)
   */
  @Get('invite/verify')
  async verifyInviteToken(@Query('token') token: string) {
    const invite = await this.membersService.getInviteByToken(token);
    
    if (!invite) {
      return { valid: false };
    }
    
    return {
      valid: true,
      email: invite.email,
      role: invite.role,
      organizationName: invite.organizationName,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Accept an invitation (user must be logged in with matching email)
   */
  @Post('invite/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(@Request() req, @Body('token') token: string) {
    const { userId } = req.user;
    const member = await this.membersService.acceptInvite(token, userId);
    
    return {
      success: true,
      role: member.role,
      organizationId: member.organizationId,
      message: 'You have successfully joined the organization',
    };
  }

  /**
   * Update a member's role
   */
  @Put(':id/role')
  @UseGuards(JwtAuthGuard)
  async updateMemberRole(
    @Request() req,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const { organizationId, userId } = req.user;
    const member = await this.membersService.updateMemberRole(
      organizationId,
      memberId,
      dto.role,
      userId,
    );
    
    return {
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      role: member.role,
      message: `Role updated to ${dto.role}`,
    };
  }

  /**
   * Remove a member from the organization
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(@Request() req, @Param('id') memberId: string) {
    const { organizationId, userId } = req.user;
    await this.membersService.removeMember(organizationId, memberId, userId);
  }
}

