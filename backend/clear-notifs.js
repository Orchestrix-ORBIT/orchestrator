const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nqmitpyrheqqrcbkwwut',
  password: 'q21QqkQxvV9ktAm6',
  ssl: { rejectUnauthorized: false }
});

const schemas = ['org_acme', 'org_techcorp', 'org_orbit', 'org_myorg'];

async function clearNotifications() {
  await client.connect();
  for (const schema of schemas) {
    try {
      await client.query(`DELETE FROM ${schema}.notifications`);
      console.log(`Cleared notifications for schema ${schema}`);
    } catch (e) {
      console.log(`Could not clear ${schema} or it does not exist:`, e.message);
    }
  }
  await client.end();
}

clearNotifications().catch(console.error);
