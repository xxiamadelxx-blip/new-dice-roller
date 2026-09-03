import test from 'node:test';
import assert from 'node:assert/strict';
import { DIE_TYPES } from '../src/core.js';
import {
  DEFAULT_APPEARANCE,
  SCENE_SKINS,
  SKIN_CATEGORIES,
  normalizeAppearance,
  renderDice,
} from '../src/scene.js';
import { WEBGL_PROFILE } from '../src/webgl-scene.js';

test('greenfield scene catalog has independent authored layers', () => {
  assert.deepEqual(SKIN_CATEGORIES, ['dice', 'tray', 'tower', 'table']);
  for (const category of SKIN_CATEGORIES) {
    assert.ok(SCENE_SKINS[category].length > 0);
    assert.ok(SCENE_SKINS[category].every((skin) => skin.id && skin.name && skin.family));
  }
});

test('appearance normalization never changes the dice catalog', () => {
  const appearance = normalizeAppearance({ dice: 'not-a-skin', tray: 'star-covenant' });
  assert.equal(appearance.dice, DEFAULT_APPEARANCE.dice);
  assert.equal(appearance.tray, 'star-covenant');
  assert.deepEqual(DIE_TYPES.map((die) => die.id), ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);
});

test('WebGL renderer exposes the Visual Lab profile', () => {
  assert.equal(WEBGL_PROFILE, 'adel-dice-webgl-v1');
});

test('scene never presents committed dice through a CSS fallback when WebGL is unavailable', () => {
  const makeNode = () => ({
    children: [],
    className: '',
    innerHTML: '',
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
  });
  const documentLike = { createElement: () => makeNode() };
  const root = makeNode();

  renderDice(documentLike, root, { die: 'd20', outcomes: [20] }, DEFAULT_APPEARANCE, 'settled', 'failed');

  assert.equal(root.children.length, 1);
  assert.equal(root.children[0].className, 'dice-empty dice-empty-failed');
  assert.match(root.children[0].innerHTML, /WebGL-сцена недоступна/);
});
