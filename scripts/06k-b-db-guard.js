'use strict';

// Integration scripts must never accept a hosted DB or the local app database.
function isolatedDatabaseUrl(value = process.env.TEST_DATABASE_URL) {
  const url = new URL(value || 'postgresql://postgres:postgres@127.0.0.1:54322/phase06kb_test');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      !/^\/phase06kb_test(?:_[a-z0-9_]+)?$/.test(url.pathname) || url.search || url.hash) {
    throw new Error('06K_B_ISOLATION_REQUIRED: loopback /phase06kb_test without URL options required');
  }
  return url.toString();
}

module.exports = { isolatedDatabaseUrl };
