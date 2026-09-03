import {
  createRoll,
  createRollFromOutcomes,
  formatRollSummary,
  normalizeModifier,
  normalizeRollRequest,
  rollToHistoryEntry,
} from './core.js';
import {
  DEFAULT_APPEARANCE,
  SCENE_SKINS,
  applyAppearanceToStage,
  getSkin,
  normalizeAppearance,
  renderDice,
  renderSkinCards,
  SKIN_CATEGORIES,
} from './scene.js';
import { createWebglScene, WEBGL_PROFILE } from './webgl-scene.js';

// v2 intentionally starts a clean desk so the QA tower fixture from the
// previous candidate cannot become the normal landing screen.
const STORAGE_KEY = 'new-dice-roller-state-v2';
const QA_PROFILE = WEBGL_PROFILE;
const HISTORY_LIMIT = 40;
const MODE_LABELS = Object.freeze({ table: 'СТОЛ', tray: 'ЛОТОК', tower: 'БАШНЯ' });
const CATEGORY_LABELS = Object.freeze({ dice: 'Кости', tray: 'Лоток', tower: 'Башня', table: 'Фон' });

const refs = {
  stage: document.getElementById('scene-stage'),
  sceneCanvas: document.getElementById('scene-canvas'),
  diceCluster: document.getElementById('dice-cluster'),
  rollButton: document.getElementById('roll-button'),
  rollButtonFormula: document.getElementById('roll-button-formula'),
  formulaReadout: document.getElementById('formula-readout'),
  diceCount: document.getElementById('dice-count'),
  modifier: document.getElementById('modifier'),
  resultCard: document.getElementById('result-card'),
  resultTotal: document.getElementById('result-total'),
  resultFormula: document.getElementById('result-formula'),
  copyResult: document.getElementById('copy-result'),
  sceneModeReadout: document.getElementById('scene-mode-readout'),
  scenePhase: document.getElementById('scene-phase'),
  headerState: document.getElementById('header-state'),
  historyList: document.getElementById('history-list'),
  skinGrid: document.getElementById('skin-grid'),
  skinTabs: document.getElementById('skin-tabs'),
  clearHistory: document.getElementById('clear-history'),
  qaPanel: document.getElementById('qa-panel'),
  qaFixture: document.getElementById('qa-fixture'),
  qaManifest: document.getElementById('qa-manifest'),
  toast: document.getElementById('toast'),
};

const qaMode = new URLSearchParams(window.location.search).get('qa') === '1';
let activeView = 'roll';
let activeSkinCategory = 'dice';
let toastTimer = 0;
let rollTimer = 0;
let sceneRenderer = null;
let state = loadState();
const qaState = {
  profile: QA_PROFILE,
  renderer: 'webgl2-canvas-v1',
  rendererStatus: 'pending',
  fallback: false,
  phase: state.lastRoll ? 'settled' : 'idle',
  frame: 0,
  captureId: 'candidate-boot',
  lastRollId: state.lastRoll?.id || null,
  errorCount: 0,
  lastError: null,
  fixture: false,
};

function initialState() {
  return {
    request: normalizeRollRequest({ die: 'd20', count: 1, modifier: 0, mode: 'tray' }),
    appearance: DEFAULT_APPEARANCE,
    history: [],
    lastRoll: null,
    phase: 'idle',
  };
}

function safeStorage() {
  try {
    const probe = '__ndr_storage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

function normalizePersistedRoll(raw) {
  if (!raw || !Array.isArray(raw.outcomes)) return null;
  try {
    const request = normalizeRollRequest({
      die: raw.die,
      count: raw.count || raw.outcomes.length,
      modifier: raw.modifier,
      mode: raw.mode,
    });
    if (request.count !== raw.outcomes.length) return null;
    return createRollFromOutcomes(request, raw.outcomes, {
      now: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
      idFactory: () => String(raw.id || `roll-restored-${Date.now()}`),
    });
  } catch (_) {
    return null;
  }
}

function loadState() {
  const fallback = initialState();
  const storage = safeStorage();
  if (!storage) return fallback;
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    const restoredHistory = Array.isArray(raw.history)
      ? raw.history.map(normalizePersistedRoll).filter(Boolean).map(rollToHistoryEntry).slice(0, HISTORY_LIMIT)
      : [];
    const lastRollEvent = normalizePersistedRoll(raw.lastRoll);
    return {
      request: normalizeRollRequest(raw.request),
      appearance: normalizeAppearance(raw.appearance),
      history: restoredHistory,
      lastRoll: lastRollEvent ? rollToHistoryEntry(lastRollEvent) : null,
      phase: lastRollEvent ? 'settled' : 'idle',
    };
  } catch (_) {
    return fallback;
  }
}

function persist() {
  const storage = safeStorage();
  if (!storage) return;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { showToast('Сохранение недоступно'); }
}

function setQa(patch = {}) {
  Object.assign(qaState, patch);
  renderQa();
}

function qaSnapshot() {
  return {
    profile: qaState.profile,
    renderer: qaState.renderer,
    renderer_status: qaState.rendererStatus,
    fallback: qaState.fallback,
    phase: qaState.phase,
    frame_id: qaState.frame,
    capture_id: qaState.captureId,
    last_roll_id: qaState.lastRollId,
    error_count: qaState.errorCount,
    last_error: qaState.lastError,
    fixture: qaState.fixture,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    mode: state.request.mode,
    appearance: { ...state.appearance },
    timestamp: new Date().toISOString(),
  };
}

function visualManifest() {
  return {
    schema_version: 1,
    project: 'new-dice-roller',
    candidate_status: 'candidate',
    artistic_approval: 'pending_user',
    scene: qaSnapshot(),
    last_result: state.lastRoll ? {
      id: state.lastRoll.id,
      die: state.lastRoll.die,
      outcomes: state.lastRoll.outcomes,
      final_total: state.lastRoll.finalTotal,
      formula: state.lastRoll.formula,
    } : null,
  };
}

function renderQa() {
  if (!refs.qaPanel) return;
  const snapshot = qaSnapshot();
  const fields = {
    'qa-profile': snapshot.profile,
    'qa-renderer': `${snapshot.renderer} · ${snapshot.renderer_status}`,
    'qa-fallback': String(snapshot.fallback),
    'qa-phase': snapshot.phase,
    'qa-frame': `${snapshot.frame_id} · ${snapshot.capture_id}`,
    'qa-viewport': `${snapshot.viewport} · dpr ${snapshot.dpr}`,
    'qa-mode': snapshot.mode,
    'qa-roll': snapshot.last_roll_id || '—',
  };
  Object.entries(fields).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  });
  refs.qaPanel.hidden = !qaMode;
}

function installQaBridge() {
  window.__NDR_QA__ = Object.freeze({
    getState: () => qaSnapshot(),
    getManifest: () => visualManifest(),
    loadFixture: () => qaMode && loadFixture(),
  });
}

function showToast(message) {
  if (!refs.toast) return;
  window.clearTimeout(toastTimer);
  refs.toast.textContent = message;
  refs.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => refs.toast.classList.remove('is-visible'), 2200);
}

function showError(error) {
  const message = error?.message === 'secure-rng-unavailable'
    ? 'Безопасный RNG недоступен — бросок заблокирован'
    : 'Не удалось выполнить бросок';
  state.phase = 'error';
  setQa({ phase: 'error', lastError: error?.message || String(error), errorCount: qaState.errorCount + 1 });
  refs.scenePhase.textContent = 'ОШИБКА БРОСКА';
  showToast(message);
}

function updateRequest(patch) {
  state.request = normalizeRollRequest({ ...state.request, ...patch });
  persist();
  renderControls();
  renderScene();
}

function renderControls() {
  document.querySelectorAll('[data-die]').forEach((button) => {
    const selected = button.dataset.die === state.request.die;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  document.querySelectorAll('.mode-choice[data-mode]').forEach((button) => {
    const selected = button.dataset.mode === state.request.mode;
    button.classList.toggle('is-selected', selected);
    if (button.classList.contains('mode-choice')) button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  refs.diceCount.value = String(state.request.count);
  refs.modifier.value = String(state.request.modifier);
  refs.formulaReadout.textContent = formatFormula(state.request);
  refs.rollButtonFormula.textContent = formatFormula(state.request);
}

function formatFormula(request) {
  const modifier = request.modifier === 0 ? '' : request.modifier > 0 ? ` + ${request.modifier}` : ` - ${Math.abs(request.modifier)}`;
  return `${request.count}${request.die}${modifier}`;
}

function renderScene() {
  if (!refs.stage) return;
  applyAppearanceToStage(refs.stage, state.appearance, state.request.mode);
  renderDice(document, refs.diceCluster, state.lastRoll, state.appearance, state.phase, qaState.rendererStatus);
  sceneRenderer?.render({
    mode: state.request.mode,
    appearance: state.appearance,
    die: state.request.die,
    outcomes: state.lastRoll?.outcomes || [],
    phase: state.phase,
  });
  refs.sceneModeReadout.textContent = MODE_LABELS[state.request.mode];
  refs.scenePhase.textContent = qaState.rendererStatus === 'failed'
    ? 'WEBGL БЛОКИРОВАН'
    : state.phase === 'rolling'
    ? 'БРОСОК В ДВИЖЕНИИ'
    : state.phase === 'error'
      ? 'ОШИБКА БРОСКА'
      : state.lastRoll
        ? 'РЕЗУЛЬТАТ ЗАФИКСИРОВАН'
        : 'ГОТОВ К БРОСКУ';
  refs.resultTotal.textContent = state.lastRoll ? String(state.lastRoll.finalTotal) : '—';
  refs.resultFormula.textContent = state.lastRoll ? formatRollSummary(state.lastRoll) : 'Бросок ещё не сделан';
  refs.resultCard.dataset.phase = state.phase;
  refs.rollButton.disabled = state.phase === 'rolling' || qaState.rendererStatus === 'failed';
  refs.rollButton.setAttribute('aria-busy', state.phase === 'rolling' ? 'true' : 'false');
  qaState.frame += 1;
  qaState.captureId = `candidate-${String(qaState.frame).padStart(4, '0')}`;
  setQa({ phase: qaState.rendererStatus === 'failed' ? 'error' : state.phase, lastRollId: state.lastRoll?.id || null });
}

function renderHistory() {
  if (!refs.historyList) return;
  refs.historyList.replaceChildren();
  if (!state.history.length) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.innerHTML = '<span>≡</span><strong>История пока пуста</strong><small>Первый результат появится после броска</small>';
    refs.historyList.append(empty);
    return;
  }
  state.history.forEach((entry) => {
    const article = document.createElement('article');
    article.className = 'history-entry';
    article.dataset.rollId = entry.id;
    const copy = document.createElement('div');
    copy.className = 'history-copy';
    const title = document.createElement('strong');
    title.textContent = String(entry.finalTotal);
    const detail = document.createElement('small');
    detail.textContent = `${entry.formula} · [${entry.outcomes.join(', ')}]`;
    copy.append(title, detail);
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    const time = document.createElement('time');
    time.dateTime = new Date(entry.createdAt).toISOString();
    time.textContent = formatTime(entry.createdAt);
    const repeat = document.createElement('button');
    repeat.type = 'button';
    repeat.textContent = 'Повторить';
    repeat.addEventListener('click', () => {
      updateRequest({ die: entry.die, count: entry.count, modifier: entry.modifier, mode: entry.mode });
      setView('roll');
      showToast(`${entry.formula} готов к повтору`);
    });
    meta.append(time, repeat);
    article.append(copy, meta);
    refs.historyList.append(article);
  });
}

function formatTime(timestamp) {
  try { return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp)); } catch (_) { return '—'; }
}

function renderSkinStudio() {
  renderSkinCards(document, refs.skinGrid, activeSkinCategory, state.appearance, (category, id) => {
    state.appearance = normalizeAppearance({ ...state.appearance, [category]: id });
    persist();
    renderSkinStudio();
    renderScene();
    const skin = getSkin(category, id);
    showToast(`${CATEGORY_LABELS[category]} · ${skin?.name || id}`);
  });
  refs.skinTabs.querySelectorAll('[data-skin-category]').forEach((button) => {
    const selected = button.dataset.skinCategory === activeSkinCategory;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function setView(view) {
  activeView = ['roll', 'skins', 'history'].includes(view) ? view : 'roll';
  document.querySelectorAll('[data-view-panel]').forEach((panel) => {
    const selected = panel.dataset.viewPanel === activeView;
    panel.hidden = !selected;
    panel.classList.toggle('is-active', selected);
  });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.view === activeView);
  });
  if (activeView === 'skins') renderSkinStudio();
  if (activeView === 'history') renderHistory();
}

function performRoll() {
  if (state.phase === 'rolling') return;
  if (qaState.rendererStatus !== 'ready') {
    showToast('WebGL-сцена недоступна');
    return;
  }
  let event;
  try {
    event = createRoll(state.request);
  } catch (error) {
    showError(error);
    return;
  }
  window.clearTimeout(rollTimer);
  state.lastRoll = rollToHistoryEntry(event);
  state.history = [state.lastRoll, ...state.history.filter((entry) => entry.id !== state.lastRoll.id)].slice(0, HISTORY_LIMIT);
  state.phase = 'rolling';
  qaState.fixture = false;
  persist();
  renderScene();
  setQa({ phase: 'rolling', lastRollId: event.id, lastError: null });
  showToast('Результат уже зафиксирован');
  const duration = 860 + Math.max(0, event.outcomes.length - 1) * 70;
  rollTimer = window.setTimeout(() => settleRoll(event.id), duration);
}

function settleRoll(id) {
  if (!state.lastRoll || state.lastRoll.id !== id) return;
  state.phase = 'settled';
  persist();
  renderScene();
  setQa({ phase: 'settled', lastRollId: id });
  showToast(`Итог: ${state.lastRoll.finalTotal}`);
}

function loadFixture() {
  if (!qaMode) return false;
  const event = createRollFromOutcomes({ die: 'd20', count: 3, modifier: 2, mode: 'tower' }, [20, 1, 13], {
    now: 1700000000000,
    idFactory: () => 'fixture-roll-001',
  });
  state.request = event.request;
  state.lastRoll = rollToHistoryEntry(event);
  state.phase = 'settled';
  qaState.fixture = true;
  persist();
  setView('roll');
  renderControls();
  renderScene();
  setQa({ phase: 'settled', lastRollId: event.id, fixture: true });
  showToast('QA fixture загружен');
  return true;
}

async function copyText(value) {
  const text = String(value ?? '');
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
  input.remove();
  return copied;
}

async function copyCurrentResult() {
  if (!state.lastRoll) return showToast('Сначала сделай бросок');
  const copied = await copyText(formatRollSummary(state.lastRoll));
  showToast(copied ? 'Результат скопирован' : 'Не удалось скопировать');
}

async function copyManifest() {
  const copied = await copyText(JSON.stringify(visualManifest(), null, 2));
  showToast(copied ? 'QA manifest скопирован' : 'Не удалось скопировать manifest');
}

function handleRendererFailure(error) {
  sceneRenderer = null;
  window.clearTimeout(rollTimer);
  if (state.phase === 'rolling') {
    state.phase = 'error';
    persist();
  }
  refs.stage?.classList.remove('webgl-active');
  refs.rollButton.disabled = true;
  refs.scenePhase.textContent = 'WEBGL БЛОКИРОВАН';
  setQa({
    renderer: 'webgl2-canvas-v1',
    rendererStatus: 'failed',
    fallback: false,
    phase: 'error',
    lastError: error?.message || String(error),
    errorCount: qaState.errorCount + 1,
  });
  refs.headerState.innerHTML = '<span class="state-dot"></span><span>RENDERER BLOCKED</span>';
  renderScene();
  showToast('Нужен WebGL 2 — fallback отключён');
}

function initializeRenderer() {
  try {
    sceneRenderer = createWebglScene(refs.sceneCanvas, { onContextLost: handleRendererFailure });
    refs.stage.classList.add('webgl-active');
    setQa({ renderer: sceneRenderer.renderer, rendererStatus: 'ready', fallback: false, phase: state.lastRoll ? 'settled' : 'idle', lastError: null });
    refs.headerState.innerHTML = '<span class="state-dot"></span><span>WEBGL СЦЕНА ГОТОВА</span>';
    renderScene();
  } catch (error) {
    handleRendererFailure(error);
  }
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('[data-die]').forEach((button) => button.addEventListener('click', () => updateRequest({ die: button.dataset.die })));
  document.querySelectorAll('.mode-choice[data-mode]').forEach((button) => button.addEventListener('click', () => updateRequest({ mode: button.dataset.mode })));
  document.querySelectorAll('[data-count-step]').forEach((button) => button.addEventListener('click', () => updateRequest({ count: Number(refs.diceCount.value) + Number(button.dataset.countStep) })));
  refs.diceCount.addEventListener('change', () => updateRequest({ count: refs.diceCount.value }));
  refs.modifier.addEventListener('change', () => updateRequest({ modifier: normalizeModifier(refs.modifier.value) }));
  refs.rollButton.addEventListener('click', performRoll);
  refs.copyResult.addEventListener('click', copyCurrentResult);
  refs.clearHistory.addEventListener('click', () => {
    state.history = [];
    persist();
    renderHistory();
    showToast('История очищена');
  });
  refs.skinTabs.querySelectorAll('[data-skin-category]').forEach((button) => button.addEventListener('click', () => {
    activeSkinCategory = SKIN_CATEGORIES.includes(button.dataset.skinCategory) ? button.dataset.skinCategory : 'dice';
    renderSkinStudio();
  }));
  refs.qaFixture?.addEventListener('click', loadFixture);
  refs.qaManifest?.addEventListener('click', copyManifest);
  window.addEventListener('resize', () => {
    sceneRenderer?.resize();
    renderScene();
  }, { passive: true });
  window.addEventListener('error', (event) => setQa({ errorCount: qaState.errorCount + 1, lastError: String(event.message || 'window-error').slice(0, 160) }));
  window.addEventListener('unhandledrejection', (event) => setQa({ errorCount: qaState.errorCount + 1, lastError: String(event.reason?.message || event.reason || 'unhandled-rejection').slice(0, 160) }));
}

installQaBridge();
bindEvents();
renderControls();
renderHistory();
renderSkinStudio();
renderScene();
initializeRenderer();
setView('roll');
