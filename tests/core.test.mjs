import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIE_TYPES,
  createRoll,
  createRollFromOutcomes,
  formatRollFormula,
  normalizeRollRequest,
  rollToHistoryEntry,
  secureRandomInt,
} from '../src/core.js';

test('catalog contains the complete D&D range from d4 to d100', () => {
  assert.deepEqual(DIE_TYPES.map((die) => die.id), ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);
});

test('every catalog die produces values inside its own face range', () => {
  for (const die of DIE_TYPES) {
    const event = createRoll({ die: die.id, count: 2 }, {
      randomInt: (maxExclusive) => maxExclusive - 1,
      now: 10,
      idFactory: () => `range-${die.id}`,
    });
    assert.deepEqual(event.outcomes, [die.sides, die.sides]);
    assert.ok(event.outcomes.every((value) => value >= 1 && value <= die.sides));
  }
});

test('roll request normalizes die aliases, count, modifier and mode', () => {
  assert.deepEqual(normalizeRollRequest({ sides: 20, count: 99, modifier: -500, mode: 'TOWER' }), {
    die: 'd20',
    count: 12,
    modifier: -99,
    mode: 'tower',
  });
});

test('secureRandomInt rejects an incomplete crypto source', () => {
  assert.throws(() => secureRandomInt(6, null), { message: 'secure-rng-unavailable' });
});

test('secureRandomInt uses rejection sampling instead of modulo bias', () => {
  const words = [0xffffffff, 7];
  const source = {
    getRandomValues(buffer) {
      buffer[0] = words.shift();
    },
  };
  assert.equal(secureRandomInt(10, source), 7);
  assert.equal(words.length, 0);
});

test('authoritative outcomes are committed before presentation', () => {
  const values = [0, 19, 9];
  const event = createRoll(
    { die: 'd20', count: 3, modifier: 2, mode: 'tray' },
    { randomInt: () => values.shift(), now: 123, idFactory: () => 'roll-test-1' },
  );
  assert.equal(event.status, 'committed');
  assert.equal(event.phase, 'committed');
  assert.deepEqual(event.outcomes, [1, 20, 10]);
  assert.equal(event.total, 31);
  assert.equal(event.finalTotal, 33);
  assert.equal(formatRollFormula(event.request), '3d20 + 2');
  assert.equal(event.id, 'roll-test-1');
});

test('d100 accepts 1..100 and rejects values outside the die', () => {
  const event = createRollFromOutcomes({ die: 'd100', count: 2 }, [1, 100], { now: 1, idFactory: () => 'd100-test' });
  assert.deepEqual(event.outcomes, [1, 100]);
  assert.equal(event.finalTotal, 101);
  assert.throws(() => createRollFromOutcomes({ die: 'd100', count: 1 }, [101]));
});

test('history projection preserves the committed result and stable fields', () => {
  const event = createRollFromOutcomes({ die: 'd8', count: 1, modifier: -1, mode: 'table' }, [8], {
    now: 42,
    idFactory: () => 'history-test',
  });
  const entry = rollToHistoryEntry(event);
  assert.deepEqual(entry, {
    id: 'history-test',
    createdAt: 42,
    die: 'd8',
    sides: 8,
    count: 1,
    modifier: -1,
    outcomes: [8],
    total: 8,
    finalTotal: 7,
    formula: '1d8 - 1',
    display: '1d8 - 1 = 7',
    mode: 'table',
  });
});
