const allowedKeys = new Set([
  "dice.visual.profile",
  "dice.webgl.status",
  "dice.visual.fallback",
  "dice.visual.phase",
  "dice.visual.frame_id"
]);

const localState = Object.create(null);

export function setQaState(key, value) {
  if (!allowedKeys.has(key)) return;
  localState[key] = value;
  if (typeof document !== "undefined") {
    const dataKey = key.replaceAll(".", "-");
    document.documentElement.dataset[dataKey] = String(value);
  }
  const bridge = typeof window !== "undefined" ? window.__O_BROWSER_QA__ : null;
  if (bridge && typeof bridge.setState === "function") {
    bridge.setState(key, value);
  }
}

export function getQaState() {
  return { ...localState };
}

export function announceWebGlBoot() {
  setQaState("dice.visual.profile", "adel-dice-webgl-v1");
  setQaState("dice.webgl.status", "booting");
  setQaState("dice.visual.fallback", false);
  setQaState("dice.visual.phase", "loading");
}

export function announceWebGlReady(frameId) {
  setQaState("dice.visual.profile", "adel-dice-webgl-v1");
  setQaState("dice.webgl.status", "ready");
  setQaState("dice.visual.fallback", false);
  setQaState("dice.visual.phase", "settled");
  setQaState("dice.visual.frame_id", frameId);
}

export function announceWebGlRolling() {
  setQaState("dice.visual.profile", "adel-dice-webgl-v1");
  setQaState("dice.webgl.status", "ready");
  setQaState("dice.visual.fallback", false);
  setQaState("dice.visual.phase", "rolling");
}

export function announceWebGlError() {
  setQaState("dice.visual.profile", "adel-dice-webgl-v1");
  setQaState("dice.webgl.status", "unavailable");
  setQaState("dice.visual.fallback", true);
  setQaState("dice.visual.phase", "error");
}
