# New Dice Roller — Acceptance Checklist

Дата: 2026-09-03.
Состояние: планирование / greenfield.

## A. Scope and repository hygiene

- [x] Основной репозиторий выбран: new-dice-roller.
- [x] Продукт создаётся с нуля.
- [x] Dmmaster, Dice-Roll-suca и любые другие проекты с бросками кубиков исключены из источников.
- [x] Разрешённые внешние границы записаны в AGENT_SKILL.md.
- [x] Для текущей задачи созданы MILESTONES.md, CHECKLIST.md и ROADMAP.md.
- [ ] После каждого существенного среза проверять diff/commit и не затрагивать соседние репозитории.

## B. Roll core

- [ ] d4 выдаёт только целые значения 1–4.
- [ ] d6 выдаёт только целые значения 1–6.
- [ ] d8 выдаёт только целые значения 1–8.
- [ ] d10 выдаёт только целые значения 1–10.
- [ ] d12 выдаёт только целые значения 1–12.
- [ ] d20 выдаёт только целые значения 1–20.
- [ ] d100 выдаёт только целые значения 1–100.
- [ ] Количество кубиков и сумма считаются независимо от renderer.
- [ ] Roll result фиксируется до начала визуальной анимации.
- [ ] Web Crypto unavailable приводит к явной ошибке/блокировке, а не к скрытому Math.random.
- [ ] Повреждённый запрос отклоняется без частичного результата.
- [ ] История и копирование отображают именно committed result.

## C. Scene and visuals

- [ ] Главная сцена удобна на телефоне без горизонтального скролла.
- [ ] Активен только один контейнер броска: table, tray или tower.
- [ ] Лоток остаётся отдельным объектом, а не перекраской стола.
- [ ] Башня остаётся отдельным объектом и не занимает сцену в других режимах.
- [ ] Кубик остаётся отдельным объектом со своим skin ID.
- [ ] Фон/table theme не меняет tray/tower/dice skin.
- [ ] На d4–d100 цифры читаются в settled frame.
- [ ] Бросок визуально показывает заранее выбранные значения.
- [ ] Нет ложного сообщения 3D/WebGL ready, если renderer не готов.
- [ ] Нет молчаливого 2D fallback, маскирующего ошибку требуемого renderer.

## D. Skin Studio

- [ ] Есть отдельные вкладки dice / tray / tower / table.
- [ ] Карточка каждой категории показывает соответствующую сущность.
- [ ] Выбранный skin заметен и сохраняется после перезагрузки.
- [ ] Изменение skin не меняет roll result.
- [ ] Unavailable/error state объясняет причину.
- [ ] Visual candidate имеет provenance/asset manifest.
- [ ] Художественное APPROVE остаётся ручным решением пользователя.

## E. QA / Visual Lab

- [ ] QA-пульт не нужен для обычного броска.
- [ ] QA state содержит profile, renderer, fallback, phase и frame/capture identity.
- [ ] Есть deterministic fixture для screenshots.
- [ ] Снимок делается только после settled state.
- [ ] Console/page errors сохраняются при browser capture.
- [ ] Технический pass не превращается в художественное approval.
- [ ] Failure capture не перезаписывается успешным результатом.

## F. Ø Browser

- [ ] Статическая страница открывается в dedicated WebView.
- [ ] Работают безопасные taps по dice controls, mode controls и roll.
- [ ] Работают scroll, input и copy.
- [ ] После background/foreground состояние не ломается.
- [ ] Приложение не требует GitHub token, Supabase key или remote command relay для локального броска.

## G. Cloud Test Stand

- [ ] Зафиксированы repository, branch и exact 40-character commit SHA.
- [ ] Зафиксирован artifact name и SHA-256.
- [ ] Пройден zero-payment build/test route.
- [ ] Native screenshot/logcat/test result сохранены.
- [ ] Проверено, что провайдер запускал именно требуемый SHA.
- [ ] Любой quota/auth blocker записан и не обходится оплатой.
- [ ] Android acceptance не объявлена без native evidence.

## H. Completion gate

- [ ] test/build (или фактические команды нового runtime) зелёные.
- [ ] Browser visual capture проверен глазами.
- [ ] Ø Browser smoke пройден.
- [ ] Cloud/native verification пройден или явно отмечен как blocker.
- [ ] README/status обновлены только подтверждёнными фактами.
- [ ] Финальный отчёт перечисляет изменённые пути и непроверенные claims.
