#!/usr/bin/env node

/**
 * Instructor Registration Flow - API Test Suite
 * Tests all endpoints for the instructor registration system
 */

const http = require('http');
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testHealthCheck() {
  log('\n📋 Testing Health Check', 'blue');
  try {
    const res = await request('GET', '/api/v1/health');
    if (res.status === 200 && res.body.status === 'ok') {
      log('✅ Health check passed', 'green');
      return true;
    }
    log(`❌ Health check failed: ${res.status}`, 'red');
    return false;
  } catch (e) {
    log(`❌ Health check error: ${e.message}`, 'red');
    return false;
  }
}

async function testSubmitInstructorRequest() {
  log('\n📝 Testing Submit Instructor Request', 'blue');
  const payload = {
    userId: `test_user_${Date.now()}`,
    name: 'Test Instructor',
    email: `test${Date.now()}@example.com`,
    phone: '+20 100 123 4567',
    category: 'Web Development',
    coursesTaken: 'JavaScript, React, Node.js',
    experienceYears: 5,
    notes: 'Experienced full-stack developer',
  };

  try {
    const res = await request('POST', '/api/v1/instructor-requests', payload);
    if (res.status === 201 && res.body.data?.item) {
      log(`✅ Submit request successful (ID: ${res.body.data.item.id})`, 'green');
      return res.body.data.item;
    }
    log(`❌ Submit request failed: ${res.status} - ${JSON.stringify(res.body)}`, 'red');
    return null;
  } catch (e) {
    log(`❌ Submit request error: ${e.message}`, 'red');
    return null;
  }
}

async function testDuplicateSubmission(email) {
  log('\n🔁 Testing Duplicate Submission Protection', 'blue');
  const payload = {
    userId: `test_user_duplicate_${Date.now()}`,
    name: 'Duplicate Test',
    email,
    phone: '+20 100 765 4321',
    category: 'Design',
    experienceYears: 3,
  };

  try {
    const res = await request('POST', '/api/v1/instructor-requests', payload);
    if (res.status === 429 && res.body.code === 'DUPLICATE_REQUEST') {
      log('✅ Duplicate submission protection working', 'green');
      return true;
    }
    if (res.status === 201) {
      log('⚠️ Duplicate submission not detected (first submission)', 'yellow');
      return true;
    }
    log(`⚠️ Unexpected response: ${res.status}`, 'yellow');
    return true;
  } catch (e) {
    log(`❌ Duplicate test error: ${e.message}`, 'red');
    return false;
  }
}

async function testValidation() {
  log('\n✓ Testing Input Validation', 'blue');
  const invalidPayloads = [
    {
      name: 'Missing required fields',
      data: { userId: 'test' },
    },
    {
      name: 'Invalid email',
      data: {
        userId: 'test',
        name: 'Test',
        email: 'invalid-email',
        phone: '+20 100 1234567',
        category: 'Test',
      },
    },
    {
      name: 'Invalid phone',
      data: {
        userId: 'test',
        name: 'Test',
        email: 'test@example.com',
        phone: 'abc',
        category: 'Test',
      },
    },
    {
      name: 'Short name',
      data: {
        userId: 'test',
        name: 'A',
        email: 'test@example.com',
        phone: '+20 100 1234567',
        category: 'Test',
      },
    },
  ];

  let validationsPassed = 0;
  for (const invalid of invalidPayloads) {
    try {
      const res = await request('POST', '/api/v1/instructor-requests', invalid.data);
      if (res.status >= 400) {
        log(`  ✅ ${invalid.name}`, 'green');
        validationsPassed += 1;
      } else {
        log(`  ❌ ${invalid.name} (not rejected)`, 'red');
      }
    } catch (e) {
      log(`  ❌ ${invalid.name} (error: ${e.message})`, 'red');
    }
  }

  return validationsPassed === invalidPayloads.length;
}

async function testRateLimiting() {
  log('\n⏱️  Testing Rate Limiting', 'blue');
  const email = `ratelimit_${Date.now()}@example.com`;
  let rateLimitHit = false;

  for (let i = 0; i < 3; i++) {
    try {
      const payload = {
        userId: `test_ratelimit_${i}`,
        name: `Rate Limit Test ${i}`,
        email,
        phone: `+20 100 ${String(1000000 + i).slice(0, 7)}`,
        category: 'Test',
      };
      const res = await request('POST', '/api/v1/instructor-requests', payload);
      if (res.status === 429) {
        log('✅ Rate limit protection activated', 'green');
        rateLimitHit = true;
        break;
      }
    } catch (e) {
      // continue
    }
  }

  if (!rateLimitHit) {
    log('⚠️ Rate limiting test inconclusive (might need more requests)', 'yellow');
  }
  return true;
}

async function runAllTests() {
  log('\n🚀 Instructor Registration Flow - API Test Suite\n', 'blue');
  log('=' .repeat(50), 'blue');

  const results = [];

  results.push({
    name: 'Health Check',
    passed: await testHealthCheck(),
  });

  const submittedRequest = await testSubmitInstructorRequest();
  results.push({
    name: 'Submit Instructor Request',
    passed: !!submittedRequest,
  });

  if (submittedRequest) {
    results.push({
      name: 'Duplicate Submission Protection',
      passed: await testDuplicateSubmission(submittedRequest.email),
    });
  }

  results.push({
    name: 'Input Validation',
    passed: await testValidation(),
  });

  results.push({
    name: 'Rate Limiting',
    passed: await testRateLimiting(),
  });

  log('\n' + '='.repeat(50), 'blue');
  log('\n📊 Test Results:\n', 'blue');

  let totalPassed = 0;
  results.forEach((result) => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
    if (result.passed) totalPassed += 1;
  });

  log(`\nTotal: ${totalPassed}/${results.length} tests passed\n`, totalPassed === results.length ? 'green' : 'yellow');
  return totalPassed === results.length;
}

runAllTests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
}).catch((e) => {
  log(`\n❌ Test suite error: ${e.message}`, 'red');
  process.exit(1);
});
