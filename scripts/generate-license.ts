#!/usr/bin/env npx ts-node
/**
 * Enterprise License Key Generator
 * 
 * ⚠️  THIS SCRIPT SHOULD NEVER BE COMMITTED WITH A REAL PRIVATE KEY
 * ⚠️  KEEP YOUR PRIVATE KEY FILE SEPARATE AND SECURE
 * 
 * SETUP (one-time):
 *   1. Generate your RSA key pair:
 *      openssl genrsa -out license-private.pem 2048
 *      openssl rsa -in license-private.pem -pubout -out license-public.pem
 * 
 *   2. Copy the PUBLIC key contents into src/config/license.ts
 *      (this goes in the codebase - it's safe to share)
 * 
 *   3. Store the PRIVATE key file securely (NOT in the repo!)
 *      - Keep it on your local machine
 *      - Or in a secure password manager
 *      - Or in a hardware security module
 * 
 * USAGE:
 *   npx ts-node scripts/generate-license.ts \
 *     --org "Acme Corp" \
 *     --seats 50 \
 *     --expires "2026-01-01" \
 *     --private-key ./license-private.pem
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface LicenseData {
  org: string;
  seats: number;
  expiresAt: string;
  features: string[];
  issuedAt: string;
  licenseId: string;
}

function generateLicenseKey(data: LicenseData, privateKeyPem: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(data)).toString('base64');
  
  // Sign with RSA private key
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(payloadB64);
  const signature = signer.sign(privateKeyPem, 'base64');
  
  return `${payloadB64}.${signature}`;
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2).replace(/-/g, '_'); // --private-key -> private_key
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        result[key] = value;
        i++;
      }
    }
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  // Check for help or generate-keys command
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  if (process.argv.includes('--generate-keys')) {
    generateKeyPair();
    process.exit(0);
  }
  
  if (!args.org || !args.private_key) {
    printUsage();
    process.exit(1);
  }

  // Load private key
  let privateKeyPem: string;
  try {
    const keyPath = path.resolve(args.private_key);
    privateKeyPem = fs.readFileSync(keyPath, 'utf8');
  } catch (error) {
    console.error(`\n❌ Error: Could not read private key file: ${args.private_key}`);
    console.error(`   Make sure the file exists and is readable.\n`);
    console.error(`   Generate a key pair with: npx ts-node scripts/generate-license.ts --generate-keys\n`);
    process.exit(1);
  }

  // Default expiration: 1 year from now
  const defaultExpires = new Date();
  defaultExpires.setFullYear(defaultExpires.getFullYear() + 1);

  const licenseData: LicenseData = {
    org: args.org,
    seats: args.seats ? parseInt(args.seats, 10) : 999999,
    expiresAt: args.expires || defaultExpires.toISOString().split('T')[0],
    features: args.features ? args.features.split(',') : ['all'],
    issuedAt: new Date().toISOString(),
    licenseId: crypto.randomBytes(8).toString('hex'),
  };

  const licenseKey = generateLicenseKey(licenseData, privateKeyPem);

  console.log('\n✅ License Key Generated!\n');
  console.log('═'.repeat(70));
  console.log('\nLicense Details:');
  console.log(`  Organization: ${licenseData.org}`);
  console.log(`  Seats:        ${licenseData.seats}`);
  console.log(`  Expires:      ${licenseData.expiresAt}`);
  console.log(`  Features:     ${licenseData.features.join(', ')}`);
  console.log(`  License ID:   ${licenseData.licenseId}`);
  console.log(`  Issued:       ${licenseData.issuedAt}`);
  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 License Key (give this to the customer):\n');
  console.log(`ENTERPRISE_LICENSE_KEY=${licenseKey}`);
  console.log('\n' + '═'.repeat(70));
  console.log('\n📝 Customer Instructions:');
  console.log('   1. Add the license key to their .env file');
  console.log('   2. Set DEPLOYMENT_MODE=enterprise');
  console.log('   3. Restart their server');
  console.log('');
}

function printUsage() {
  console.log(`
Enterprise License Key Generator

FIRST TIME SETUP:
  Generate your RSA key pair (do this once):
  
  npx ts-node scripts/generate-license.ts --generate-keys

GENERATE A LICENSE:
  npx ts-node scripts/generate-license.ts \\
    --org "Company Name" \\
    --private-key ./license-private.pem \\
    --seats 50 \\
    --expires "2026-01-01"

OPTIONS:
  --org           Organization name (required)
  --private-key   Path to your RSA private key file (required)
  --seats         Number of seats/users (default: unlimited)
  --expires       Expiration date YYYY-MM-DD (default: 1 year from now)
  --features      Comma-separated features (default: all)
  --generate-keys Generate a new RSA key pair

SECURITY:
  ⚠️  NEVER commit your private key file to the repository!
  ⚠️  Store it securely (password manager, HSM, or encrypted drive)
  ✅  The public key goes in src/config/license.ts (safe to commit)
`);
}

function generateKeyPair() {
  console.log('\n🔐 Generating RSA Key Pair...\n');
  
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  
  // Save private key
  const privateKeyPath = './license-private.pem';
  fs.writeFileSync(privateKeyPath, privateKey);
  console.log(`✅ Private key saved to: ${privateKeyPath}`);
  console.log('   ⚠️  KEEP THIS FILE SECURE! Do NOT commit it to git!');
  
  // Save public key
  const publicKeyPath = './license-public.pem';
  fs.writeFileSync(publicKeyPath, publicKey);
  console.log(`\n✅ Public key saved to: ${publicKeyPath}`);
  
  // Add to gitignore
  const gitignorePath = './.gitignore';
  try {
    let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
    if (!gitignore.includes('license-private.pem')) {
      gitignore += '\n# License private key - NEVER commit this!\nlicense-private.pem\n';
      fs.writeFileSync(gitignorePath, gitignore);
      console.log('\n✅ Added license-private.pem to .gitignore');
    }
  } catch (e) {
    console.log('\n⚠️  Could not update .gitignore - please add license-private.pem manually!');
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 Next Steps:');
  console.log('\n1. Copy this PUBLIC key into src/config/license.ts:');
  console.log('   (Replace the REPLACE_WITH_YOUR_PUBLIC_KEY placeholder)\n');
  console.log(publicKey);
  console.log('2. Store the private key file securely (NOT in git!)');
  console.log('\n3. Generate licenses with:');
  console.log('   npx ts-node scripts/generate-license.ts --org "Customer" --private-key ./license-private.pem');
  console.log('');
}

main();

