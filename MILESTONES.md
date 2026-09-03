# New Dice Roller — Milestones

Дата фиксации: 2026-09-03.
Репозиторий: xxiamadelxx-blip/new-dice-roller.
Начальный статус был зафиксирован как greenfield; core и web-срез теперь реализованы в этом репозитории.

Статусы:

- Confirmed — подтверждено свежей проверкой.
- Active — текущий рабочий этап.
- Partial — часть критериев доказана, полный gate ещё нет.
- Open — запланировано и не принято.
- Held — сознательно отложено зависимой задачей.

## M0. Границы и рабочая спецификация — Confirmed

- Зафиксирован greenfield-статус.
- Запрещено использовать другие проекты с бросками кубиков.
- Созданы AGENT_SKILL.md, MILESTONES.md, CHECKLIST.md и ROADMAP.md.
- Разрешённые внешние зависимости ограничены Visual Lab/QA, Cloud Test Stand, Ø Browser и пользовательскими визуальными референсами.
- Gate закрыт: проверены только разрешённые Visual Lab/QA, Cloud Test Stand, Ø Browser и пользовательские изображения.

## M1. Собственный roll core — Confirmed

- Каталог d4/d6/d8/d10/d12/d20/d100.
- Независимый Web Crypto RNG с rejection sampling.
- Нормализация запроса броска, количество кубиков, сумма и детальные результаты.
- Результат фиксируется до начала анимации.
- История, повтор, копирование результата и восстановление локального состояния.
- Unit/contract tests для границ и ошибок: `npm test` — 11/11 passed; `npm run check` — passed; WebGL renderer syntax checked.

## M2. Собственная визуальная сцена — Partial

- Mobile-first сцена с одним активным контейнером.
- Отдельные модели/слои table, tray, tower и dice.
- Процедурные или repository-owned визуальные ассеты без сетевых CDN-зависимостей.
- Действительно читаемые номера на d4–d100.
- Анимация броска представляет заранее выбранные значения.
- Явный renderer gate: ready / failed, без ложного fallback-free статуса.

WebGL2 canvas renderer и authored polyhedron meshes реализованы; реальный browser visual capture удержан до доступного HTTPS entry point.

## M3. Skin Studio — Partial

- Категории dice, tray, tower, table/background.
- В каждой карточке — честный preview соответствующей сущности.
- Состояния selected / available / unavailable.
- Сохранение косметики локально.
- Cosmetic changes не изменяют roll core.
- Первый визуальный набор собран как candidate; пользовательская визуальная проверка ещё не пройдена.

## M4. QA-пульт и Visual Lab bridge — Partial

- Debug/QA-панель отделена от пользовательского режима.
- Машиночитаемые стабильные поля: profile, renderer status, fallback, phase, frame/capture id, last roll id.
- Deterministic fixture для фиксированного состояния сцены.
- Capture manifest с viewport, DPR, commit SHA, asset IDs и результатом технической проверки.
- Автоматическая проверка не объявляет художественное APPROVE.

QA bridge и deterministic fixture реализованы; capture evidence ещё не принят.

## M5. Ø Browser compatibility — Partial

- Приложение открывается в Ø Browser/WebView как обычный статический web runtime.
- Tap, scroll, input, copy и roll работают на мобильном viewport.
- Нет секретов и удалённых команд в приложении.
- Контракт статического HTTP/HTTPS runtime и semantic controls реализован.
- Live smoke, foreground/background и copy в Ø Browser не подтверждены из-за недоступного локального URL и не включённого Pages.

## M6. Android Cloud Test Stand handoff — Held

- Создан exact-SHA artifact из нового репозитория.
- Зафиксированы SHA-256 APK/artifact и тестовый target.
- Запущен только zero-payment native route из Cloud Test Stand.
- Сохранены screenshots/logs/test results.
- Native acceptance не объявляется по одному browser или source check.

## M7. Release candidate — Held

Зависит от M2–M6.

- Нет uncaught runtime errors.
- Нет скрытого 2D/placeholder fallback.
- Roll distribution и границы dice types проверены.
- Responsive visual candidate принят пользователем.
- Offline/static runtime и Android/WebView package готовы к отдельному release решению.
