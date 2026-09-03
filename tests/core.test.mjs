import test from "node:test";
import assert from "node:assert/strict";
import { DIE_TYPES, faceNumbers, formatBreakdown, formatExpression, normalizeConfig } from "../src/dice.js";
import { createInjectedRng, secureInt } from "../src/rng.js";
import { resolveRoll } from "../src/roll.js";

test("supports the complete D&D die family from d4 to d100", () => {
  assert.deepEqual(DIE_TYPES, [4, 6, 8, 10, 12, 20, 100]);
  for (const sides of DIE_TYPES) {
    const numbers = faceNumbers(sides, sides);
    assert.equal(numbers.length, sides);
    assert.equal(new Set(numbers).size, sides);
    assert.equal(numbers[0], sides);
  }
});

test("committed rolls stay inside every die's inclusive range", () => {
  for (const sides of DIE_TYPES) {
    const result = resolveRoll({ sides, count: 1 }, createInjectedRng([sides]));
    assert.equal(result.values[0], sides);
    assert.ok(result.values[0] >= 1 && result.values[0] <= sides);
    assert.equal(result.total, sides);
  }
});

test("normalizes composer values without changing the public contract", () => {
  assert.deepEqual(normalizeConfig({ sides: 20, count: 99, modifier: -200, perDieModifier: 1 }), {
    sides: 20, count: 8, modifier: -99, perDieModifier: true, mode: "normal"
  });
  assert.equal(formatExpression({ sides: 20, count: 2, modifier: 3 }), "2к20 + 3");
  assert.equal(formatExpression({ sides: 6, count: 2, modifier: -2, perDieModifier: true }), "2к6 − 2 × 2");
  assert.equal(formatBreakdown([3, 5], 2), "3 + 5 + 2");
  assert.equal(formatBreakdown([3, 5], -2, true), "3 + 5 − 4");
});

test("secureInt uses rejection sampling at the non-power-of-two boundary", () => {
  const samples = [0xffffffff, 7, 12];
  const seen = [];
  const value = secureInt(10, target => { target[0] = samples.shift(); seen.push(target[0]); return target; });
  assert.deepEqual(seen, [0xffffffff, 7]);
  assert.equal(value, 7);
});

test("resolveRoll preserves an immutable selected result and applies one modifier", () => {
  const result = resolveRoll({ sides: 20, count: 2, modifier: 3 }, createInjectedRng([4, 17]));
  assert.deepEqual(result.values, [4, 17]);
  assert.equal(result.total, 24);
  assert.equal(result.totalModifier, 3);
});

test("per-die modifier is applied to every die", () => {
  const result = resolveRoll({ sides: 6, count: 3, modifier: 2, perDieModifier: true }, createInjectedRng([1, 2, 3]));
  assert.equal(result.total, 12);
  assert.equal(result.totalModifier, 6);
});

test("advantage and disadvantage compare two d20 candidates only for a single d20", () => {
  const advantage = resolveRoll({ sides: 20, count: 1, mode: "advantage" }, createInjectedRng([4, 18]));
  const disadvantage = resolveRoll({ sides: 20, count: 1, mode: "disadvantage" }, createInjectedRng([4, 18]));
  const unsupported = resolveRoll({ sides: 12, count: 1, mode: "advantage" }, createInjectedRng([4]));
  assert.deepEqual(advantage.compared, [4, 18]);
  assert.equal(advantage.total, 18);
  assert.equal(disadvantage.total, 4);
  assert.equal(unsupported.modeApplied, false);
  assert.equal(unsupported.total, 4);
});
