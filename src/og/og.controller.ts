import { Controller, Get, Param, Res, Header } from '@nestjs/common';
import { Response } from 'express';

/**
 * OG Image Controller
 * 
 * Generates dynamic OpenGraph images for social sharing.
 */
@Controller('og')
export class OgController {
  /**
   * Generate OG image for sponsor page
   * Returns an SVG that looks like a social card
   */
  @Get('sponsor/:username')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
  async getSponsorOgImage(
    @Param('username') username: string,
    @Res() res: Response,
  ) {
    const svg = this.generateSponsorSvg(username);
    res.send(svg);
  }

  /**
   * Generate a nice SVG card for the sponsor page (blog card style)
   */
  private generateSponsorSvg(username: string): string {
    // Clean the username
    const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 39);
    
    return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer dark background -->
  <rect width="1200" height="630" fill="#0a0a0a"/>
  
  <!-- White card with rounded corners -->
  <rect x="60" y="40" width="1080" height="550" rx="24" fill="#ffffff"/>
  
  <!-- Blue accent bar at top of card -->
  <rect x="100" y="80" width="80" height="8" rx="4" fill="#93c5fd"/>
  
  <!-- Main title -->
  <text x="100" y="240" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="72" font-weight="700" fill="#0a0a0a" letter-spacing="-2">
    Sponsor @${cleanUsername}
  </text>
  
  <!-- Subtitle -->
  <text x="100" y="320" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="32" fill="#6b7280">
    Share your AI API credits
  </text>
  
  <!-- Bottom section: logo/author and domain -->
  <!-- Blue dot + "by AI Ratelimit" -->
  <circle cx="115" cy="510" r="8" fill="#93c5fd"/>
  <text x="140" y="518" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="28" fill="#374151">
    Powered by AI Ratelimit
  </text>
  
  <!-- Domain on the right -->
  <text x="1100" y="518" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="28" fill="#9ca3af" text-anchor="end">
    airatelimit.com
  </text>
</svg>`;
  }
}
