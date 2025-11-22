/**
 * Reserved Organization Names
 * 
 * Add any organization names you want to reserve here.
 * These names cannot be used during signup.
 * Names are automatically converted to lowercase for matching.
 * 
 * To add more names:
 * 1. Edit this file
 * 2. Run: npm run seed:reserved-names
 * 3. Or restart the server (auto-syncs on startup)
 */

export interface ReservedName {
  name: string;
  reason: string;
}

export const RESERVED_ORG_NAMES: ReservedName[] = [
  // System reserved
  { name: 'admin', reason: 'System reserved' },
  { name: 'administrator', reason: 'System reserved' },
  { name: 'system', reason: 'System reserved' },
  { name: 'root', reason: 'System reserved' },
  { name: 'superuser', reason: 'System reserved' },
  { name: 'api', reason: 'System reserved' },
  { name: 'app', reason: 'System reserved' },
  
  // Support & Legal
  { name: 'help', reason: 'System reserved' },
  { name: 'support', reason: 'System reserved' },
  { name: 'security', reason: 'System reserved' },
  { name: 'abuse', reason: 'System reserved' },
  { name: 'billing', reason: 'System reserved' },
  { name: 'sales', reason: 'System reserved' },
  { name: 'marketing', reason: 'System reserved' },
  { name: 'info', reason: 'System reserved' },
  { name: 'contact', reason: 'System reserved' },
  { name: 'privacy', reason: 'System reserved' },
  { name: 'terms', reason: 'System reserved' },
  { name: 'legal', reason: 'System reserved' },
  
  // Email standards
  { name: 'noreply', reason: 'System reserved' },
  { name: 'no-reply', reason: 'System reserved' },
  { name: 'postmaster', reason: 'System reserved' },
  { name: 'hostmaster', reason: 'System reserved' },
  { name: 'webmaster', reason: 'System reserved' },
  
  // Generic/Test
  { name: 'status', reason: 'System reserved' },
  { name: 'default', reason: 'System reserved' },
  { name: 'null', reason: 'System reserved' },
  { name: 'undefined', reason: 'System reserved' },
  { name: 'test', reason: 'System reserved' },
  { name: 'demo', reason: 'System reserved' },
  { name: 'example', reason: 'System reserved' },
  { name: 'sample', reason: 'System reserved' },
  
  // ==========================================
  // ADD YOUR CUSTOM RESERVED NAMES BELOW
  // ==========================================
  
  // Big tech companies
  { name: 'openai', reason: 'Company name protection' },
  { name: 'anthropic', reason: 'Company name protection' },
  { name: 'google', reason: 'Company name protection' },
  { name: 'microsoft', reason: 'Company name protection' },
  { name: 'apple', reason: 'Company name protection' },
  { name: 'meta', reason: 'Company name protection' },
  { name: 'amazon', reason: 'Company name protection' },
	{ name: 'treadie', reason: 'Company name protection' },
	{ name: 'kage', reason: 'Company name protection' },
	{ name: 'airatelimit', reason: 'Company name protection' },
	{ name: 'echos', reason: 'Company name protection' },
	{ name: 'acme', reason: 'Company name protection' },
  
  // Product names
  { name: 'chatgpt', reason: 'Product name protection' },
  { name: 'claude', reason: 'Product name protection' },
  { name: 'gemini', reason: 'Product name protection' },
  { name: 'copilot', reason: 'Product name protection' },
  
  // Tier/Plan names
  { name: 'enterprise', reason: 'Reserved for enterprise tier' },
  { name: 'premium', reason: 'Reserved for premium tier' },
  { name: 'pro', reason: 'Reserved for pro tier' },
  { name: 'business', reason: 'Reserved for business tier' },
  { name: 'starter', reason: 'Reserved for starter tier' },
  { name: 'free', reason: 'Reserved for free tier' },
  
  // Add your own below:
  // { name: 'your-company', reason: 'Your reason here' },
];

