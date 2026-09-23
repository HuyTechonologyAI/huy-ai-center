const { Client } = require('pg');

async function main() {
  const rootClient = new Client({
    connectionString: process.env.ROOT_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await rootClient.connect();
  // Terminate any active connections to phase06kb_test
  await rootClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'phase06kb_test' AND pid <> pg_backend_pid();
  `);
  await rootClient.query('DROP DATABASE IF EXISTS phase06kb_test;');
  await rootClient.query('CREATE DATABASE phase06kb_test;');
  console.log('✅ Clean disposable phase06kb_test database recreated successfully.');
  await rootClient.end();
}

main().catch(err => {
  console.error('Failed to recreate test database:', err.message);
  process.exit(1);
});
