const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nqmitpyrheqqrcbkwwut:q21QqkQxvV9ktAm6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require'
});

client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL successfully!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Time from DB:', res.rows[0]);
  })
  .catch(err => {
    console.error('Connection error', err.stack);
  })
  .finally(() => {
    client.end();
  });
