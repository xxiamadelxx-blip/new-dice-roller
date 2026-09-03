# New Dice Roller — Roadmap

## Product intent

Create a focused D&D dice application for d4 through d100. The experience should feel like placing a small arcane instrument on a desk: choose a die, choose a scene, roll once, read the result immediately and keep a reliable history.

The product is deliberately independent from every existing dice roller. This roadmap defines a new implementation, new state model, new visual language and new verification path.

## Current implementation status

- M0 boundaries and allowed-integration audit: confirmed.
- M1 roll core: confirmed by 11 passing Node tests and syntax checks.
- M2 scene, M3 Skin Studio and M4 QA bridge: implemented with an own WebGL2 renderer, procedural material catalog and candidate scene, pending real visual capture and user approval.
- M5 Ø Browser: source contract is implemented; live smoke is held because the repository Pages workflow cannot create the Pages site with the current integration token (`Resource not accessible by integration`).
- M6 Cloud Test Stand: held because this deliverable is static web, not an Android APK. No native pass is claimed.

## Current sequence

1. Repository boundary and acceptance contract.
2. Core roll engine and deterministic tests.
3. One complete table-mode vertical slice.
4. Separate tray and tower modes.
5. Skin Studio for dice/tray/tower/table.
6. Visual Lab and QA-pult integration.
7. Ø Browser/WebView smoke.
8. Exact-SHA Cloud Test Stand handoff.
9. User visual review and release candidate.

Only one primary milestone is active at a time. New ideas are recorded here and do not silently enter the current slice.

## Initial product model

### Roll request

A request contains:

- die type: d4, d6, d8, d10, d12, d20 or d100;
- count: bounded positive integer;
- optional modifier;
- scene mode: table, tray or tower;
- selected cosmetic IDs;
- client roll ID and timestamp.

The core returns:

- one result per die;
- total;
- modifier and final total;
- committed-before-animation state;
- roll ID;
- stable display string.

### Scene model

~~~text
Scene
├── Table / background
├── Active container
│   ├── Table surface
│   ├── Tray
│   └── Tower
└── Dice set
~~~

The table, tray, tower and dice skins are independent. The active container is a mode choice, not four simultaneous visual products.

### Initial visual language

Working name: Obsidian Arcana.

- deep green-black desk and soft vignette;
- brass linework used as a restrained accent;
- tray inspired by a real octagonal dice tray: raised rim, inset floor, visible material separation;
- tower inspired by a compact fantasy dice tower: base, vertical body, funnel and exit, without turning the entire screen into a permanent prop;
- dice families: obsidian, moonstone, verdant stone, blood glass and pale opal;
- typography: high-contrast serif display for results, compact sans-serif controls;
- motion: short, weighty, readable, with a stable settled pose.

The attached user references guide mood and material vocabulary. They are not a license to copy a third-party product or use a stock image as the runtime object.

## Own-the-stack decisions

- Roll core is written locally in this repository.
- Renderer is written locally in this repository and has no CDN requirement.
- Dice geometry/number presentation is owned by this repository.
- Visual assets are either repository-owned, generated with recorded provenance, or explicitly approved references.
- QA fields are designed locally but exposed in a way that Ø Browser can inspect.
- Cloud Test Stand receives an exact artifact; it does not become a product dependency.
- Ø Browser is a host/verification surface; it does not own application state.

## Visual Lab adaptation

The Visual Lab layer will have three separate states:

1. technical: asset/scene can load and render;
2. verification: fixed viewport/capture/console checks pass;
3. artistic: the user approves the exact visual candidate.

No generated preview, automated test or agent may promote itself to artistic approval.

## Planned deliverables by milestone

### M1 — Roll core

Own src/core/ and tests/core/. Keep rendering absent from the core tests. Include rejection sampling, normalization, modifiers, history serialization and invalid-input behavior.

### M2 — Table slice

Own index.html, src/, styles/, assets/ and a no-dependency browser entry. Implement one readable die, one table theme and a truthful settled result.

### M3 — Container modes

Add tray and tower as separate scene objects. Ensure switching mode removes/hides the previous active container and leaves one active container only.

### M4 — Skin Studio

Add catalog manifests, previews, local persistence and selected states. Every preview must represent the category it names.

### M5 — QA and capture

Add a hidden-by-default QA panel or debug route, deterministic fixture controls, capture manifest and renderer gate. Keep QA controls out of the main user flow.

### M6 — Host verification

Prepare an exact-SHA static web artifact and, only if an Android wrapper is explicitly included, a native artifact for Cloud Test Stand. Use Ø Browser for interaction smoke and the Cloud Test Stand for native claims.

## Non-goals for the first release

- multiplayer rooms;
- accounts and cloud saves;
- paid skin store;
- AI-generated game master;
- hidden remote control;
- importing another dice roller's source;
- claiming full physical collision simulation before it is actually implemented and verified.

## Decisions still requiring user visual review

- final logo/wordmark;
- exact first production skin family;
- tower silhouette and level of ornament;
- whether the default launch mode is table or tray;
- final sound/vibration balance.

Until reviewed, these are DEV candidates, not golden production art.
