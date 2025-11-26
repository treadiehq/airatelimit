/**
 * Race Condition Test Script
 * 
 * This script tests that our atomic rate limiting prevents race conditions.
 * It sends multiple concurrent requests and verifies only the allowed number succeed.
 * 
 * Usage: npx ts-node scripts/test-race-condition.ts
 * Requires: DATABASE_URL environment variable
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/ai_proxy';

// Test configuration
const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const TEST_IDENTITY = `race-test-${Date.now()}`;
const TEST_MODEL = 'gpt-4o';
const LIMIT = 5;
const CONCURRENT_REQUESTS = 20; // Send 20 requests, only 5 should succeed

async function runTest() {
  console.log('🔬 Race Condition Test\n');
  console.log(`Configuration:`);
  console.log(`  - Limit: ${LIMIT} requests`);
  console.log(`  - Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log(`  - Test identity: ${TEST_IDENTITY}\n`);

  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get today's date for period_start
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      .toISOString().split('T')[0];

    // Clean up any existing test data
    await client.query(
      `DELETE FROM usage_counters WHERE identity = $1`,
      [TEST_IDENTITY]
    );

    console.log('📊 Sending concurrent requests...\n');

    // Simulate concurrent atomic update attempts
    const atomicUpdate = async (requestNum: number): Promise<boolean> => {
      const updateClient = new Client({ connectionString: DATABASE_URL });
      await updateClient.connect();
      
      try {
        // Step 1: Ensure row exists (same as our implementation)
        await updateClient.query(
          `INSERT INTO usage_counters (id, "projectId", identity, model, "periodStart", "requestsUsed", "tokensUsed", "inputTokens", "outputTokens", "costUsd", "blockedRequests", "savedUsd", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW())
           ON CONFLICT ("projectId", identity, "periodStart", model) DO NOTHING`,
          [TEST_PROJECT_ID, TEST_IDENTITY, TEST_MODEL, periodStart]
        );

        // Step 2: Atomic UPDATE with limit check
        const result = await updateClient.query(
          `UPDATE usage_counters
           SET 
             "requestsUsed" = "requestsUsed" + 1,
             "updatedAt" = NOW()
           WHERE 
             "projectId" = $1
             AND identity = $2
             AND model = $3
             AND "periodStart" = $4
             AND "requestsUsed" < $5
           RETURNING *`,
          [TEST_PROJECT_ID, TEST_IDENTITY, TEST_MODEL, periodStart, LIMIT]
        );

        const allowed = result.rowCount > 0;
        return allowed;
      } finally {
        await updateClient.end();
      }
    };

    // Fire all requests simultaneously
    const startTime = Date.now();
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => atomicUpdate(i + 1))
    );
    const duration = Date.now() - startTime;

    // Count results
    const allowed = results.filter(r => r).length;
    const blocked = results.filter(r => !r).length;

    // Get final count from database
    const finalCount = await client.query(
      `SELECT "requestsUsed" FROM usage_counters WHERE identity = $1`,
      [TEST_IDENTITY]
    );
    const actualCount = finalCount.rows[0]?.requestsUsed || 0;

    console.log('📈 Results:');
    console.log(`  - Requests allowed: ${allowed}`);
    console.log(`  - Requests blocked: ${blocked}`);
    console.log(`  - Final counter value: ${actualCount}`);
    console.log(`  - Duration: ${duration}ms\n`);

    // Verify correctness
    const passed = allowed === LIMIT && actualCount === LIMIT;
    
    if (passed) {
      console.log('✅ TEST PASSED!');
      console.log(`   Exactly ${LIMIT} requests were allowed out of ${CONCURRENT_REQUESTS}.`);
      console.log('   Race condition is PREVENTED. 🔒\n');
    } else {
      console.log('❌ TEST FAILED!');
      console.log(`   Expected ${LIMIT} allowed, got ${allowed}.`);
      console.log(`   Expected counter = ${LIMIT}, got ${actualCount}.`);
      console.log('   Race condition may still exist!\n');
    }

    // Cleanup
    await client.query(
      `DELETE FROM usage_counters WHERE identity = $1`,
      [TEST_IDENTITY]
    );
    console.log('🧹 Cleaned up test data.\n');

    return passed;
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Run test
runTest()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

