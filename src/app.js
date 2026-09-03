import { DIE_TYPES, clampInteger, formatExpression } from "./dice.js";
import { resolveRoll } from "./roll.js";
import { DiceRenderer, DICE_SKINS, TRAY_SKINS, TOWER_SKINS, ENVIRONMENTS } from "./renderer.js";
import { secureInt } from "./rng.js";

const DEFAULT_APPEARANCE = Object.freeze({ diceSkin: "obsidian", traySkin: "leather", towerSkin: "runes", environment: "cartographer" });

const state = {
  sides: 20,
  count: 1,
  modifier: 0,
  perDieModifier: false,
  mode: "normal",
  category: "dice",
  appearance: loadAppearance(),
  history: loadHistory(),
  lastResult: null,
  busy: false
};

const elements = {
  canvas: document.querySelector("#dice-canvas"),
  webglStatus: document.querySelector("#webgl-status"),
  frameState: document.querySelector("#frame-state"),
  footerFrame: document.querySelector("#footer-frame"),
  sceneCaption: document.querySelector("#scene-caption"),
  captureBadge: document.querySelector("#capture-badge"),
  sceneFailure: document.querySelector("#scene-failure"),
  count: document.querySelector("#count-value"),
  modifier: document.querySelector("#modifier-value"),
  perDieModifier: document.querySelector("#per-die-modifier"),
  rollButton: document.querySelector("#roll-button"),
  composerNote: document.querySelector("#composer-note"),
  expression: document.querySelector("#result-expression"),
  total: document.querySelector("#result-total"),
  breakdown: document.querySelector("#result-breakdown"),
  history: document.querySelector("#history-list"),
  historyCount: document.querySelector("#history-count"),
  showcase: document.querySelector("#showcase"),
  showcaseGrid: document.querySelector("#showcase-grid"),
  quickSkinList: document.querySelector("#quick-skin-list")
};

let renderer;

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem("o-dice-history") || "[]");
    return Array.isArray(saved) ? saved.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try { localStorage.setItem("o-dice-history", JSON.stringify(state.history.slice(0, 12))); } catch { /* private mode */ }
}

function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem("o-dice-appearance") || "{}");
    return {
      diceSkin: DICE_SKINS[saved.diceSkin] ? saved.diceSkin : DEFAULT_APPEARANCE.diceSkin,
      traySkin: TRAY_SKINS[saved.traySkin] ? saved.traySkin : DEFAULT_APPEARANCE.traySkin,
      towerSkin: TOWER_SKINS[saved.towerSkin] ? saved.towerSkin : DEFAULT_APPEARANCE.towerSkin,
      environment: ENVIRONMENTS[saved.environment] ? saved.environment : DEFAULT_APPEARANCE.environment
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

function saveAppearance() {
  try { localStorage.setItem("o-dice-appearance", JSON.stringify(state.appearance)); } catch { /* private mode */ }
}

function formatSigned(value) {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

function setActiveDie() {
  document.querySelectorAll("[data-sides]").forEach(button => button.classList.toggle("is-active", Number(button.dataset.sides) === state.sides));
}

function renderComposer() {
  elements.count.value = String(state.count);
  elements.modifier.value = formatSigned(state.modifier);
  elements.perDieModifier.checked = state.perDieModifier;
  setActiveDie();
  document.querySelectorAll("[data-mode]").forEach(button => button.classList.toggle("is-active", button.dataset.mode === state.mode));
  elements.composerNote.textContent = state.mode === "normal" ? "Результат выбирается один раз до начала анимации." : "Преимущество и помеха работают как в D&D для одиночного к20.";
}

function renderResult(result) {
  if (!result) {
    elements.expression.textContent = formatExpression(state);
    elements.total.textContent = "—";
    elements.breakdown.textContent = "Нажмите «Бросок», чтобы начать";
    return;
  }
  elements.expression.textContent = result.expression;
  elements.total.textContent = String(result.total);
  const modeText = result.modeApplied ? ` · ${result.mode === "advantage" ? "преимущество" : "помеха"}: ${result.compared.join(" / ")}` : "";
  elements.breakdown.textContent = `${result.breakdown}${modeText}`;
}

function renderHistory() {
  elements.historyCount.textContent = String(state.history.length);
  if (!state.history.length) {
    elements.history.innerHTML = '<div class="empty-history">Здесь появятся последние броски.</div>';
    return;
  }
  elements.history.innerHTML = state.history.map(item => `
    <button type="button" class="history-item" data-history-id="${item.id}">
      <span><small>${item.expression}</small><b>${item.breakdown}</b></span>
      <strong>${item.total}</strong>
    </button>
  `).join("");
}

function materialEntries(category) {
  if (category === "dice") return Object.entries(DICE_SKINS).map(([key, value]) => ({ key, ...value, kind: "dice" }));
  if (category === "tray") return Object.entries(TRAY_SKINS).map(([key, value]) => ({ key, ...value, kind: "tray" }));
  if (category === "tower") return Object.entries(TOWER_SKINS).map(([key, value]) => ({ key, ...value, kind: "tower" }));
  return Object.entries(ENVIRONMENTS).map(([key, value]) => ({ key, ...value, kind: "environment" }));
}

function isSelected(entry) {
  const key = entry.kind === "dice" ? state.appearance.diceSkin : entry.kind === "tray" ? state.appearance.traySkin : entry.kind === "tower" ? state.appearance.towerSkin : state.appearance.environment;
  return key === entry.key;
}

function materialStyle(entry) {
  if (entry.kind === "dice") return `--swatch-a:${entry.accent};--swatch-b:${entry.glow};--swatch-c:rgb(${entry.body.map(value => Math.round(value * 255)).join(",")})`;
  if (entry.kind === "tray") return `--swatch-a:rgb(${entry.trim.map(value => Math.round(value * 255)).join(",")});--swatch-b:rgb(${entry.rim.map(value => Math.round(value * 255)).join(",")});--swatch-c:rgb(${entry.floor.map(value => Math.round(value * 255)).join(",")})`;
  if (entry.kind === "tower") return `--swatch-a:rgb(${entry.trim.map(value => Math.round(value * 255)).join(",")});--swatch-b:rgb(${entry.body.map(value => Math.round(value * 255)).join(",")});--swatch-c:rgb(${entry.dark.map(value => Math.round(value * 255)).join(",")})`;
  return `--swatch-a:${entry.body === "candlelit" ? "#c67c32" : entry.body === "mountain" ? "#b7c8b1" : "#43aac8"};--swatch-b:#101d27;--swatch-c:#d0ad70`;
}

function renderShowcase() {
  const entries = materialEntries(state.category);
  elements.showcaseGrid.innerHTML = entries.map(entry => `
    <button type="button" class="material-card ${isSelected(entry) ? "is-selected" : ""}" data-material-kind="${entry.kind}" data-material-key="${entry.key}" style="${materialStyle(entry)}">
      <span class="material-preview material-preview-${entry.kind}"><i></i><b>${entry.kind === "dice" ? "к20" : entry.kind === "tray" ? "✦" : entry.kind === "tower" ? "⌂" : "◈"}</b></span>
      <span class="material-copy"><strong>${entry.short}</strong><small>${entry.label}</small></span>
      <span class="material-check">${isSelected(entry) ? "✓" : ""}</span>
    </button>
  `).join("");
  document.querySelectorAll(".showcase-tab").forEach(tab => tab.classList.toggle("is-active", tab.dataset.category === state.category));
}

function renderQuickSkins() {
  const entries = Object.entries(DICE_SKINS).slice(0, 4);
  elements.quickSkinList.innerHTML = entries.map(([key, skin]) => `
    <button type="button" class="quick-skin ${state.appearance.diceSkin === key ? "is-selected" : ""}" data-quick-skin="${key}" style="--swatch-a:${skin.accent};--swatch-b:${skin.glow};--swatch-c:rgb(${skin.body.map(value => Math.round(value * 255)).join(",")})">
      <span class="quick-skin-orb"></span><span>${skin.short}</span>
    </button>
  `).join("");
}

function chooseMaterial(kind, key) {
  if (kind === "dice") state.appearance.diceSkin = key;
  if (kind === "tray") state.appearance.traySkin = key;
  if (kind === "tower") state.appearance.towerSkin = key;
  if (kind === "environment") {
    state.appearance.environment = key;
    document.body.dataset.environment = key;
  }
  saveAppearance();
  renderer?.setAppearance(state.appearance);
  renderShowcase();
  renderQuickSkins();
}

function addHistory(result) {
  const id = `${Date.now()}-${secureInt(0x100000000).toString(16)}`;
  state.history.unshift({ id, expression: result.expression, breakdown: result.breakdown, total: result.total });
  state.history = state.history.slice(0, 12);
  saveHistory();
  renderHistory();
}

function handleRoll() {
  if (state.busy || !renderer) return;
  const result = resolveRoll({ sides: state.sides, count: state.count, modifier: state.modifier, perDieModifier: state.perDieModifier, mode: state.mode });
  state.lastResult = result;
  state.busy = true;
  elements.rollButton.disabled = true;
  elements.rollButton.classList.add("is-rolling");
  elements.rollButton.querySelector("span:nth-child(2)").textContent = "Бросаем…";
  elements.frameState.textContent = "ROLLING";
  elements.sceneCaption.textContent = "Кости летят через башню…";
  renderResult(result);
  renderer.startRoll(result.values, result.sides);
}

function finishRoll(frameId) {
  state.busy = false;
  elements.rollButton.disabled = false;
  elements.rollButton.classList.remove("is-rolling");
  elements.rollButton.querySelector("span:nth-child(2)").textContent = "Бросок";
  elements.frameState.textContent = "SETTLED";
  elements.footerFrame.textContent = String(frameId);
  elements.sceneCaption.textContent = `к${state.lastResult.sides} остановилась на ${state.lastResult.total}`;
  addHistory(state.lastResult);
}

function updateStepper(type, delta) {
  if (type === "count") state.count = clampInteger(state.count + delta, 1, 8);
  if (type === "modifier") state.modifier = clampInteger(state.modifier + delta, -99, 99);
  renderComposer();
}

function bindEvents() {
  document.querySelectorAll("[data-sides]").forEach(button => button.addEventListener("click", () => {
    state.sides = Number(button.dataset.sides);
    renderComposer();
    elements.expression.textContent = formatExpression(state);
  }));
  document.querySelectorAll("[data-step]").forEach(button => button.addEventListener("click", () => updateStepper(button.dataset.step, Number(button.dataset.delta))));
  elements.perDieModifier.addEventListener("change", event => { state.perDieModifier = event.target.checked; renderComposer(); });
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => { state.mode = button.dataset.mode; renderComposer(); }));
  elements.rollButton.addEventListener("click", handleRoll);
  document.addEventListener("keydown", event => {
    if (event.code === "Space" && !["INPUT", "TEXTAREA", "BUTTON"].includes(document.activeElement?.tagName)) { event.preventDefault(); handleRoll(); }
  });
  document.querySelector("#clear-history").addEventListener("click", () => { state.history = []; saveHistory(); renderHistory(); });
  document.querySelector("#copy-result").addEventListener("click", async () => {
    if (!state.lastResult) return;
    const text = `${state.lastResult.expression} = ${state.lastResult.total} [${state.lastResult.values.join(", ")}]`;
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be unavailable in a WebView */ }
    document.querySelector("#copy-result").textContent = "✓";
    setTimeout(() => { document.querySelector("#copy-result").textContent = "⧉"; }, 1000);
  });
  document.querySelector("#open-skins").addEventListener("click", () => elements.showcase.scrollIntoView({ behavior: "smooth", block: "start" }));
  document.querySelector("#close-skins").addEventListener("click", () => elements.showcase.classList.toggle("is-collapsed"));
  document.querySelectorAll(".showcase-tab").forEach(tab => tab.addEventListener("click", () => { state.category = tab.dataset.category; renderShowcase(); }));
  elements.showcaseGrid.addEventListener("click", event => { const card = event.target.closest("[data-material-key]"); if (card) chooseMaterial(card.dataset.materialKind, card.dataset.materialKey); });
  elements.quickSkinList.addEventListener("click", event => { const button = event.target.closest("[data-quick-skin]"); if (button) chooseMaterial("dice", button.dataset.quickSkin); });
  document.querySelector("#scene-spin-left").addEventListener("click", () => { renderer.orbit -= 0.35; });
  document.querySelector("#scene-spin-right").addEventListener("click", () => { renderer.orbit += 0.35; });
}

function boot() {
  document.body.dataset.environment = state.appearance.environment;
  renderComposer();
  renderResult(null);
  renderHistory();
  renderShowcase();
  renderQuickSkins();
  bindEvents();
  try {
    renderer = new DiceRenderer(elements.canvas, { onSettled: finishRoll });
    elements.webglStatus.textContent = "WebGL: готов";
  } catch (error) {
    console.error(error);
    elements.webglStatus.textContent = "WebGL: недоступен";
    elements.sceneFailure.hidden = false;
    elements.rollButton.disabled = true;
    elements.frameState.textContent = "ERROR";
    elements.footerFrame.textContent = "—";
    elements.sceneCaption.textContent = "Renderer недоступен";
    elements.captureBadge.hidden = true;
  }
}

boot();
