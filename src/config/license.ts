import * as crypto from 'crypto';

/**
 * Enterprise License Validation
 * 
 * Uses RSA asymmetric cryptography:
 * - PRIVATE KEY: Only you (the vendor) have this. Used to SIGN licenses.
 * - PUBLIC KEY: Embedded in this code. Used to VERIFY licenses.
 * 
 * This means:
 * - Only you can create valid licenses (you have the private key)
 * - Anyone can verify a license (public key is in the code)
 * - Customers CANNOT generate their own licenses
 * 
 * Generate licenses using: npx ts-node scripts/generate-license.ts --private-key path/to/private.pem
 */

export interface LicenseData {
  org: string;
  seats: number;
  expiresAt: string;
  features: string[];
  issuedAt?: string;
  licenseId?: string;
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  error?: string;
}

/**
 * PUBLIC KEY for license verification
 * 
 * This public key can ONLY verify signatures, NOT create them.
 * The matching private key is kept secret by you (the vendor).
 * 
 * Generate your key pair once with:
 *   openssl genrsa -out license-private.pem 2048
 *   openssl rsa -in license-private.pem -pubout -out license-public.pem
 * 
 * Then paste the PUBLIC key contents here.
 * Keep the PRIVATE key file secure and NEVER commit it!
 */
const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5mNdA3wsxiXqafKHQOao
L6t+ataW6p6Aw89eBERJ6soFAZhjgOBzMwepi/Qe4mUvSyzPuEsbfRssAbRbVLTY
AJyAFHq908ubIvuO5FoP3vlhjiprh7xHkLT+Hm6rOKTko053lJtPWpR9j23JrbMp
2QHrxZW+iXkEPgC2HktGWvdsr06ruNdJ/mPGSekT5yQfNwFGOEYMvs6Gx+etdONK
rdbOxeSAL5Mt0kdUPB58g8jIL2DU1sp6Vb5YISJZSLiZso+TL4GgdL5EWXxCjHUu
Kp6QJuFHnOmIFJbZNAishBy6bSRMTnf0GHNo9y5pHDe/nyWAXBVGZXaDAn6v48h7
KQIDAQAB
-----END PUBLIC KEY-----`;

// Cache the license validation result
let cachedLicense: LicenseData | null = null;
let lastValidationTime = 0;
const CACHE_TTL_MS = 60 * 1000; // Re-validate every minute

/**
 * Validate an enterprise license key
 */
export function validateLicense(licenseKey: string | undefined, forceRefresh = false): LicenseData | null {
  // Return cached result if valid
  const now = Date.now();
  if (!forceRefresh && cachedLicense && (now - lastValidationTime) < CACHE_TTL_MS) {
    return cachedLicense;
  }

  // No key = no license
  if (!licenseKey || licenseKey.trim() === '') {
    cachedLicense = null;
    lastValidationTime = now;
    return null;
  }

  // For development: Accept any non-empty key if public key not configured
  const publicKeyConfigured = !LICENSE_PUBLIC_KEY.includes('REPLACE_WITH_YOUR_PUBLIC_KEY');
  if (!publicKeyConfigured && process.env.NODE_ENV !== 'production') {
    cachedLicense = {
      org: 'Development',
      seats: 999,
      expiresAt: '2099-12-31',
      features: ['all'],
      isValid: true,
      isExpired: false,
      daysRemaining: 999999,
    };
    lastValidationTime = now;
    return cachedLicense;
  }

  try {
    // Parse license format: base64(json).base64(signature)
    const [payloadB64, signatureB64] = licenseKey.split('.');
    
    if (!payloadB64 || !signatureB64) {
      cachedLicense = createInvalidLicense('Invalid license key format');
      lastValidationTime = now;
      return cachedLicense;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    
    // Verify RSA signature using public key
    if (publicKeyConfigured) {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(payloadB64);
      
      const signatureBuffer = Buffer.from(signatureB64, 'base64');
      const isValidSignature = verifier.verify(LICENSE_PUBLIC_KEY, signatureBuffer);
      
      if (!isValidSignature) {
        cachedLicense = createInvalidLicense('Invalid license signature');
        lastValidationTime = now;
        return cachedLicense;
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, public key must be configured
      cachedLicense = createInvalidLicense('License public key not configured');
      lastValidationTime = now;
      return cachedLicense;
    }

    // Calculate expiration
    const expiresAt = new Date(payload.expiresAt);
    const nowDate = new Date();
    const isExpired = expiresAt < nowDate;
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)));

    cachedLicense = {
      org: payload.org,
      seats: payload.seats,
      expiresAt: payload.expiresAt,
      features: payload.features || ['all'],
      issuedAt: payload.issuedAt,
      licenseId: payload.licenseId,
      isValid: !isExpired,
      isExpired,
      daysRemaining,
      error: isExpired ? `License expired on ${payload.expiresAt}` : undefined,
    };
    lastValidationTime = now;
    
    if (isExpired) {
      console.warn(`⚠️ Enterprise license expired on ${payload.expiresAt}`);
    } else if (daysRemaining <= 30) {
      console.warn(`⚠️ Enterprise license expires in ${daysRemaining} days`);
    }

    return cachedLicense;
  } catch (error) {
    cachedLicense = createInvalidLicense(`Failed to parse license: ${error.message}`);
    lastValidationTime = now;
    return cachedLicense;
  }
}

function createInvalidLicense(error: string): LicenseData {
  console.warn(`❌ License validation failed: ${error}`);
  return {
    org: '',
    seats: 0,
    expiresAt: '',
    features: [],
    isValid: false,
    isExpired: true,
    daysRemaining: 0,
    error,
  };
}

/**
 * Check if enterprise license is valid (not expired)
 */
export function hasValidEnterpriseLicense(): boolean {
  const license = validateLicense(process.env.ENTERPRISE_LICENSE_KEY);
  return license?.isValid ?? false;
}

/**
 * Get enterprise license details
 */
export function getEnterpriseLicense(): LicenseData | null {
  return validateLicense(process.env.ENTERPRISE_LICENSE_KEY);
}

/**
 * Clear the license cache (useful for testing)
 */
export function clearLicenseCache(): void {
  cachedLicense = null;
  lastValidationTime = 0;
}

