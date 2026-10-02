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

async function clearData() {
  await client.connect();
  for (const schema of schemas) {
    try {
      await client.query(`DELETE FROM ${schema}.tasks`);
      console.log(`Cleared tasks for schema ${schema}`);
    } catch (e) {
      console.log(`No tasks table in ${schema}`);
    }
  }
  await client.end();
}

clearData().catch(console.error);
