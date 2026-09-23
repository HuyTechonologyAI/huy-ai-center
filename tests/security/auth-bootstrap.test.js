const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { isolatedDatabaseUrl } = require('../../scripts/06k-b-db-guard');

async function authObjects(client) {
  return (await client.query(`
    SELECT 'schema' AS kind, oid::text AS id, nspname AS name,
      nspowner::text AS owner, nspacl::text AS acl, NULL::text AS definition
    FROM pg_namespace WHERE nspname IN ('auth','extensions')
    UNION ALL
    SELECT 'table', oid::text, relname, relowner::text, relacl::text, NULL::text
    FROM pg_class WHERE oid = to_regclass('auth.users')
    UNION ALL
    SELECT 'function', oid::text, proname, proowner::text, proacl::text, pg_get_functiondef(oid)
    FROM pg_proc WHERE oid IN (to_regprocedure('auth.uid()'),to_regprocedure('auth.role()'))
    ORDER BY kind,name
  `)).rows;
}

test('auth bootstrap preserves existing objects and is idempotent', async () => {
  const client = new Client({ connectionString: isolatedDatabaseUrl(), connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    await client.query('BEGIN');
    const before = await authObjects(client);
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/06k-b/auth-bootstrap.sql'), 'utf8');
    await client.query(fixture);
    const first = await authObjects(client);
    assert.equal(first.length, 5, 'both schemas, users table, uid() and role() must exist');
    for (const existing of before) {
      assert.deepEqual(first.find(item => item.kind === existing.kind && item.name === existing.name), existing,
        `bootstrap changed managed ${existing.kind} ${existing.name}`);
    }
    const defaults = async () => (await client.query('SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl FROM pg_default_acl ORDER BY 1,2,3')).rows;
    const firstDefaults = await defaults();
    await client.query(fixture);
    assert.deepEqual(await authObjects(client), first);
    assert.deepEqual(await defaults(), firstDefaults);
    if (!before.some(item => item.name === 'auth')) {
      await client.query("SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-a111-111111111111',true)");
      await client.query('SET LOCAL ROLE authenticated');
      const {rows} = await client.query('SELECT auth.uid() AS uid,auth.role() AS role');
      assert.equal(rows[0].uid,'11111111-1111-4111-a111-111111111111');
      assert.equal(rows[0].role,'authenticated');
    }
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
});
