# Allowed Integration Audit

Дата: 2026-09-03.
Цель: понять, какие части разрешённых инструментов можно использовать для нового приложения без переноса чужого dice-roller кода.

## Разрешённая область

Аудированы только:

- xxiamadelxx-blip/out-of-abyys;
- xxiamadelxx-blip/android-cloud-test-stand;
- xxiamadelxx-blip/-browser-ai-android, branch feature/lightpanda-agent-polish-0.4;
- пользовательские изображения, прикреплённые к задаче.

Другие проекты с бросками кубиков и другие продуктовые реализации не являются источниками.

## Visual Lab / QA

В out-of-abyys полезны не исходники роллера, а правила production gate:

- техническая валидность и художественное утверждение — разные состояния;
- визуальный candidate сначала проверяется в реальном игровом масштабе;
- provenance/asset ID/версия/входные данные должны быть сохранены там, где они применимы;
- автоматический capture является candidate evidence и не объявляет пользовательское художественное APPROVE;
- rejected candidate не должен незаметно стать production asset.

В текущем разрешённом срезе нет отдельного универсального Visual Studio/QA-пакета, который можно безопасно подключить как готовую библиотеку. Поэтому в этом репозитории будет свой маленький QA-пульт:

- скрыт в обычном пользовательском режиме;
- доступен через отдельный QA-флаг/режим;
- показывает renderer, fallback, phase, last roll, active mode, skin IDs, viewport и capture identity;
- экспортирует только безопасный JSON manifest;
- не вмешивается в roll core и не выдаёт художественное APPROVE.

## Android Cloud Test Stand

Cloud Test Stand остаётся внешним verification boundary:

- source repository, branch и exact 40-character SHA фиксируются до native run;
- artifact получает SHA-256;
- провайдерская конфигурация не считается доказательством;
- используются только no-payment rails;
- quota/auth blocker фиксируется и приводит к failover/stop, а не к оплате;
- stand не становится вторым продуктовым репозиторием.

Для текущего web-first среза native acceptance не заявляется. Если появится Android wrapper, в stand передаётся exact artifact после его сборки, а не исходники приложения или временный snapshot.

## Ø Browser

В текущей ветке Ø Browser:

- canonical development branch — feature/lightpanda-agent-polish-0.4;
- удалённое открытие страницы ограничено HTTP/HTTPS;
- предпочтительны semantic snapshot и стабильные интерактивные элементы;
- screenshot transport является отдельным descriptor/private-artifact контуром;
- AGENT OFF и локальная безопасность имеют абсолютный приоритет;
- секреты, cookies и raw private page bodies не должны попадать в приложение или QA manifest.

Следствие для new-dice-roller:

- статический runtime без CDN и обязательного backend;
- мобильные кнопки/поля с доступными labels и стабильными data attributes;
- рабочий HTTPS entry point потребуется для реального Ø Browser smoke;
- приложение не зависит от удалённых команд Ø Browser для обычного броска.

## Решение по эффективной переработке

Делаем локальный мост из трёх независимых слоёв:

1. Roll Core — числа, правила, RNG и история.
2. Scene/UI — собственная сцена, кубики, лоток, башня, фон и Skin Studio.
3. QA/Host — безопасное состояние для Visual Lab, Ø Browser и Cloud Test Stand.

Это использует полезные verification principles разрешённых проектов, но не импортирует их код, структуру, state model или product behavior.
