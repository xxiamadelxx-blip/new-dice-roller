import { DIE_TYPES } from './core.js';

export const SCENE_SKINS = Object.freeze({
  dice: Object.freeze([
    Object.freeze({ id: 'obsidian-ember', name: 'Obsidian Ember', description: 'Тёмный камень с живым янтарным швом.', body: '#171b1b', accent: '#e0b668', highlight: '#f6dc9d', family: 'obsidian' }),
    Object.freeze({ id: 'moonstone-veil', name: 'Moonstone Veil', description: 'Холодная лунная смола с серебряным светом.', body: '#66728c', accent: '#d8e5ff', highlight: '#ffffff', family: 'moonstone' }),
    Object.freeze({ id: 'verdant-rite', name: 'Verdant Rite', description: 'Глубокий зелёный камень и старое золото.', body: '#1f4a3d', accent: '#c7d48b', highlight: '#e8f2ba', family: 'verdant' }),
    Object.freeze({ id: 'bloodglass', name: 'Bloodglass', description: 'Прозрачный рубиновый жар под медной цифрой.', body: '#6d202b', accent: '#ffb177', highlight: '#ffd6a8', family: 'bloodglass' }),
    Object.freeze({ id: 'opal-veil', name: 'Opal Veil', description: 'Молочный опал с голубым иридисцентным бликом.', body: '#c9d2d2', accent: '#719fc2', highlight: '#f4f8ed', family: 'opal' }),
    Object.freeze({ id: 'bloodstone-rite', name: 'Bloodstone Rite', description: 'Тёмный яшмовый камень с мшистыми вкраплениями.', body: '#3c282c', accent: '#9bb873', highlight: '#e6d0a0', family: 'bloodstone' }),
    Object.freeze({ id: 'amethyst-fluorite', name: 'Amethyst Fluorite', description: 'Фиолетовый флюорит с холодным лиловым свечением.', body: '#302247', accent: '#b691f1', highlight: '#f0ddff', family: 'fluorite' }),
    Object.freeze({ id: 'blue-sandstone', name: 'Blue Sandstone', description: 'Ночное синее стекло с россыпью светлых граней.', body: '#163653', accent: '#70c7df', highlight: '#d5fbff', family: 'sandstone' }),
    Object.freeze({ id: 'rose-quartz', name: 'Rose Quartz', description: 'Пыльно-розовый кварц с тёплым жемчужным бликом.', body: '#6e424d', accent: '#efb6c2', highlight: '#fff0e6', family: 'quartz' }),
    Object.freeze({ id: 'prismatic-glass', name: 'Prismatic Glass', description: 'Прозрачный сине-зелёный сплав с радужной гранью.', body: '#3d6170', accent: '#9de8df', highlight: '#ecffff', family: 'prism' }),
  ]),
  tray: Object.freeze([
    Object.freeze({ id: 'dusk-oak', name: 'Butterfly Slate', description: 'Графитовый лоток с медной бабочкой и мягким тёмным дном.', floor: '#10161d', wall: '#2b3540', rim: '#73808a', accent: '#d3a06a', family: 'butterfly' }),
    Object.freeze({ id: 'star-covenant', name: 'Star Covenant', description: 'Сланцевое дно, созвездия и холодная бронза.', floor: '#101724', wall: '#202b40', rim: '#7c9bc1', accent: '#c7d9f6', family: 'star' }),
    Object.freeze({ id: 'moss-and-brass', name: 'Moss & Brass', description: 'Зелёный текстиль с медным сигилом.', floor: '#10201c', wall: '#1e3b31', rim: '#b68b51', accent: '#cbd899', family: 'moss' }),
    Object.freeze({ id: 'crimson-forge', name: 'Crimson Forge', description: 'Красная кожа и тёплые рёбра кованой меди.', floor: '#271315', wall: '#4d2021', rim: '#cc714d', accent: '#f5ad75', family: 'forge' }),
  ]),
  tower: Object.freeze([
    Object.freeze({ id: 'brass-arc', name: 'Brass Arc', description: 'Компактная башня из тёмного дерева и латуни.', body: '#4a2e1f', dark: '#160e0b', metal: '#c99a58', accent: '#f0ca83', family: 'wood' }),
    Object.freeze({ id: 'moon-spire', name: 'Moon Spire', description: 'Сланцевый корпус, серебряные направляющие и синий огонь.', body: '#263344', dark: '#0e141f', metal: '#7796b4', accent: '#b8def1', family: 'slate' }),
    Object.freeze({ id: 'verdant-keep', name: 'Verdant Keep', description: 'Зелёный камень и старое железо с мшистым свечением.', body: '#29423a', dark: '#0e1815', metal: '#91aa7b', accent: '#c7db9d', family: 'stone' }),
  ]),
  table: Object.freeze([
    Object.freeze({ id: 'obsidian-desk', name: 'Charcoal Desk', description: 'Графитовая поверхность, на которой лоток читается отдельным предметом.', surface: '#15191e', edge: '#2b3239', accent: '#b8835c', background: '#0c0f13', family: 'obsidian' }),
    Object.freeze({ id: 'lunar-slate', name: 'Lunar Slate', description: 'Холодный сланец, туманная синь и серебряный край.', surface: '#121b2a', edge: '#2d4058', accent: '#91b6e1', background: '#070c16', family: 'slate' }),
    Object.freeze({ id: 'deepwood-map', name: 'Deepwood Map', description: 'Тёмная зелень, медные линии и след старой карты.', surface: '#0d211a', edge: '#1b4233', accent: '#b9cb87', background: '#06100b', family: 'moss' }),
    Object.freeze({ id: 'ember-vault', name: 'Ember Vault', description: 'Графит, красное дерево и горячая медная кромка.', surface: '#211313', edge: '#4b2421', accent: '#e18a5f', background: '#110908', family: 'forge' }),
  ]),
});

export const DEFAULT_APPEARANCE = Object.freeze({
  dice: 'obsidian-ember',
  tray: 'dusk-oak',
  tower: 'brass-arc',
  table: 'obsidian-desk',
});

export const SKIN_CATEGORIES = Object.freeze(['dice', 'tray', 'tower', 'table']);
const SKIN_CATEGORY_LABELS = Object.freeze({ dice: 'Кости', tray: 'Лоток', tower: 'Башня', table: 'Фон' });

export function getSkin(category, id) {
  return SCENE_SKINS[category]?.find((skin) => skin.id === id) || null;
}

export function normalizeAppearance(input = {}) {
  const result = {};
  for (const category of SKIN_CATEGORIES) {
    result[category] = getSkin(category, input[category])?.id || DEFAULT_APPEARANCE[category];
  }
  return Object.freeze(result);
}

export function applyAppearanceToStage(stage, appearance, mode) {
  if (!stage) return;
  const normalized = normalizeAppearance(appearance);
  stage.dataset.mode = mode;
  stage.dataset.dieSkin = normalized.dice;
  stage.dataset.traySkin = normalized.tray;
  stage.dataset.towerSkin = normalized.tower;
  stage.dataset.tableSkin = normalized.table;
  stage.style.setProperty('--table-surface', getSkin('table', normalized.table)?.surface || '#0d1413');
  stage.style.setProperty('--table-edge', getSkin('table', normalized.table)?.edge || '#252e2a');
  stage.style.setProperty('--table-accent', getSkin('table', normalized.table)?.accent || '#b99458');
  stage.style.setProperty('--table-background', getSkin('table', normalized.table)?.background || '#070b0a');
}

function makePreviewElement(documentLike, category, skin) {
  const preview = documentLike.createElement('span');
  preview.className = `skin-preview skin-preview-${category}`;
  preview.dataset.skinFamily = skin.family;
  preview.style.setProperty('--preview-body', skin.body || skin.floor || skin.surface || '#1b1b1b');
  preview.style.setProperty('--preview-dark', skin.dark || skin.wall || skin.edge || '#090909');
  preview.style.setProperty('--preview-accent', skin.accent || skin.rim || '#c99d5a');
  preview.style.setProperty('--preview-metal', skin.metal || skin.rim || skin.accent || '#c99d5a');
  preview.style.setProperty('--preview-highlight', skin.highlight || skin.accent || skin.rim || '#c99d5a');

  if (category === 'dice') {
    const die = documentLike.createElement('span');
    die.className = `mini-die mini-die-${skin.family}`;
    die.textContent = '20';
    preview.append(die);
  } else if (category === 'tray') {
    const tray = documentLike.createElement('span');
    tray.className = 'mini-tray';
    if (skin.family === 'butterfly') {
      const butterfly = documentLike.createElement('i');
      butterfly.className = 'mini-butterfly';
      tray.append(butterfly);
    }
    preview.append(tray);
  } else if (category === 'tower') {
    const tower = documentLike.createElement('span');
    tower.className = 'mini-tower';
    tower.innerHTML = '<i></i><b></b><em></em>';
    preview.append(tower);
  } else {
    const table = documentLike.createElement('span');
    table.className = 'mini-table';
    preview.append(table);
  }
  return preview;
}

export function renderSkinCards(documentLike, root, category, appearance, onChoose) {
  if (!root) return;
  const normalized = normalizeAppearance(appearance);
  root.replaceChildren();
  for (const skin of SCENE_SKINS[category] || []) {
    const card = documentLike.createElement('button');
    card.type = 'button';
    card.className = 'skin-card';
    card.dataset.skinId = skin.id;
    card.dataset.category = category;
    card.setAttribute('aria-pressed', normalized[category] === skin.id ? 'true' : 'false');
    if (normalized[category] === skin.id) card.classList.add('is-selected');
    card.append(makePreviewElement(documentLike, category, skin));

    const copy = documentLike.createElement('span');
    copy.className = 'skin-card-copy';
    const name = documentLike.createElement('strong');
    name.textContent = skin.name;
    const description = documentLike.createElement('small');
    description.textContent = skin.description;
    const state = documentLike.createElement('em');
    state.textContent = normalized[category] === skin.id ? 'Выбрано' : 'Выбрать';
    copy.append(name, description, state);
    card.append(copy);
    card.addEventListener('click', () => onChoose(category, skin.id));
    root.append(card);
  }
}

export function renderSkinMenus(documentLike, root, appearance, onChoose) {
  if (!root) return;
  const normalized = normalizeAppearance(appearance);
  root.replaceChildren();

  for (const category of SKIN_CATEGORIES) {
    const skins = SCENE_SKINS[category] || [];
    const selectedId = normalized[category];
    const selectedSkin = getSkin(category, selectedId) || skins[0];
    const details = documentLike.createElement('details');
    details.className = 'skin-menu';
    details.dataset.skinCategory = category;

    const summary = documentLike.createElement('summary');
    summary.className = 'skin-menu-summary';
    const summaryCopy = documentLike.createElement('span');
    summaryCopy.className = 'skin-menu-summary-copy';
    const categoryName = documentLike.createElement('strong');
    categoryName.textContent = SKIN_CATEGORY_LABELS[category];
    const categoryHint = documentLike.createElement('small');
    categoryHint.textContent = category === 'table' ? 'TABLE / ENVIRONMENT' : `${category.toUpperCase()} SKIN`;
    summaryCopy.append(categoryName, categoryHint);
    const summaryValue = documentLike.createElement('span');
    summaryValue.className = 'skin-menu-summary-value';
    summaryValue.textContent = selectedSkin?.name || selectedId;
    const chevron = documentLike.createElement('span');
    chevron.className = 'drawer-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '⌄';
    summary.append(summaryCopy, summaryValue, chevron);

    const body = documentLike.createElement('div');
    body.className = 'skin-menu-body';
    const preview = selectedSkin ? makePreviewElement(documentLike, category, selectedSkin) : null;
    if (preview) {
      preview.classList.add('skin-menu-preview');
      body.append(preview);
    }
    const field = documentLike.createElement('label');
    field.className = 'skin-select-field';
    const fieldLabel = documentLike.createElement('span');
    fieldLabel.textContent = 'Выбрать оформление';
    const select = documentLike.createElement('select');
    select.className = 'skin-select';
    select.dataset.skinCategory = category;
    select.setAttribute('aria-label', `Выбор скина: ${SKIN_CATEGORY_LABELS[category]}`);
    skins.forEach((skin) => {
      const option = documentLike.createElement('option');
      option.value = skin.id;
      option.textContent = skin.name;
      option.selected = skin.id === selectedId;
      select.append(option);
    });
    select.addEventListener('change', () => onChoose?.(category, select.value));
    field.append(fieldLabel, select);
    const description = documentLike.createElement('p');
    description.className = 'skin-menu-description';
    description.textContent = selectedSkin?.description || '';
    body.append(field, description);
    details.append(summary, body);
    root.append(details);
  }
}

function makeDieToken(documentLike, value, die, skin, index, phase) {
  const token = documentLike.createElement('article');
  token.className = `die-token die-token-${die.family} die-skin-${skin.family}`;
  if (phase === 'rolling') token.classList.add('is-rolling');
  token.dataset.die = die.id;
  token.dataset.skin = skin.id;
  token.dataset.result = String(value);
  token.dataset.index = String(index + 1);
  token.style.setProperty('--die-body', skin.body);
  token.style.setProperty('--die-accent', skin.accent);
  token.style.setProperty('--die-highlight', skin.highlight);
  token.style.setProperty('--die-delay', `${index * 70}ms`);

  const shell = documentLike.createElement('div');
  shell.className = 'die-shell';
  const type = documentLike.createElement('span');
  type.className = 'die-shell-type';
  type.textContent = die.label;
  const result = documentLike.createElement('strong');
  result.className = 'die-shell-value';
  result.textContent = String(value);
  const mark = documentLike.createElement('span');
  mark.className = 'die-shell-mark';
  mark.textContent = index === 0 ? '✦' : String(index + 1).padStart(2, '0');
  shell.append(type, result, mark);
  token.append(shell);
  return token;
}

export function renderDice(documentLike, root, event, appearance, phase = 'idle', rendererStatus = 'ready') {
  if (!root) return;
  root.replaceChildren();
  root.classList?.toggle('has-result', Boolean(event));
  if (rendererStatus !== 'ready') {
    const blocked = documentLike.createElement('div');
    blocked.className = `dice-empty dice-empty-${rendererStatus}`;
    blocked.innerHTML = rendererStatus === 'failed'
      ? '<span>!</span><strong>WebGL-сцена недоступна</strong><small>Бросок заблокирован до восстановления 3D-рендера</small>'
      : '<span>✦</span><strong>3D-сцена загружается</strong><small>Результат появится после готовности WebGL</small>';
    root.append(blocked);
    return;
  }
  if (!event) {
    const empty = documentLike.createElement('div');
    empty.className = 'dice-empty';
    empty.innerHTML = '<span>✦</span><strong>Выбери кость и брось</strong><small>Результат появится здесь</small>';
    root.append(empty);
    return;
  }
  const die = DIE_TYPES.find((item) => item.id === event.die) || DIE_TYPES[5];
  const skin = getSkin('dice', normalizeAppearance(appearance).dice) || SCENE_SKINS.dice[0];
  event.outcomes.forEach((value, index) => root.append(makeDieToken(documentLike, value, die, skin, index, phase)));
}
