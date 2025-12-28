import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { getFeatureFlags, getDeploymentMode } from '../config/features';
import { getEnterpriseLicense } from '../config/license';

/**
 * Health check endpoint for container orchestration
 * Not behind auth - needs to be accessible for probes
 */
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'unknown',
    };

    try {
      // Quick database connectivity check
      await this.dataSource.query('SELECT 1');
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    return checks;
  }

  @Get('live')
  liveness() {
    // Simple liveness probe - just confirms the process is running
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    // Readiness probe - confirms the app can handle traffic
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'not_ready', timestamp: new Date().toISOString() };
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

