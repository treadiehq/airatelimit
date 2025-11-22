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
    
    if (this.isProduction) {
      const apiKey = this.configService.get<string>('resendApiKey');
      if (apiKey) {
        this.resend = new Resend(apiKey);
      } else {
        this.logger.warn('RESEND_API_KEY not set in production mode');
      }
    }
  }

  async sendMagicLink(email: string, magicLink: string): Promise<void> {
    if (this.isProduction && this.resend) {
      await this.sendViaResend(email, magicLink);
    } else {
      this.logMagicLinkToConsole(email, magicLink);
    }
  }

  private async sendViaResend(email: string, magicLink: string): Promise<void> {
    try {
      const fromEmail = this.configService.get<string>('emailFrom') || 'onboarding@resend.dev';
      
      await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Sign in to AI Rate Limiting',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Sign in to your account</h2>
            <p>Click the link below to sign in to your account. This link will expire in 15 minutes.</p>
            <p style="margin: 30px 0;">
              <a href="${magicLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Sign In
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <code style="background-color: #f3f4f6; padding: 8px; display: inline-block; margin-top: 8px;">${magicLink}</code>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 40px;">
              If you didn't request this email, you can safely ignore it.
            </p>
          </div>
        `,
      });

      this.logger.log(`Magic link email sent to ${email} via Resend`);
    } catch (error) {
      this.logger.error(`Failed to send email via Resend: ${error.message}`);
      throw new Error('Failed to send magic link email');
    }
  }

  private logMagicLinkToConsole(email: string, magicLink: string): void {
    this.logger.log('\n' + '='.repeat(80));
    this.logger.log('🔐 MAGIC LINK AUTHENTICATION');
    this.logger.log('='.repeat(80));
    this.logger.log(`📧 Email: ${email}`);
    this.logger.log(`🔗 Magic Link: ${magicLink}`);
    this.logger.log('='.repeat(80) + '\n');
    
    console.log('\n' + '='.repeat(80));
    console.log('🔐 MAGIC LINK AUTHENTICATION');
    console.log('='.repeat(80));
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 Magic Link: ${magicLink}`);
    console.log('='.repeat(80) + '\n');
  }
}

