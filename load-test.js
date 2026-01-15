/**
 * Load Test Script - Queue System
 * Tests 10 concurrent users hitting the scrape API
 * Monitors queue behavior, response times, and memory usage
 */

const NUM_USERS = 10;
const API_URL = 'http://localhost:3000/api/scrape';

// Test credentials (you'll need to replace with valid test data)
const TEST_USERS = Array.from({ length: NUM_USERS }, (_, i) => ({
  prn: `TEST${String(i + 1).padStart(4, '0')}`,
  dob: '01-01-2000'
}));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Track results
const results = {
  total: 0,
  success: 0,
  queued: 0,
  errors: 0,
  timeouts: 0,
  times: [],
  queuePositions: new Map()
};

async function makeRequest(user, index) {
  const startTime = Date.now();
  const userLabel = `User ${index + 1}`;
  
  console.log(`${colors.blue}[${userLabel}]${colors.reset} Starting request...`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let wasQueued = false;
    let maxPosition = 0;
    let progressMessages = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.replace('data: ', ''));
          
          if (data.type === 'progress') {
            progressMessages.push(data.message);
            
            // Check if queued
            if (data.message.includes('Queue position')) {
              wasQueued = true;
              const match = data.message.match(/#(\d+)/);
              if (match) {
                const position = parseInt(match[1]);
                maxPosition = Math.max(maxPosition, position);
                console.log(`${colors.yellow}[${userLabel}]${colors.reset} ${data.message}`);
              }
            } else {
              console.log(`${colors.gray}[${userLabel}]${colors.reset} ${data.message}`);
            }
          } else if (data.type === 'result') {
            const elapsed = Date.now() - startTime;
            results.success++;
            results.times.push(elapsed);
            
            if (wasQueued) {
              results.queued++;
              results.queuePositions.set(userLabel, maxPosition);
            }
            
            console.log(
              `${colors.green}[${userLabel}] ✓ SUCCESS${colors.reset} ` +
              `(${(elapsed / 1000).toFixed(1)}s)` +
              (wasQueued ? ` - Was in queue at position #${maxPosition}` : ' - Processed immediately')
            );
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        } catch (parseError) {
          // Ignore incomplete JSON chunks
          if (!(parseError instanceof SyntaxError)) {
            throw parseError;
          }
        }
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    results.errors++;
    
    if (error.message.includes('timeout') || error.message.includes('queue timeout')) {
      results.timeouts++;
      console.log(`${colors.red}[${userLabel}] ✗ TIMEOUT${colors.reset} after ${(elapsed / 1000).toFixed(1)}s`);
    } else {
      console.log(`${colors.red}[${userLabel}] ✗ ERROR: ${error.message}${colors.reset}`);
    }
  }
  
  results.total++;
}

async function runLoadTest() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}Queue System Load Test - ${NUM_USERS} Concurrent Users${colors.reset}`);
  console.log('='.repeat(60) + '\n');
  
  console.log(`${colors.blue}Configuration:${colors.reset}`);
  console.log(`  - MAX_CONCURRENT: 2 (from route.ts)`);
  console.log(`  - MAX_QUEUE: 10`);
  console.log(`  - Test users: ${NUM_USERS}`);
  console.log(`  - Expected: 2 immediate, 8 queued\n`);
  
  const overallStart = Date.now();
  
  // Launch all requests simultaneously
  console.log(`${colors.cyan}Launching ${NUM_USERS} concurrent requests...${colors.reset}\n`);
  
  const promises = TEST_USERS.map((user, index) => makeRequest(user, index));
  await Promise.all(promises);
  
  const overallElapsed = Date.now() - overallStart;
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}Test Results Summary${colors.reset}`);
  console.log('='.repeat(60) + '\n');
  
  console.log(`${colors.blue}Overall:${colors.reset}`);
  console.log(`  Total requests: ${results.total}`);
  console.log(`  ${colors.green}✓ Successful: ${results.success}${colors.reset}`);
  console.log(`  ${colors.red}✗ Errors: ${results.errors}${colors.reset}`);
  console.log(`  ${colors.red}⏱ Timeouts: ${results.timeouts}${colors.reset}`);
  console.log(`  Total time: ${(overallElapsed / 1000).toFixed(1)}s\n`);
  
  console.log(`${colors.blue}Queue Behavior:${colors.reset}`);
  console.log(`  Users queued: ${results.queued}`);
  console.log(`  Users processed immediately: ${results.success - results.queued}`);
  
  if (results.queuePositions.size > 0) {
    console.log(`\n  Queue positions:`);
    for (const [user, position] of results.queuePositions.entries()) {
      console.log(`    ${user}: #${position}`);
    }
  }
  
  if (results.times.length > 0) {
    const avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;
    const minTime = Math.min(...results.times);
    const maxTime = Math.max(...results.times);
    
    console.log(`\n${colors.blue}Response Times:${colors.reset}`);
    console.log(`  Average: ${(avgTime / 1000).toFixed(1)}s`);
    console.log(`  Min: ${(minTime / 1000).toFixed(1)}s`);
    console.log(`  Max: ${(maxTime / 1000).toFixed(1)}s`);
  }
  
  // Success criteria
  console.log(`\n${colors.blue}Success Criteria Check:${colors.reset}`);
  const checks = [
    { name: 'All requests processed', pass: results.total === NUM_USERS },
    { name: 'No timeouts', pass: results.timeouts === 0 },
    { name: 'No errors', pass: results.errors === 0 },
    { name: '2 users immediate, 8 queued', pass: (results.success - results.queued) === 2 && results.queued === 8 }
  ];
  
  checks.forEach(check => {
    const icon = check.pass ? '✓' : '✗';
    const color = check.pass ? colors.green : colors.red;
    console.log(`  ${color}${icon} ${check.name}${colors.reset}`);
  });
  
  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? colors.green : colors.red}Overall: ${allPassed ? 'PASSED ✓' : 'FAILED ✗'}${colors.reset}\n`);
}

// Run the test
runLoadTest().catch(error => {
  console.error(`${colors.red}Test failed with error:${colors.reset}`, error);
  process.exit(1);
});
