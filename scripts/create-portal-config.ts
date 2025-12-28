#!/usr/bin/env ts-node
/**
 * Create a Stripe Customer Portal Configuration
 * 
 * This script creates a custom-branded portal configuration for your product.
 * Run it once per product, then save the configuration ID in your environment.
 * 
 * Usage:
 *   npx ts-node scripts/create-portal-config.ts
 * 
 * Or add to package.json scripts:
 *   "stripe:create-portal-config": "ts-node scripts/create-portal-config.ts"
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  console.error('   Make sure you have a .env file with your Stripe secret key');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function main() {
  console.log('\n🎨 Stripe Customer Portal Configuration Creator\n');
  console.log('This will create a custom-branded portal for your product.\n');

  // Get configuration details
  const businessName = await question('Business/Product name (e.g., "AI Ratelimit"): ');
  const headline = await question('Portal headline (leave empty for default): ');
  const privacyUrl = await question('Privacy Policy URL (optional): ');
  const termsUrl = await question('Terms of Service URL (optional): ');

  console.log('\n⏳ Creating portal configuration...\n');

  try {
    const config = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: headline || `Manage your ${businessName} subscription`,
        privacy_policy_url: privacyUrl || undefined,
        terms_of_service_url: termsUrl || undefined,
      },
      features: {
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          proration_behavior: 'none',
        },
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'name'],
        },
      },
    });

    console.log('✅ Portal configuration created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Configuration ID: ${config.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Add this to your environment variables:\n');
    console.log(`  STRIPE_PORTAL_CONFIG_ID=${config.id}\n`);
    console.log('You can also customize colors and logo in the Stripe Dashboard:');
    console.log('  https://dashboard.stripe.com/settings/billing/portal\n');

  } catch (error: any) {
    console.error('❌ Failed to create portal configuration:', error.message);
    process.exit(1);
  }

  rl.close();
}

// List existing configurations
async function listConfigs() {
  const configs = await stripe.billingPortal.configurations.list({ limit: 10 });
  
  if (configs.data.length === 0) {
    console.log('No existing portal configurations found.\n');
    return;
  }

  console.log('📋 Existing portal configurations:\n');
  for (const config of configs.data) {
    console.log(`  • ${config.id}`);
    console.log(`    Headline: ${config.business_profile.headline || '(default)'}`);
    console.log(`    Active: ${config.active}`);
    console.log(`    Default: ${config.is_default}`);
    console.log('');
  }
}

// Check for --list flag
if (process.argv.includes('--list')) {
  listConfigs().then(() => process.exit(0));
} else {
  main();
}

