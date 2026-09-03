# Agent Skill — New Dice Roller

## Identity

This repository is the greenfield source of truth for a new D&D dice application. It starts empty by design. Every product decision, runtime module, visual system and test fixture is created here from first principles.

## Absolute source boundary

Do not inspect, copy, import, port, imitate structurally, or derive architecture from any other dice-rolling project.

Forbidden sources include all unlisted dice rollers, historical dice experiments, generated dice HTML, Android dice implementations and their tests or roadmaps. In particular, do not use Dmmaster, Dice-Roll-suca or any other dice application.

The only permitted external references for this repository are:

1. this repository: xxiamadelxx-blip/new-dice-roller;
2. xxiamadelxx-blip/out-of-abyys, only for its Visual Lab / visual QA principles and the explicitly requested QA-console ideas;
3. xxiamadelxx-blip/android-cloud-test-stand, only for isolated native verification infrastructure and evidence contracts;
4. xxiamadelxx-blip/-browser-ai-android, only for Ø Browser/WebView compatibility and safe browser control;
5. the user-provided visual references attached to the task;
6. user-approved skin/asset repositories only when they are asset references and are not dice-roller projects.

External repositories are reference material, not product source. Do not copy their code, file layout, state, roadmap, generated artifacts, tests, runtime assumptions, credentials or deployment configuration.

## Product contract

The first product is a self-contained, mobile-first web application that can run from a normal browser and inside Ø Browser/WebView.

Required dice:

- d4
- d6
- d8
- d10
- d12
- d20
- d100

The local roll result is authoritative and is generated before any animation begins. Visual motion only presents that already-selected result. A visual failure must never silently replace the roll with a different result.

The local RNG must use Web Crypto with rejection sampling for unbiased integer selection. If a trusted RNG is unavailable, the app must show a truthful blocked/error state instead of pretending that a fair roll happened.

Cosmetics are independent entities:

- dice skin;
- tray skin;
- tower skin;
- table/background theme.

A cosmetic change must not alter dice rules or outcomes. A roll mode may show one active container at a time: table, tray or tower.

## Visual direction

The initial art direction is a dark premium arcane desk:

- obsidian, deep forest, slate and muted plum as base families;
- restrained brass/gold or cold silver as accents;
- tactile stone, wood, leather, textile and glass cues;
- readable numbers at phone size;
- no fake thumbnail rectangles where a real procedural preview can be shown;
- no black glossy UI wash that hides the dice;
- no permanent tower cluttering the main scene when another roll mode is active.

Visual Lab rules are adapted for this project:

- separate technical validity from artistic approval;
- keep candidate/provenance metadata for generated or imported assets;
- test visuals at the real gameplay scale and phone viewport;
- capture deterministic candidates only after the scene is stable;
- an automated QA pass is not a human visual approval;
- rejected visual candidates must remain marked as rejected and must not silently become production assets.

## Engineering rules

- Read this file before substantial work.
- Keep one active milestone and one coherent write surface at a time.
- Build a thin end-to-end slice before adding breadth.
- Use stable IDs for dice, skins, scene modes, roll events and QA fields.
- Keep core rules independent from rendering and browser transport.
- Do not add a backend, account, payment system or external runtime dependency to make local rolling work.
- Do not include secrets, tokens, private URLs or service-role credentials in source, artifacts, screenshots or logs.
- Do not claim WebGL, native Android or cloud acceptance from source inspection alone.
- Preserve unrelated user work.
- Do not deploy, publish, merge, delete data or modify the other allowed repositories unless separately requested.

## Verification contract

Every milestone must map to fresh evidence:

- unit tests for RNG, dice normalization, roll state and result invariants;
- browser checks for the real tap/keyboard path;
- visual checks at fixed phone viewport with console/page-error capture;
- truthful QA state for renderer readiness, fallback, phase and frame/capture identity;
- Ø Browser verification for opening and interacting with the app;
- Cloud Test Stand evidence for any native Android claim, pinned to exact source SHA and artifact hash.

A source slot, catalog entry, placeholder, DOM node or configured test provider is not proof that the corresponding feature works.

## Handoff format

At the end of a task report:

1. observable behavior implemented;
2. changed paths;
3. verification commands and exact results;
4. assumptions and compatibility decisions;
5. unresolved blockers and unverified claims;
6. work deliberately not performed because it was outside this repository boundary.
