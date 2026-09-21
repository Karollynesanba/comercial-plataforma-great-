import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchAllRows } from '../src/lib/fetchAllRows.ts';

for (const count of [0, 1, 1000, 1194, 5000]) {
  test(`loads all ${count} records without duplicates`, async () => {
    const rows = Array.from({ length: count }, (_, id) => ({ id }));
    const result = await fetchAllRows(async (from, to) => ({
      data: rows.slice(from, to + 1), error: null,
    }));
    assert.deepEqual(result.data, rows);
  });
}

test('continues when the API imposes a smaller page size', async () => {
  const rows = Array.from({ length: 1194 }, (_, id) => ({ id }));
  const offsets: number[] = [];
  const result = await fetchAllRows(async (from, to) => {
    offsets.push(from);
    return { data: rows.slice(from, Math.min(to + 1, from + 250)), error: null };
  });
  assert.deepEqual(result.data, rows);
  assert.deepEqual(offsets, [0, 250, 500, 750, 1000, 1194]);
});

test('rejects a failed page instead of returning an incomplete list', async () => {
  const error = new Error('Page unavailable');
  await assert.rejects(fetchAllRows(async (from) => from === 0
    ? { data: [{ id: 1 }], error: null }
    : { data: null, error }), error);
});
