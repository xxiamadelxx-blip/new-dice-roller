# QA handoff

## Browser / Ø Browser compatibility contract

- приложение отдаётся как статический web runtime;
- открытие рассчитано на `http://` или `https://`;
- основной smoke URL: `/?qa=1`;
- semantic QA bridge: `window.__NDR_QA__`;
- renderer profile: `adel-dice-webgl-v1` / `webgl2-canvas-v1`;
- `getState()` возвращает профиль, renderer status, phase, frame и последний roll;
- `getManifest()` возвращает технический candidate manifest;
- `loadFixture()` загружает `d20 × 3 + 2` с исходами `[20, 1, 13]` и итогом `36`;
- `fallback=false`: при отсутствии WebGL2 приложение блокирует бросок и фиксирует renderer error, а не скрывает проблему CSS/2D-рендером.

## Cloud Test Stand boundary

Текущий deliverable — web-прототип и не является Android APK. Поэтому этот этап не заявляет native smoke, Firebase Test Lab pass или CircleCI pass. Для будущего Android wrapper обязательны:

1. точный source repository и commit SHA;
2. воспроизводимый APK/AAB и SHA-256;
3. запуск только через разрешённый no-cost маршрут стенда;
4. отдельный отчёт о native evidence.

Нельзя подменять browser evidence результатом Android стенда.
