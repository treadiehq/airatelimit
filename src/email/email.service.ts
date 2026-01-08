import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get('nodeEnv') === 'production';

    // Initialize Resend if API key is available (works in both dev and prod)
    const apiKey = this.configService.get<string>('resendApiKey');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn(
        'RESEND_API_KEY not set - emails will be logged to console',
      );
    }
  }

  async sendMagicLink(
    email: string,
    magicLink: string,
    isNewUser: boolean = false,
  ): Promise<void> {
    if (this.resend) {
      // Send via Resend if API key is configured
      await this.sendViaResend(email, magicLink, isNewUser);
    } else {
      // Fall back to console logging if no API key
      this.logMagicLinkToConsole(email, magicLink, isNewUser);
    }
  }

  private async sendViaResend(
    email: string,
    magicLink: string,
    isNewUser: boolean,
  ): Promise<void> {
    try {
      const fromEmail =
        this.configService.get<string>('emailFrom') ||
        'AI Ratelimit <noreply@airatelimit.com>';

      const subject = isNewUser
        ? 'Welcome to AI Ratelimit'
        : 'Sign in to AI Ratelimit';

      const greeting = isNewUser
        ? 'Welcome to AI Ratelimit!'
        : 'Sign in to AI Ratelimit';

      const description = isNewUser
        ? 'Click the link below to complete your account setup:'
        : 'Click the link below to sign in to your account:';

      const textContent = `${greeting}

${description}

${magicLink}

This link expires in 15 minutes.

If you didn't request this email, you can safely ignore it.

—
AI Ratelimit
https://airatelimit.com`;

      // Resend SDK returns { data, error } - must check error property
      // See: https://resend.com/docs/send-with-nodejs
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject,
        text: textContent,
      });

      // Check for API-level errors (invalid API key, rate limits, validation errors, etc.)
      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(
        `Magic link email sent to ${email} via Resend (${isNewUser ? 'new user' : 'existing user'}, id: ${data?.id})`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email via Resend: ${error.message}`);
      throw new Error('Failed to send magic link email');
    }
  }

  private logMagicLinkToConsole(
    email: string,
    magicLink: string,
    isNewUser: boolean,
  ): void {
    const type = isNewUser ? 'SIGNUP' : 'LOGIN';

    this.logger.log('\n' + '='.repeat(80));
    this.logger.log(`🔐 MAGIC LINK ${type}`);
    this.logger.log('='.repeat(80));
    this.logger.log(`📧 Email: ${email}`);
    this.logger.log(`🔗 Magic Link: ${magicLink}`);
    this.logger.log('='.repeat(80) + '\n');

    console.log('\n' + '='.repeat(80));
    console.log(`🔐 MAGIC LINK ${type}`);
    console.log('='.repeat(80));
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 Magic Link: ${magicLink}`);
    console.log('='.repeat(80) + '\n');
  }

  async sendTeamInvitation(
    email: string,
    organizationName: string,
    inviteLink: string,
    role: string,
  ): Promise<void> {
    const roleDisplay = role === 'owner' ? 'an Owner' : role === 'admin' ? 'an Admin' : 'a Member';
    
    if (this.resend) {
      await this.sendInviteViaResend(email, organizationName, inviteLink, roleDisplay);
    } else {
      this.logInviteToConsole(email, organizationName, inviteLink, role);
    }
  }

  private async sendInviteViaResend(
    email: string,
    organizationName: string,
    inviteLink: string,
    roleDisplay: string,
  ): Promise<void> {
    try {
      const fromEmail =
        this.configService.get<string>('emailFrom') ||
        'AI Ratelimit <noreply@airatelimit.com>';

      const textContent = `You've been invited to join ${organizationName}!

You've been invited to join ${organizationName} as ${roleDisplay}.

Click the link below to accept the invitation:

${inviteLink}

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

—
AI Ratelimit
https://airatelimit.com`;

      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `You're invited to join ${organizationName} on AI Ratelimit`,
        text: textContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(
        `Team invitation email sent to ${email} for ${organizationName} (id: ${data?.id})`,
      );
    } catch (error) {
      this.logger.error(`Failed to send invitation email via Resend: ${error.message}`);
      throw new Error('Failed to send invitation email');
    }
  }

  private logInviteToConsole(
    email: string,
    organizationName: string,
    inviteLink: string,
    role: string,
  ): void {
    this.logger.log('\n' + '='.repeat(80));
    this.logger.log('👥 TEAM INVITATION');
    this.logger.log('='.repeat(80));
    this.logger.log(`📧 Email: ${email}`);
    this.logger.log(`🏢 Organization: ${organizationName}`);
    this.logger.log(`👤 Role: ${role}`);
    this.logger.log(`🔗 Invite Link: ${inviteLink}`);
    this.logger.log('='.repeat(80) + '\n');

    console.log('\n' + '='.repeat(80));
    console.log('👥 TEAM INVITATION');
    console.log('='.repeat(80));
    console.log(`📧 Email: ${email}`);
    console.log(`🏢 Organization: ${organizationName}`);
    console.log(`👤 Role: ${role}`);
    console.log(`🔗 Invite Link: ${inviteLink}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Send contribution management link to anonymous contributors
   */
  async sendContributionManagementLink(
    email: string,
    projectName: string,
    managementLink: string,
  ): Promise<void> {
    if (this.resend) {
      await this.sendManagementLinkViaResend(email, projectName, managementLink);
    } else {
      this.logManagementLinkToConsole(email, projectName, managementLink);
    }
  }

  private async sendManagementLinkViaResend(
    email: string,
    projectName: string,
    managementLink: string,
  ): Promise<void> {
    try {
      const fromEmail =
        this.configService.get<string>('emailFrom') ||
        'AI Ratelimit <noreply@airatelimit.com>';

      const textContent = `Your API Key Contribution to ${projectName}

Thank you for contributing your API key to ${projectName}!

Use the link below to manage your contribution, view usage stats, or revoke your key at any time:

${managementLink}

IMPORTANT: Save this link! It's your only way to manage or revoke your contribution.

What you can do with this link:
• View usage statistics (tokens, requests, cost)
• Pause or resume your contribution
• Update your monthly token limit
• Permanently revoke your key

Your API key is encrypted at rest and cannot be viewed by anyone, including the project owner.

—
AI Ratelimit
https://airatelimit.com`;

      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Your API Key Contribution to ${projectName}`,
        text: textContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(
        `Contribution management link sent to ${email} for ${projectName} (id: ${data?.id})`,
      );
    } catch (error) {
      this.logger.error(`Failed to send management link email via Resend: ${error.message}`);
      // Don't throw - this is a nice-to-have, not critical
    }
  }

  private logManagementLinkToConsole(
    email: string,
    projectName: string,
    managementLink: string,
  ): void {
    this.logger.log('\n' + '='.repeat(80));
    this.logger.log('🔑 CONTRIBUTION MANAGEMENT LINK');
    this.logger.log('='.repeat(80));
    this.logger.log(`📧 Email: ${email}`);
    this.logger.log(`📦 Project: ${projectName}`);
    this.logger.log(`🔗 Management Link: ${managementLink}`);
    this.logger.log('='.repeat(80) + '\n');

    console.log('\n' + '='.repeat(80));
    console.log('🔑 CONTRIBUTION MANAGEMENT LINK');
    console.log('='.repeat(80));
    console.log(`📧 Email: ${email}`);
    console.log(`📦 Project: ${projectName}`);
    console.log(`🔗 Management Link: ${managementLink}`);
    console.log('='.repeat(80) + '\n');
  }
}
