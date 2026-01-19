import {
  Controller,
  Get,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Response } from 'express';
import { getFeatureFlags, getDeploymentMode } from '../config/features';
import { getEnterpriseLicense } from '../config/license';

/**
 * Health check endpoint for container orchestration
 * Not behind auth - needs to be accessible for probes
 *
 * IMPORTANT: These endpoints return proper HTTP status codes for Kubernetes:
 * - 200-399: Success (pod is healthy/ready)
 * - 500+: Failure (pod is unhealthy/not ready)
 *
 * Kubernetes probes only check HTTP status codes, not response bodies.
 */
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check(@Res() res: Response) {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'unknown' as string,
    };

    try {
      // Quick database connectivity check
      await this.dataSource.query('SELECT 1');
      checks.database = 'connected';
      return res.status(200).json(checks);
    } catch (error) {
      checks.database = 'disconnected';
      checks.status = 'degraded';
      // Return 503 so Kubernetes knows the service is degraded
      return res.status(503).json(checks);
    }
  }

  @Get('live')
  liveness() {
    // Simple liveness probe - just confirms the process is running
    // No external dependencies checked - if we can respond, we're alive
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    // Readiness probe - confirms the app can handle traffic
    // Must return proper HTTP status codes for Kubernetes:
    // - 200: Ready to receive traffic
    // - 503: Not ready, don't send traffic
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      // Throw 503 Service Unavailable so Kubernetes stops routing traffic
      throw new ServiceUnavailableException({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        message: 'Database not available',
      });
    }
  }

  /**
   * Return enabled features based on deployment mode
   * Useful for dashboard to discover what's available
   */
  @Get('features')
  getFeatures() {
    return {
      deploymentMode: getDeploymentMode(),
      features: getFeatureFlags(),
    };
  }

  /**
   * Return enterprise license status
   * Only relevant in enterprise deployment mode
   */
  @Get('license')
  getLicenseStatus() {
    const mode = getDeploymentMode();
    
    if (mode !== 'enterprise') {
      return {
        mode,
        message: 'License only applies to enterprise deployment mode',
      };
    }

    const license = getEnterpriseLicense();
    
    if (!license) {
      return {
        mode,
        valid: false,
        error: 'No license key configured',
      };
    }

    return {
      mode,
      valid: license.isValid,
      org: license.org,
      seats: license.seats,
      expiresAt: license.expiresAt,
      daysRemaining: license.daysRemaining,
      isExpired: license.isExpired,
      features: license.features,
      error: license.error,
    };
  }
}

