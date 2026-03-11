const BASE_URL = 'http://localhost:3001';
const SECRET = '366bbcdceecb8723e8de206c2e0cc7b5';

const endpoints = [
  {
    name: 'Bridge Intelligence',
    url: '/api/bridge/lead-intelligence',
    method: 'POST',
    data: { leadId: 'test-lead-123', strategicBrief: 'Automation Test' }
  },
  {
    name: 'Internal Ingest',
    url: '/api/leads/ingest',
    method: 'POST',
    headers: { 'x-tenant-id': 'test-tenant' },
    data: { name: 'Test Lead via Automation' }
  },
  {
    name: 'Metrics Log',
    url: '/api/admin/metrics/log',
    method: 'POST',
    data: { tenantId: 'test-tenant', type: 'TEST_METRIC', status: 'SUCCESS' }
  },
  {
    name: 'Pending Intelligence',
    url: '/api/leads/intelligence/pending',
    method: 'GET'
  }
];

async function runTests() {
  console.log('--- Starting Auth Verification Tests (Native Fetch) ---');
  
  for (const ep of endpoints) {
    console.log(`\nTesting ${ep.name} (${ep.method})...`);
    
    // Test with X-Internal-Secret
    try {
      const res = await fetch(`${BASE_URL}${ep.url}`, {
        method: ep.method,
        headers: { 
          'X-Internal-Secret': SECRET,
          'Content-Type': 'application/json',
          ...(ep.headers || {})
        },
        body: ep.method === 'POST' ? JSON.stringify(ep.data) : undefined
      });
      console.log(`[${res.status === 200 || res.status === 201 || res.status === 400 ? 'PASS' : 'FAIL'}] X-Internal-Secret: Status ${res.status}`);
      if (res.status === 500) {
        console.error('Error Body:', await res.text());
      }
    } catch (err) {
      console.error(`[ERROR] X-Internal-Secret: ${err.message}`);
    }

    // Test with WRONG Secret (should fail with 401)
    try {
      const res = await fetch(`${BASE_URL}${ep.url}`, {
        method: ep.method,
        headers: { 
          'X-Internal-Secret': 'wrong-secret',
          'Content-Type': 'application/json'
        },
        body: ep.method === 'POST' ? JSON.stringify(ep.data) : undefined
      });
      if (res.status === 401) {
        console.log(`[PASS] Wrong Secret: Correctly rejected (401)`);
      } else {
        console.error(`[FAIL] Wrong Secret: Got status ${res.status} (Expected 401)`);
        if (res.status === 500) {
          console.error('Error Body:', await res.text());
        }
      }
    } catch (err) {
      console.error(`[ERROR] Wrong Secret Check: ${err.message}`);
    }
  }

  console.log('\n--- Auth Verification Tests Completed ---');
}

runTests().catch(console.error);
