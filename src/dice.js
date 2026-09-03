export const DIE_TYPES = Object.freeze([4, 6, 8, 10, 12, 20, 100]);

export function clampInteger(value, min, max) {
  const number = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : min;
  return Math.min(max, Math.max(min, number));
}

export function normalizeConfig({ sides = 20, count = 1, modifier = 0, perDieModifier = false, mode = "normal" } = {}) {
  if (!DIE_TYPES.includes(Number(sides))) throw new RangeError(`Unsupported die: d${sides}`);
  if (!["normal", "advantage", "disadvantage"].includes(mode)) throw new RangeError(`Unsupported mode: ${mode}`);
  return {
    sides: Number(sides),
    count: clampInteger(count, 1, 8),
    modifier: clampInteger(modifier, -99, 99),
    perDieModifier: Boolean(perDieModifier),
    mode
  };
}

export function formatExpression({ sides, count, modifier, perDieModifier = false }) {
  const base = `${count}к${sides}`;
  if (!modifier) return base;
  const sign = modifier > 0 ? "+" : "−";
  return perDieModifier ? `${base} ${sign} ${Math.abs(modifier)} × ${count}` : `${base} ${sign} ${Math.abs(modifier)}`;
}

export function formatBreakdown(values, modifier, perDieModifier = false) {
  const base = values.map(String).join(" + ");
  const totalModifier = perDieModifier ? modifier * values.length : modifier;
  if (totalModifier > 0) return `${base} + ${totalModifier}`;
  if (totalModifier < 0) return `${base} − ${Math.abs(totalModifier)}`;
  return base || "—";
}

export function faceNumbers(sides, selectedValue) {
  if (!DIE_TYPES.includes(Number(sides))) throw new RangeError(`Unsupported die: d${sides}`);
  const selected = clampInteger(selectedValue, 1, sides);
  return [selected, ...Array.from({ length: sides }, (_, index) => index + 1).filter(value => value !== selected)];
}
