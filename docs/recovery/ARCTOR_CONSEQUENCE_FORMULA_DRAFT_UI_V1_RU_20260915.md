# ARCTOR Consequence Constructor — Formula Draft UI V1

Дата: 2026-09-15
Baseline: `d458bf66bb26c86b80fab89c9bd62afa0b714a47`

## Цель

Вывести уже готовый server draft gate непосредственно в интерфейс «Конструктора последствий».

## Что изменено

Страница `/admin/consequence-constructor` теперь для каждого выбранного целевого ОН показывает отдельный блок черновика формулы.

В блоке доступны:

- целевой ОН;
- версия active `parameter_registry_v2` profile, если она есть;
- уже существующие draft rules;
- список активных системных параметров, реально назначенных этому целевому ОН;
- выбор целевого параметра;
- кнопка `Создать черновик`;
- объяснение, почему draft пока нельзя создать.

## Readiness

UI использует server readiness и не пытается самостоятельно обходить ограничения.

Возможные состояния:

- `awaiting_template`;
- `missing_active_v2_profile`;
- `source_parameter_not_in_profile`;
- `no_target_parameters`;
- `ready`.

## Создание draft

Кнопка вызывает существующий server action:

`create_formula_draft`

После успешного создания страница перечитывает очередь и показывает уже созданное правило.

Если для выбранного target parameter draft уже существует, повторное создание блокируется в UI; server при этом также остаётся идемпотентным.

## Что намеренно не добавлено

- Formula Builder;
- редактирование математического выражения;
- publish;
- testing;
- executor;
- запись result/snapshot;
- lineage;
- recalculation execution.

Текущий draft всё ещё имеет `draftIncomplete=true` и placeholder expression.

## Локализация

Добавлены подписи блока formula draft для:

- EN;
- RU;
- PL;
- UK;
- DE;
- ES;
- CS.

Также обновлено прежнее пояснение страницы: оно больше не утверждает, что формулы вообще не создаются, а объясняет, что сейчас создаётся только draft semantic rule без математического выражения.

## Проверки

Launcher выполняет:

- exact baseline;
- clean worktree;
- server gate precheck;
- exact patch markers;
- ESLint страницы;
- `tsc --noEmit`;
- production build;
- exact staged-file allowlist;
- `git diff --cached --check`;
- commit;
- push;
- remote `main` SHA verification.

## Точка продолжения

Следующий gate — Formula Builder V1.

Он должен позволить куратору открыть существующий draft и задать:

1. входы;
2. условие;
3. математическое выражение;
4. роль результата;
5. единицу результата;
6. политику отсутствующих данных;
7. триггеры пересчёта.

После Formula Builder нужен отдельный test/publish gate. Исполнение формул до него не включать.
