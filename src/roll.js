import { normalizeConfig, formatBreakdown, formatExpression } from "./dice.js";
import { rollDie } from "./rng.js";

function rollSet(config, rng) {
  return Array.from({ length: config.count }, () => rng(config.sides));
}

export function resolveRoll(input = {}, rng = rollDie) {
  const config = normalizeConfig(input);
  let values;
  let compared = null;
  let modeApplied = false;

  if (config.mode !== "normal" && config.sides === 20 && config.count === 1) {
    const candidates = [rollSet(config, rng)[0], rollSet(config, rng)[0]];
    const chosen = config.mode === "advantage" ? Math.max(...candidates) : Math.min(...candidates);
    values = [chosen];
    compared = candidates;
    modeApplied = true;
  } else {
    values = rollSet(config, rng);
  }

  const totalModifier = config.perDieModifier ? config.modifier * config.count : config.modifier;
  const total = values.reduce((sum, value) => sum + value, 0) + totalModifier;
  return {
    ...config,
    values,
    compared,
    modeApplied,
    totalModifier,
    total,
    expression: formatExpression(config),
    breakdown: formatBreakdown(values, config.modifier, config.perDieModifier)
  };
}
