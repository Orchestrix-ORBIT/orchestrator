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
      await client.query(`DELETE FROM ${schema}.resource_bookings`);
      console.log(`Cleared resource_bookings for schema ${schema}`);
    } catch (e) {
      console.log(`No resource_bookings table in ${schema}`);
    }
    try {
      await client.query(`DELETE FROM ${schema}.bookings`);
      console.log(`Cleared bookings for schema ${schema}`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM ${schema}.notifications`);
      console.log(`Cleared notifications for schema ${schema}`);
    } catch (e) { }
  }
  await client.end();
}

clearData().catch(console.error);
