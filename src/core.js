export const DIE_TYPES = Object.freeze([
  Object.freeze({ id: 'd4', sides: 4, label: 'd4', family: 'tetra' }),
  Object.freeze({ id: 'd6', sides: 6, label: 'd6', family: 'cube' }),
  Object.freeze({ id: 'd8', sides: 8, label: 'd8', family: 'octa' }),
  Object.freeze({ id: 'd10', sides: 10, label: 'd10', family: 'deca' }),
  Object.freeze({ id: 'd12', sides: 12, label: 'd12', family: 'dodeca' }),
  Object.freeze({ id: 'd20', sides: 20, label: 'd20', family: 'icosa' }),
  Object.freeze({ id: 'd100', sides: 100, label: 'd100', family: 'percentile' }),
]);

export const SCENE_MODES = Object.freeze(['table', 'tray', 'tower']);
export const DEFAULT_DIE = 'd20';
export const DEFAULT_MODE = 'tray';
export const MAX_DICE_COUNT = 12;
export const MAX_MODIFIER = 99;

const DIE_BY_ID = new Map(DIE_TYPES.map((die) => [die.id, die]));
const DIE_BY_SIDES = new Map(DIE_TYPES.map((die) => [String(die.sides), die]));

export function getDie(input) {
  if (input && typeof input === 'object' && DIE_BY_ID.has(input.id)) return DIE_BY_ID.get(input.id);
  const raw = String(input ?? '').trim().toLowerCase();
  return DIE_BY_ID.get(raw) || DIE_BY_SIDES.get(raw) || null;
}

export function normalizeDie(input, fallback = DEFAULT_DIE) {
  return getDie(input)?.id || getDie(fallback)?.id || DEFAULT_DIE;
}

export function normalizeCount(input, fallback = 1) {
  const value = Number(input);
  if (!Number.isInteger(value)) return fallback;
  return Math.max(1, Math.min(MAX_DICE_COUNT, value));
}

export function normalizeModifier(input, fallback = 0) {
  const value = Number(input);
  if (!Number.isInteger(value)) return fallback;
  return Math.max(-MAX_MODIFIER, Math.min(MAX_MODIFIER, value));
}

export function normalizeMode(input, fallback = DEFAULT_MODE) {
  const mode = String(input ?? '').trim().toLowerCase();
  return SCENE_MODES.includes(mode) ? mode : fallback;
}

export function normalizeRollRequest(input = {}) {
  const die = getDie(input.die || input.dieType || input.sides);
  const dieId = die?.id || normalizeDie(DEFAULT_DIE);
  return Object.freeze({
    die: dieId,
    count: normalizeCount(input.count, 1),
    modifier: normalizeModifier(input.modifier, 0),
    mode: normalizeMode(input.mode, DEFAULT_MODE),
  });
}

function assertRandomValue(value, maxExclusive) {
  if (!Number.isInteger(value) || value < 0 || value >= maxExclusive) {
    throw new RangeError('random-int-out-of-range');
  }
  return value;
}

export function secureRandomInt(maxExclusive, cryptoSource = globalThis.crypto) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x100000000) {
    throw new RangeError('invalid-random-range');
  }
  if (!cryptoSource || typeof cryptoSource.getRandomValues !== 'function') {
    throw new Error('secure-rng-unavailable');
  }

  const bucketSize = 0x100000000;
  const acceptedLimit = Math.floor(bucketSize / maxExclusive) * maxExclusive;
  const word = new Uint32Array(1);
  do {
    cryptoSource.getRandomValues(word);
  } while (word[0] >= acceptedLimit);
  return word[0] % maxExclusive;
}

function defaultRollId(now) {
  const stamp = Number.isFinite(now) ? now : Date.now();
  return `roll-${stamp.toString(36)}-${++defaultRollId.sequence}`;
}
defaultRollId.sequence = 0;

function formatSignedModifier(modifier) {
  if (modifier === 0) return '';
  return modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
}

export function formatRollFormula(request) {
  const normalized = normalizeRollRequest(request);
  return `${normalized.count}${normalized.die}${formatSignedModifier(normalized.modifier)}`;
}

export function formatRollSummary(event) {
  if (!event || !Array.isArray(event.outcomes)) return '';
  const values = event.outcomes.join(', ');
  return `${event.formula} = ${event.finalTotal} [${values}]`;
}

function validateOutcome(value, sides) {
  if (!Number.isInteger(value) || value < 1 || value > sides) {
    throw new RangeError('invalid-roll-outcome');
  }
  return value;
}

export function createRollFromOutcomes(input, outcomes, options = {}) {
  const request = normalizeRollRequest(input);
  const die = getDie(request.die);
  if (!Array.isArray(outcomes) || outcomes.length !== request.count) {
    throw new RangeError('outcome-count-mismatch');
  }
  const checked = outcomes.map((value) => validateOutcome(value, die.sides));
  const total = checked.reduce((sum, value) => sum + value, 0);
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const id = typeof options.idFactory === 'function' ? options.idFactory() : defaultRollId(now);
  return Object.freeze({
    id: String(id),
    createdAt: now,
    phase: 'committed',
    status: 'committed',
    request,
    die: die.id,
    sides: die.sides,
    outcomes: Object.freeze(checked.slice()),
    total,
    modifier: request.modifier,
    finalTotal: total + request.modifier,
    formula: formatRollFormula(request),
    display: `${formatRollFormula(request)} = ${total + request.modifier}`,
  });
}

export function createRoll(input, options = {}) {
  const request = normalizeRollRequest(input);
  const die = getDie(request.die);
  const randomInt = options.randomInt || secureRandomInt;
  if (typeof randomInt !== 'function') throw new TypeError('random-int-function-required');
  const outcomes = Array.from({ length: request.count }, () => {
    const raw = randomInt(die.sides);
    return assertRandomValue(raw, die.sides) + 1;
  });
  return createRollFromOutcomes(request, outcomes, options);
}

export function isRollEvent(value) {
  return Boolean(
    value &&
    typeof value.id === 'string' &&
    value.status === 'committed' &&
    value.phase === 'committed' &&
    Array.isArray(value.outcomes) &&
    Number.isInteger(value.finalTotal),
  );
}

export function rollToHistoryEntry(event) {
  if (!isRollEvent(event)) throw new TypeError('invalid-roll-event');
  return Object.freeze({
    id: event.id,
    createdAt: event.createdAt,
    die: event.die,
    sides: event.sides,
    count: event.request.count,
    modifier: event.modifier,
    outcomes: Object.freeze(event.outcomes.slice()),
    total: event.total,
    finalTotal: event.finalTotal,
    formula: event.formula,
    display: event.display,
    mode: event.request.mode,
  });
}
