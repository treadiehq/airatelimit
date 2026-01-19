import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { ProxyRateLimitMiddleware } from './common/proxy-rate-limit.middleware';
import { getEnterpriseLicense } from './config/license';
import { getDeploymentMode } from './config/features';

async function bootstrap() {
  // Disable built-in body parser to use custom middleware with rawBody capture
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const configService = app.get(ConfigService);
  
  // ====================================
  // License validation for enterprise mode
  // ====================================
  const deploymentMode = getDeploymentMode();
  if (deploymentMode === 'enterprise') {
    const license = getEnterpriseLicense();
    if (!license || !license.isValid) {
      console.error('');
      console.error('═'.repeat(60));
      console.error('❌ ENTERPRISE LICENSE ERROR');
      console.error('═'.repeat(60));
      if (!license) {
        console.error('No license key configured.');
        console.error('Set ENTERPRISE_LICENSE_KEY in your .env file.');
      } else if (license.isExpired) {
        console.error(`License expired on ${license.expiresAt}`);
        console.error('Please contact sales to renew your license.');
      } else {
        console.error(license.error || 'Invalid license');
      }
      console.error('═'.repeat(60));
      console.error('');
      // In production, you might want to exit here:
      // process.exit(1);
    } else {
      console.log('');
      console.log('═'.repeat(60));
      console.log('✅ ENTERPRISE LICENSE VALID');
      console.log('═'.repeat(60));
      console.log(`   Organization: ${license.org}`);
      console.log(`   Seats:        ${license.seats}`);
      console.log(`   Expires:      ${license.expiresAt} (${license.daysRemaining} days)`);
      console.log('═'.repeat(60));
      console.log('');
    }
  }

  // ====================================
  // SECURITY: Request body size limits
  // ====================================
  // Limit JSON body to 2MB (enough for large prompts, prevents abuse)
  // Use verify callback to capture raw body for Stripe webhook signature verification
  app.use(
    json({
      limit: '2mb',
      verify: (req: any, res, buf) => {
        // Capture raw body buffer for webhook signature verification (e.g., Stripe)
        if (buf && buf.length) {
          req.rawBody = buf;
        }
      },
    }),
  );
  // Limit URL-encoded body to 1MB
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Enable CORS for dashboard
  const corsOrigin = configService.get<string>('corsOrigin');
  app.enableCors({
    origin: corsOrigin?.includes(',')
      ? corsOrigin.split(',').map((o) => o.trim())
      : corsOrigin || true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-project-key',
      'x-identity',
      'x-tier',
      'x-session',
    ],
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ====================================
  // SECURITY: Rate limiting for proxy endpoints
  // ====================================
  const rateLimitMiddleware = app.get(ProxyRateLimitMiddleware);
  // Apply rate limiting to proxy endpoints only (not dashboard APIs)
  // Note: Proxy routes are at /v1 (excluded from /api prefix for SDK compatibility)
  app.use('/v1', rateLimitMiddleware.use.bind(rateLimitMiddleware));

  // Set global API prefix (exclude v1 proxy routes for OpenAI SDK compatibility)
  app.setGlobalPrefix('api', {
    exclude: ['v1/(.*)'],  // Proxy routes at /v1/* should not have /api prefix
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`AI Rate Limit API running on http://localhost:${port}`);
  console.log(`Security: Body limit 2MB, Rate limit 120/min per IP, 600/min per project`);
}
bootstrap();
