/**
 * StreamSync — Breaking-Point Load Test
 *
 * Ramps concurrency upward in steps until degradation is detected:
 *   - Failure rate > 0%
 *   - p95 latency > threshold
 *   - Throughput plateau / decline
 *
 * How to run:
 * 1. Ensure your backend server is running locally.
 * 2. Ensure guest users are seeded (`node seed-guests.js` in backend).
 * 3. Run: `node benchmarks/loadtest.js`
 *
 * Note: Authenticates as a seeded guest user via the login endpoint.
 * No hardcoded secrets are used or needed in this script.
 */
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const HOST = 'localhost';
const PORT = process.env.PORT || 5001;

// Concurrency ladder — we climb until something breaks
const CONCURRENCY_STEPS = [10, 25, 50, 100, 150, 200];
const REQUESTS_PER_STEP = 300; // enough to stabilize percentiles

// p95 thresholds (ms) — tuned per endpoint type
const THRESHOLDS = {
  'GET /api/auth/me': 500,                // lightweight: JWT verify + findById
  'GET /api/users': 1000,                 // complex query with $and filter
  'GET /api/users/friend-requests': 1000, // 2x populated queries
};

let jwtCookie = null;

// ── HTTP request helper ──
function makeRequest(method, path, body, cookie) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      },
    };
    if (cookie) options.headers['Cookie'] = cookie;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) { /* ignore */ }
        resolve({
          latency: elapsed,
          statusCode: res.statusCode,
          body: parsed,
          rawHeaders: res.rawHeaders,
        });
      });
    });

    req.on('error', (e) => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      resolve({ latency: elapsed, statusCode: 0, error: e.message, body: null });
    });

    // 10s timeout per request to avoid infinite hangs
    req.setTimeout(10000, () => {
      req.destroy(new Error('timeout'));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Authenticate and grab JWT ──
async function authenticate() {
  console.log('🔑 Authenticating as guest1@streamsync.com ...');
  const result = await makeRequest('POST', '/api/auth/login', {
    email: 'guest1@streamsync.com',
    password: 'guest123',
  });

  if (result.statusCode >= 200 && result.statusCode < 300) {
    const raw = result.rawHeaders;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].toLowerCase() === 'set-cookie') {
        const m = raw[i + 1].match(/jwt=([^;]+)/);
        if (m) { jwtCookie = `jwt=${m[1]}`; break; }
      }
    }
    if (jwtCookie) {
      console.log('   ✅ JWT obtained.\n');
      return true;
    }
  }
  console.log(`   ❌ Login failed: HTTP ${result.statusCode}`);
  return false;
}

// ── Run one concurrency step ──
async function runStep(method, path, concurrency, totalRequests) {
  const latencies = [];
  let successful = 0;
  let failed = 0;
  const statusCodes = {};

  const start = process.hrtime.bigint();
  const queue = Array.from({ length: totalRequests }, (_, i) => i);

  async function worker() {
    while (queue.length > 0) {
      queue.shift();
      const r = await makeRequest(method, path, null, jwtCookie);
      const code = r.statusCode;
      statusCodes[code] = (statusCodes[code] || 0) + 1;
      if (code >= 200 && code < 300) successful++;
      else failed++;
      latencies.push(r.latency);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const totalTimeSec = Number(process.hrtime.bigint() - start) / 1e9;
  latencies.sort((a, b) => a - b);

  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const throughput = totalRequests / totalTimeSec;
  const failRate = (failed / totalRequests) * 100;

  return {
    concurrency,
    totalRequests,
    successful,
    failed,
    failRate,
    throughput,
    avg,
    p50,
    p95,
    p99,
    min: latencies[0],
    max: latencies[latencies.length - 1],
    statusCodes,
  };
}

// ── Format number for table display ──
function fmt(n, decimals = 1) {
  return n.toFixed(decimals);
}

function pad(str, len) {
  str = String(str);
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padL(str, len) {
  str = String(str);
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

// ── Main ──
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   StreamSync — Breaking-Point Load Test                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const ok = await authenticate();
  if (!ok) {
    console.log('Cannot proceed. Ensure guest users are seeded (node seed-guests.js).');
    process.exit(1);
  }

  const endpoints = [
    {
      label: 'GET /api/auth/me',
      note: 'Auth check — JWT verify + User.findById via middleware',
      db: 'Remote (MongoDB Atlas free-tier)',
      method: 'GET',
      path: '/api/auth/me',
    },
    {
      label: 'GET /api/users',
      note: 'Recommended users — User.find with complex $and filter',
      db: 'Remote (MongoDB Atlas free-tier)',
      method: 'GET',
      path: '/api/users',
    },
    {
      label: 'GET /api/users/friend-requests',
      note: 'Friend requests — 2x FriendRequest.find().populate()',
      db: 'Remote (MongoDB Atlas free-tier)',
      method: 'GET',
      path: '/api/users/friend-requests',
    },
  ];

  const allEndpointResults = [];

  for (const ep of endpoints) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Endpoint:  ${ep.label}`);
    console.log(`Detail:    ${ep.note}`);
    console.log(`Database:  ${ep.db}`);
    console.log(`Threshold: p95 < ${THRESHOLDS[ep.label]}ms, fail rate = 0%`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const threshold = THRESHOLDS[ep.label];
    const steps = [];
    let ceilingConcurrency = null;
    let ceilingReason = null;
    let prevThroughput = 0;
    let throughputDeclineCount = 0;

    for (const c of CONCURRENCY_STEPS) {
      process.stdout.write(`  ⏱  Concurrency ${String(c).padStart(3)} ... `);
      const result = await runStep(ep.method, ep.path, c, REQUESTS_PER_STEP);
      steps.push(result);

      const degraded = [];
      if (result.failRate > 0) degraded.push(`fail rate ${fmt(result.failRate)}%`);
      if (result.p95 > threshold) degraded.push(`p95 ${fmt(result.p95)}ms > ${threshold}ms`);
      if (prevThroughput > 0 && result.throughput < prevThroughput * 0.95) {
        throughputDeclineCount++;
        if (throughputDeclineCount >= 1) {
          degraded.push(`throughput declined ${fmt(prevThroughput)} → ${fmt(result.throughput)} req/s`);
        }
      } else {
        throughputDeclineCount = 0;
      }

      if (degraded.length > 0 && !ceilingConcurrency) {
        ceilingConcurrency = c;
        ceilingReason = degraded.join('; ');
      }

      console.log(
        `${fmt(result.throughput)} req/s | avg=${fmt(result.avg)}ms p95=${fmt(result.p95)}ms p99=${fmt(result.p99)}ms | fail=${fmt(result.failRate)}%` +
        (degraded.length > 0 ? `  ⚠ ${degraded.join(', ')}` : '  ✓')
      );

      prevThroughput = result.throughput;
    }

    allEndpointResults.push({ ep, steps, ceilingConcurrency, ceilingReason });
    console.log('');
  }

  // ── Print full tables ──
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   FULL RESULTS TABLES                                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝');

  for (const { ep, steps, ceilingConcurrency, ceilingReason } of allEndpointResults) {
    console.log(`\n┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐`);
    console.log(`│ ${pad(ep.label, 95)} │`);
    console.log(`│ ${pad('DB: ' + ep.db + '  |  ' + ep.note, 95)} │`);
    console.log(`├───────────┬────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┤`);
    console.log(`│ Concurr.  │ Throughput │ Avg (ms) │ p50 (ms) │ p95 (ms) │ p99 (ms) │ Max (ms) │ Fail Rate │`);
    console.log(`├───────────┼────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤`);

    for (const s of steps) {
      const marker = (ceilingConcurrency && s.concurrency >= ceilingConcurrency) ? ' ⚠' : '  ';
      console.log(
        `│ ${padL(String(s.concurrency), 7)}${marker} │ ` +
        `${padL(fmt(s.throughput), 8)} /s │ ` +
        `${padL(fmt(s.avg), 8)} │ ` +
        `${padL(fmt(s.p50), 8)} │ ` +
        `${padL(fmt(s.p95), 8)} │ ` +
        `${padL(fmt(s.p99), 8)} │ ` +
        `${padL(fmt(s.max), 8)} │ ` +
        `${padL(fmt(s.failRate) + '%', 9)} │`
      );
    }

    console.log(`└───────────┴────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────────┘`);

    if (ceilingConcurrency) {
      console.log(`  ➤ CEILING: This endpoint handled up to ${ceilingConcurrency} concurrent users before degradation: ${ceilingReason}`);
    } else {
      console.log(`  ➤ CEILING: This endpoint did not degrade within the tested range (max ${CONCURRENCY_STEPS[CONCURRENCY_STEPS.length - 1]} concurrent).`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('Test complete. All numbers reported as measured — no rounding in the server\'s favor.');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
