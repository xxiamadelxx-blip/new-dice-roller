# New Dice Roller — Milestones

Дата фиксации: 2026-09-03.
Репозиторий: xxiamadelxx-blip/new-dice-roller.
Статус до начала реализации: пустой репозиторий; продукт создаётся с нуля.

Статусы:

- Confirmed — подтверждено свежей проверкой.
- Active — текущий рабочий этап.
- Partial — часть критериев доказана, полный gate ещё нет.
- Open — запланировано и не принято.
- Held — сознательно отложено зависимой задачей.

## M0. Границы и рабочая спецификация — Active

- Зафиксирован greenfield-статус.
- Запрещено использовать другие проекты с бросками кубиков.
- Созданы AGENT_SKILL.md, MILESTONES.md, CHECKLIST.md и ROADMAP.md.
- Разрешённые внешние зависимости ограничены Visual Lab/QA, Cloud Test Stand, Ø Browser и пользовательскими визуальными референсами.
- Следующий gate: завершить аудит только разрешённых репозиториев.

## M1. Собственный roll core — Open

- Каталог d4/d6/d8/d10/d12/d20/d100.
- Независимый Web Crypto RNG с rejection sampling.
- Нормализация запроса броска, количество кубиков, сумма и детальные результаты.
- Результат фиксируется до начала анимации.
- История, повтор, копирование результата и восстановление локального состояния.
- Unit/contract tests для границ и ошибок.

## M2. Собственная визуальная сцена — Open

- Mobile-first сцена с одним активным контейнером.
- Отдельные модели/слои table, tray, tower и dice.
- Процедурные или repository-owned визуальные ассеты без сетевых CDN-зависимостей.
- Действительно читаемые номера на d4–d100.
- Анимация броска представляет заранее выбранные значения.
- Явный renderer gate: ready / failed, без ложного fallback-free статуса.

## M3. Skin Studio — Open

- Категории dice, tray, tower, table/background.
- В каждой карточке — честный preview соответствующей сущности.
- Состояния selected / available / unavailable.
- Сохранение косметики локально.
- Cosmetic changes не изменяют roll core.
- Первый утверждённый визуальный набор проходит пользовательскую визуальную проверку.

## M4. QA-пульт и Visual Lab bridge — Open

- Debug/QA-панель отделена от пользовательского режима.
- Машиночитаемые стабильные поля: profile, renderer status, fallback, phase, frame/capture id, last roll id.
- Deterministic fixture для фиксированного состояния сцены.
- Capture manifest с viewport, DPR, commit SHA, asset IDs и результатом технической проверки.
- Автоматическая проверка не объявляет художественное APPROVE.

## M5. Ø Browser compatibility — Open

- Приложение открывается в Ø Browser/WebView как обычный статический web runtime.
- Tap, scroll, input, copy и roll работают на мобильном viewport.
- Нет секретов и удалённых команд в приложении.
- Проверены foreground/background и восстановление состояния настолько, насколько это поддерживает текущий браузер.

## M6. Android Cloud Test Stand handoff — Open

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
