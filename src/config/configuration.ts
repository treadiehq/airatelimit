export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  globalAdminKey: process.env.GLOBAL_ADMIN_KEY,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
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
});

