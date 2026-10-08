import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { previousPeriodDelta, monthlySeries } from '../realDisplayValues';

test('previous-period delta hides missing prior data and preserves growth direction', () => {
  assert.equal(previousPeriodDelta(150, 0), null);
  assert.equal(previousPeriodDelta(0, 0), null);
  assert.equal(previousPeriodDelta(150, 100), '+50.0%');
  assert.equal(previousPeriodDelta(150, 200), '-25.0%');
});

test('monthly series sums dated amounts exactly, oldest first, with empty months', () => {
  assert.deepEqual(monthlySeries([
    { date: '2025-12-31', amount: '0.10' },
    { date: '2025-12-01', amount: '0.20' },
    { date: '2026-02-12', amount: '150.00' },
    { date: '2025-11-30', amount: '999.00' },
    { date: '2026-03-01', amount: '999.00' },
    { date: undefined, amount: '999.00' },
  ], '2026-02-28', 3), [0.3, 0, 150]);
});

test('component sources contain no known fabricated display values', () => {
  const literals = ['492-810-332', '+8.4%', '+12.1%', '+15.3%', '[15, 24, 18, 32'];
  function check(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) check(path);
      else if (/\.[jt]sx?$/.test(path)) {
        const source = readFileSync(path, 'utf8');
        for (const literal of literals) assert.ok(!source.includes(literal), `${path}: ${literal}`);
      }
    }
  }
  check(join(process.cwd(), 'src/components'));
});
