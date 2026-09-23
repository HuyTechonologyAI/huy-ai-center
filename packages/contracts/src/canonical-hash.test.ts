import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSha256, canonicalizeJson } from './canonical-hash.js';

const card = {
  risk: { ceiling: 1 },
  runtime: { model: 'local', temperature: 0 },
  tools: [{ name: 'search', access: { write: false } }],
};
test('recursive semantic key order preserves hash', () => {
  assert.equal(canonicalSha256(card), canonicalSha256({
    tools: [{ access: { write: false }, name: 'search' }],
    runtime: { temperature: 0, model: 'local' }, risk: { ceiling: 1 },
  }));
});
for (const field of ['risk', 'runtime', 'tools'] as const) {
  test(`nested Agent Card ${field} tamper changes hash`, () => {
    const changed = structuredClone(card);
    if (field === 'risk') changed.risk.ceiling = 4;
    if (field === 'runtime') changed.runtime.model = 'external';
    if (field === 'tools') changed.tools[0].access.write = true;
    assert.notEqual(canonicalSha256(card), canonicalSha256(changed));
  });
}
test('arrays retain order and scalar types remain distinct', () => {
  assert.notEqual(canonicalSha256([1, 2]), canonicalSha256([2, 1]));
  assert.equal(canonicalizeJson({ z: [null, false, 0, '0'] }), '{"z":[null,false,0,"0"]}');
});
test('non-JSON signed values fail closed', () => {
  for (const value of [undefined, NaN, Infinity, new Date(), { field: undefined }, [undefined]]) {
    assert.throws(() => canonicalSha256(value), TypeError);
  }
});
