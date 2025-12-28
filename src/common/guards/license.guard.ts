import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateLicense } from '../../config/license';

/**
 * LicenseGuard - Blocks access when enterprise license is invalid/expired
 * 
 * Use this guard on all controllers in enterprise mode to ensure
 * customers cannot use the software after their license expires.
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const deploymentMode = this.configService.get('DEPLOYMENT_MODE', 'self-hosted');
    
    // Only enforce license in enterprise mode
    if (deploymentMode !== 'enterprise') {
      return true;
    }

    const licenseKey = this.configService.get('ENTERPRISE_LICENSE_KEY');
    const license = validateLicense(licenseKey);

    if (!license) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'License Required',
          message: 'A valid enterprise license is required. Please contact sales@yourdomain.com',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (!license.isValid || license.isExpired) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'License Expired',
          message: `Your enterprise license expired on ${license.expiresAt}. Please renew at sales@yourdomain.com`,
          license: {
            org: license.org,
            expiresAt: license.expiresAt,
            isExpired: license.isExpired,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}

