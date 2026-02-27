import * as crypto from 'crypto';

// ====================================
// SECURITY: Validate required secrets in production
// ====================================
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    if (!secret) {
      throw new Error('CRITICAL: JWT_SECRET must be set in production');
    }
    if (secret.length < 32) {
      throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters');
    }
    const lower = secret.toLowerCase();
    if (lower.includes('change') || lower.includes('your-') || lower.includes('placeholder') || lower.includes('example')) {
      throw new Error('CRITICAL: JWT_SECRET contains placeholder text - please set a real secret');
    }
  }
  
  // In development, generate a random secret if not provided
  // This ensures each dev instance has a unique secret
  if (!secret) {
    console.warn('⚠️  JWT_SECRET not set - generating random secret for development');
    return crypto.randomBytes(32).toString('hex');
  }
  
  return secret;
}

function validateEncryptionKey(): void {
  const key = process.env.ENCRYPTION_KEY;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    if (!key) {
      throw new Error('CRITICAL: ENCRYPTION_KEY must be set in production to encrypt stored API keys');
    }
    if (key.length < 32) {
      throw new Error('CRITICAL: ENCRYPTION_KEY must be at least 32 characters');
    }
    const lower = key.toLowerCase();
    if (lower.includes('change') || lower.includes('your-') || lower.includes('placeholder') || lower.includes('example')) {
      throw new Error('CRITICAL: ENCRYPTION_KEY contains placeholder text - please set a real key');
    }
  } else if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set - provider API keys will be stored in plaintext (dev only)');
  }
}

export default () => {
  // Validate required secrets
  validateEncryptionKey();
  
  return {
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  globalAdminKey: process.env.GLOBAL_ADMIN_KEY,
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  openai: {
    baseUrl:
      process.env.OPENAI_BASE_URL ||
      'https://api.openai.com/v1/chat/completions',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  encryptionKey: process.env.ENCRYPTION_KEY,
};
};
