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
      this.logger.warn('RESEND_API_KEY not set - emails will be logged to console');
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

      const heading = isNewUser
        ? 'Welcome to AI Ratelimit! Complete your signup'
        : 'Sign in to your account';

      const description = isNewUser
        ? 'Click the link below to complete your account setup. This link will expire in 15 minutes.'
        : 'Click the link below to sign in to your account. This link will expire in 15 minutes.';

      const buttonText = isNewUser ? 'Complete Signup' : 'Sign In';

      await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a;">
              <tr>
                <td align="center" style="padding: 60px 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
                    
                    <!-- Logo/Brand -->
                    <tr>
                      <td align="center" style="padding-bottom: 40px;">
                        <table border="0" cellpadding="0" cellspacing="0" style="display: inline-block;">
                          <tr>
                            <td style="background: #6ba3e8; padding: 12px 24px; border-radius: 8px;">
                              <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="padding-right: 12px; vertical-align: middle;">
                                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzc5IiBoZWlnaHQ9IjI5NSIgdmlld0JveD0iMCAwIDM3OSAyOTUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTg5LjM5MyAzMS41MTQzQzIxNC45MDggMzEuNTE0MyAyNDAuMTUgMzIuNjY5MyAyNjUuMDc3IDM0LjkxNjNDMjY4LjM0MSAzNS4yMDY3IDI3MS40MDcgMzYuNjExMSAyNzMuNzU4IDM4Ljg5MzlDMjc2LjExIDQxLjE3NjcgMjc3LjYwNSA0NC4xOTg5IDI3Ny45OTIgNDcuNDUzM0MyODAuNTk2IDY5LjI1MTMgMjgyLjM2IDkxLjMwMTMgMjgzLjI0MiAxMTMuNjAzTDI0Ny43NzMgNzguMTEzM0MyNDQuODAxIDc1LjI0NTcgMjQwLjgyMiA3My42NiAyMzYuNjkyIDczLjY5NzhDMjMyLjU2MyA3My43MzU2IDIyOC42MTMgNzUuMzkzOSAyMjUuNjk0IDc4LjMxNTVDMjIyLjc3NSA4MS4yMzcgMjIxLjEyMSA4NS4xODgxIDIyMS4wODcgODkuMzE3OEMyMjEuMDUzIDkzLjQ0NzQgMjIyLjY0MiA5Ny40MjUxIDIyNS41MTMgMTAwLjM5NEwyODguNDkyIDE2My4zOTRDMjkxLjQ0NSAxNjYuMzQ0IDI5NS40NDggMTY4IDI5OS42MjIgMTY4QzMwMy43OTYgMTY4IDMwNy43OTkgMTY2LjM0NCAzMTAuNzUyIDE2My4zOTRMMzczLjc3MyAxMDAuMzk0QzM3NS4zMiA5OC45NTI0IDM3Ni41NjEgOTcuMjEzNSAzNzcuNDIyIDk1LjI4MTZDMzc4LjI4MyA5My4zNDk2IDM3OC43NDYgOTEuMjY0IDM3OC43ODMgODkuMTQ5MkMzNzguODIxIDg3LjAzNDUgMzc4LjQzMiA4NC45MzM5IDM3Ny42MzkgODIuOTcyN0MzNzYuODQ3IDgxLjAxMTYgMzc1LjY2OCA3OS4yMzAxIDM3NC4xNzMgNzcuNzM0NUMzNzIuNjc3IDc2LjIzODkgMzcwLjg5NiA3NS4wNTk4IDM2OC45MzQgNzQuMjY3N0MzNjYuOTczIDczLjQ3NTYgMzY0Ljg3MyA3My4wODY1IDM2Mi43NTggNzMuMTIzOUMzNjAuNjQzIDczLjE2MTIgMzU4LjU1OCA3My42MjQgMzU2LjYyNiA3NC40ODQ5QzM1NC42OTQgNzUuMzQ1NyAzNTIuOTU1IDc2LjU4NjkgMzUxLjUxMyA3OC4xMzQzTDMxNC44MDUgMTE0LjgyMUMzMTMuOTMyIDkxLjA1MzMgMzEyLjA4MyA2Ny4zMzEzIDMwOS4yNjEgNDMuNzE1M0MzMDguMDE3IDMzLjI5MDcgMzAzLjIyOCAyMy42MTAzIDI5NS42OTYgMTYuMjk2NUMyODguMTY0IDguOTgyNjUgMjc4LjM0OCA0LjQ3OTc0IDI2Ny44OTEgMy41NDIzNkMyMTUuNjU4IC0xLjE4MDc5IDE2My4xMDYgLTEuMTgwNzkgMTEwLjg3NCAzLjU0MjM2QzEwMC40MjEgNC40ODQzMSA5MC42MDkxIDguOTg5MjUgODMuMDgxNiAxNi4zMDI3Qzc1LjU1NCAyMy42MTYxIDcwLjc2NzkgMzMuMjkzOSA2OS41MjQ5IDQzLjcxNTNDNjguMTgzNSA1NC45NjIyIDY3LjA2MzIgNjYuMjM0NCA2Ni4xNjQ5IDc3LjUyNTNDNjUuOTY0NCA3OS42MDUxIDY2LjE3OTggODEuNzA0MSA2Ni43OTg1IDgzLjY5OTlDNjcuNDE3MiA4NS42OTU3IDY4LjQyNjkgODcuNTQ4NSA2OS43Njg3IDg5LjE1MDJDNzEuMTEwNSA5MC43NTIgNzIuNzU3NiA5Mi4wNzA3IDc0LjYxNDEgOTMuMDI5N0M3Ni40NzA1IDkzLjk4ODYgNzguNDk5MyA5NC41Njg2IDgwLjU4MjEgOTQuNzM1N0M4Mi42NjQ5IDk0LjkwMjkgODQuNzYwMSA5NC42NTQgODYuNzQ1OCA5NC4wMDM0Qzg4LjczMTUgOTMuMzUyOSA5MC41Njc4IDkyLjMxMzggOTIuMTQ3OSA5MC45NDY1QzkzLjcyOCA4OS41NzkzIDk1LjAyMDMgODcuOTExMyA5NS45NDk0IDg2LjAzOThDOTYuODc4NiA4NC4xNjgyIDk3LjQyNiA4Mi4xMzA1IDk3LjU1OTkgODAuMDQ1M0M5OC40MjA5IDY5LjEyNTMgOTkuNTEyOSA1OC4yNDczIDEwMC43OTQgNDcuNDUzM0MxMDEuMTgxIDQ0LjE5ODkgMTAyLjY3NiA0MS4xNzY3IDEwNS4wMjcgMzguODkzOUMxMDcuMzc5IDM2LjYxMTEgMTEwLjQ0NCAzNS4yMDY3IDExMy43MDkgMzQuOTE2M0MxMzguODczIDMyLjY0NSAxNjQuMTI3IDMxLjUwOTggMTg5LjM5MyAzMS41MTQzWk05MC4yOTM5IDEzMC42MzRDODcuMzQwNyAxMjcuNjg1IDgzLjMzNzYgMTI2LjAyOCA3OS4xNjM5IDEyNi4wMjhDNzQuOTkwMSAxMjYuMDI4IDcwLjk4NyAxMjcuNjg1IDY4LjAzMzkgMTMwLjYzNEw1LjAxMjg4IDE5My42MzRDMy40NjU0NSAxOTUuMDc2IDIuMjI0MyAxOTYuODE1IDEuMzYzNDcgMTk4Ljc0N0MwLjUwMjY0MiAyMDAuNjc5IDAuMDM5NzYzNiAyMDIuNzY0IDAuMDAyNDUxMTQgMjA0Ljg3OUMtMC4wMzQ4NjEzIDIwNi45OTQgMC4zNTQxNTcgMjA5LjA5NSAxLjE0NjMgMjExLjA1NkMxLjkzODQ0IDIxMy4wMTcgMy4xMTc0NyAyMTQuNzk4IDQuNjEzMDcgMjE2LjI5NEM2LjEwODY2IDIxNy43ODkgNy44OTAxNyAyMTguOTY5IDkuODUxMzMgMjE5Ljc2MUMxMS44MTI1IDIyMC41NTMgMTMuOTEzMSAyMjAuOTQyIDE2LjAyNzggMjIwLjkwNUMxOC4xNDI2IDIyMC44NjcgMjAuMjI4MiAyMjAuNDA0IDIyLjE2MDIgMjE5LjU0NEMyNC4wOTIyIDIxOC42ODMgMjUuODMxIDIxNy40NDIgMjcuMjcyOSAyMTUuODk0TDYzLjk4MDkgMTc5LjIwN0M2NC44NjI5IDIwMy4xNjggNjYuNzEwOSAyMjYuODc3IDY5LjUyNDkgMjUwLjMxM0M3MC43Njg4IDI2MC43MzggNzUuNTU3OSAyNzAuNDE4IDgzLjA4OTcgMjc3LjczMkM5MC42MjE1IDI4NS4wNDYgMTAwLjQzOCAyODkuNTQ5IDExMC44OTUgMjkwLjQ4NkMxNjMuMTI3IDI5NS4yMDcgMjE1LjY3OSAyOTUuMjA3IDI2Ny45MTIgMjkwLjQ4NkMyNzguMzY1IDI4OS41NDQgMjg4LjE3NyAyODUuMDM5IDI5NS43MDQgMjc3LjcyNkMzMDMuMjMyIDI3MC40MTIgMzA4LjAxOCAyNjAuNzM0IDMwOS4yNjEgMjUwLjMxM0MzMTAuNjA1IDIzOS4wOTkgMzExLjcxOCAyMjcuODIyIDMxMi42MjEgMjE2LjUwM0MzMTIuODIxIDIxNC40MjMgMzEyLjYwNiAyMTIuMzI0IDMxMS45ODcgMjEwLjMyOEMzMTEuMzY4IDIwOC4zMzMgMzEwLjM1OSAyMDYuNDggMzA5LjAxNyAyMDQuODc4QzMwNy42NzUgMjAzLjI3NiAzMDYuMDI4IDIwMS45NTggMzA0LjE3MiAyMDAuOTk5QzMwMi4zMTUgMjAwLjA0IDMwMC4yODYgMTk5LjQ2IDI5OC4yMDQgMTk5LjI5M0MyOTYuMTIxIDE5OS4xMjUgMjk0LjAyNiAxOTkuMzc0IDI5Mi4wNCAxOTkuNzI1QzI5MC4wNTQgMjAwLjY3NSAyODguMjE4IDIwMS43MTUgMjg2LjYzOCAyMDMuMDgyQzI4NS4wNTggMjA0LjQ0OSAyODMuNzY1IDIwNi4xMTcgMjgyLjgzNiAyMDcuOTg5QzI4MS45MDcgMjA5Ljg2IDI4MS4zNiAyMTEuODk4IDI4MS4yMjYgMjEzLjk4M0MyODAuMzY1IDIyNC45MDMgMjc5LjI3MyAyMzUuNzYgMjc3Ljk5MiAyNDYuNTc1QzI3Ny42MDUgMjQ5LjgzIDI3Ni4xMSAyNTIuODUyIDI3My43NTggMjU1LjEzNUMyNzEuNDA3IDI1Ny40MTcgMjY4LjM0MSAyNTguODIyIDI2NS4wNzcgMjU5LjExMkMyMTQuNzI0IDI2My42NjYgMTY0LjA2MiAyNjMuNjY2IDExMy43MDkgMjU5LjExMkMxMTAuNDQ0IDI1OC44MjIgMTA3LjM3OSAyNTcuNDE3IDEwNS4wMjcgMjU1LjEzNUMxMDIuNjc2IDI1Mi44NTIgMTAxLjE4MSAyNDkuODMgMTAwLjc5NCAyNDYuNTc1Qzk4LjE2ODYgMjI0LjYwMyA5Ni40MTcyIDIwMi41MzYgOTUuNTQzOSAxODAuNDI1TDEzMS4wMTMgMjE1LjkxNUMxMzMuOTg1IDIxOC43ODMgMTM3Ljk2NCAyMjAuMzY4IDE0Mi4wOTQgMjIwLjMzMUMxNDYuMjIzIDIyMC4yOTMgMTUwLjE3MyAyMTguNjM0IDE1My4wOTIgMjE1LjcxM0MxNTYuMDEgMjEyLjc5MSAxNTcuNjY1IDIwOC44NCAxNTcuNjk5IDIwNC43MTFDMTU3LjczMyAyMDAuNTgxIDE1Ni4xNDMgMTk2LjYwMyAxNTMuMjczIDE5My42MzRMOTAuMjkzOSAxMzAuNjM0WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==" 
                                         alt="AI Ratelimit Logo" 
                                         width="32" 
                                         height="25" 
                                         style="display: block; border: 0;">
                                  </td>
                                  <td style="vertical-align: middle;">
                                    <h1 style="margin: 0; color: #000000; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; white-space: nowrap;">
                                      AI Ratelimit
                                    </h1>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                      <td style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          
                          <!-- Content -->
                          <tr>
                            <td style="padding: 48px 40px;">
                              <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                                ${heading}
                              </h2>
                              <p style="margin: 0 0 32px; color: #a0a0a0; font-size: 15px; line-height: 24px;">
                                ${description}
                              </p>
                              
                              <!-- Button -->
                              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                  <td align="center" style="padding: 8px 0 32px;">
                                    <a href="${magicLink}" 
                                       style="display: inline-block; background: #6ba3e8; color: #000000; font-size: 15px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 2px 8px rgba(107, 163, 232, 0.3);">
                                      ${buttonText}
                                    </a>
                                  </td>
                                </tr>
                              </table>
                              
                              <!-- Security Note -->
                              <div style="background: rgba(107, 163, 232, 0.12); padding: 16px 20px; border-radius: 6px;">
                                <p style="margin: 0; color: #6ba3e8; font-size: 13px; line-height: 20px;">
                                  <strong>Security:</strong> This link expires in 15 minutes
                                </p>
                              </div>
                            </td>
                          </tr>
                          
                          <!-- Footer -->
                          <tr>
                            <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid #2a2a2a;">
                              <p style="margin: 0; color: #666666; font-size: 12px; line-height: 18px; text-align: center;">
                                If you didn't request this email, you can safely ignore it.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Bottom Spacing -->
                    <tr>
                      <td style="padding-top: 32px; text-align: center;">
                        <p style="margin: 0; color: #4a4a4a; font-size: 11px; line-height: 16px;">
                          © ${new Date().getFullYear()} AI Ratelimit. Built for developers.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      this.logger.log(
        `Magic link email sent to ${email} via Resend (${isNewUser ? 'new user' : 'existing user'})`,
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
}
