const BASE_URL = 'http://localhost:3001';
const SECRET = '366bbcdceecb8723e8de206c2e0cc7b5';

async function testSingle() {
  const url = `${BASE_URL}/api/leads/intelligence/pending`;
  console.log(`Testing ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-Internal-Secret': SECRET }
    });
    console.log(`Status: ${res.status}`);
    const body = await res.text();
    console.log(`Body (first 100 chars): ${body.substring(0, 100)}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

testSingle();
