const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
const DB_HOST = 'db.bdeluacbzbdflxubhpha.supabase.co';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_NAME = 'postgres';

const MIGRATIONS = [
  '20260920000001_ai_operations.sql',
  '20260920000002_infrastructure.sql',
  '20260920000003_ai_registry.sql',
  '20260920000004_github_radar.sql',
  '20260920000005_queue_and_governance.sql'
];

async function run() {
  if (!DB_PASSWORD && !process.env.DATABASE_URL) {
    console.error('❌ Error: Neither SUPABASE_DB_PASSWORD nor DATABASE_URL environment variable is set.');
    console.log('Usage:');
    console.log('  $env:SUPABASE_DB_PASSWORD="your-db-password"; node scripts/apply_migrations.js');
    console.log('Or apply directly via Supabase Dashboard SQL Editor using:');
    console.log('  supabase/migrations/deploy_phase_06e_complete.sql');
    process.exit(1);
  }

  const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        ssl: { rejectUnauthorized: false }
      };

  const client = new Client(connectionConfig);

  try {
    console.log(`Connecting to ${DB_HOST}...`);
    await client.connect();
    console.log('✅ Connected successfully to Supabase PostgreSQL.\n');

    for (let i = 0; i < MIGRATIONS.length; i++) {
      const fileName = MIGRATIONS[i];
      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', fileName);
      console.log(`[${i + 1}/${MIGRATIONS.length}] Applying migration: ${fileName}...`);
      
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`✅ Migration ${fileName} applied successfully.\n`);
    }

    console.log('🎉 All 5 migrations applied sequentially with 100% success!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
