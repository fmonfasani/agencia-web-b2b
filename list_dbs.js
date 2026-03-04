const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres:%23Karaoke27570Echeverria@134.209.41.51:5432/postgres?sslmode=disable'
});

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.log('DATABASES:', res.rows.map(r => r.datname));
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await client.end();
    }
}

main();
