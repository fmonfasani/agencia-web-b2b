import { BridgeClient } from '../src/lib/bridge-client.ts';
import 'dotenv/config';

async function main() {
  console.log('Testing connection via Secure API Bridge...');
  console.log(`Bridge URL: ${process.env.BRIDGE_URL}`);

  try {
    // Intentamos un conteo simple de usuarios a través del bridge
    const userCount = await BridgeClient.query('user', 'count', {});
    console.log('✅ Bridge connection successful!');
    console.log(`User count: ${userCount}`);
  } catch (error) {
    console.error('❌ Bridge connection failed!');
    console.error(error.message);
    
    if (error.message.includes('Unauthorized')) {
        console.log('\nTIP: Check if BRIDGE_API_KEY is correct in both local .env and VPS .env');
    }
  }
}

main();
