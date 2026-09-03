const UINT32_RANGE = 0x100000000;

function defaultRandomValues(target) {
  if (typeof globalThis.crypto?.getRandomValues !== "function") {
    throw new Error("Secure random source is unavailable");
  }
  return globalThis.crypto.getRandomValues(target);
}

export function secureInt(maxExclusive, getRandomValues = defaultRandomValues) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
    throw new RangeError("maxExclusive must be an integer between 1 and 2^32");
  }
  if (maxExclusive === 1) return 0;
  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
  const sample = new Uint32Array(1);
  do {
    getRandomValues(sample);
  } while (sample[0] >= limit);
  return sample[0] % maxExclusive;
}

export function rollDie(sides, getRandomValues = defaultRandomValues) {
  if (!Number.isInteger(sides) || sides < 2) throw new RangeError("A die needs at least two sides");
  return secureInt(sides, getRandomValues) + 1;
}

export function createInjectedRng(values) {
  const queue = [...values];
  return (sides) => {
    if (!queue.length) throw new Error("Injected RNG exhausted");
    const next = queue.shift();
    if (!Number.isInteger(next) || next < 1 || next > sides) {
      throw new RangeError(`Injected result ${next} is outside 1..${sides}`);
    }
    return next;
  };
}
