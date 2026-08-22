# ARCTOR_VO_MIND_MAP_V1_AUTHORING

Дата: 2026-08-22
Source baseline: `911d8c0f0dbb658f07fc47328cac5db760c26ed7` (`vo-mind-map-v0-readonly`)
DB schema change: NONE

## Точка восстановления

Mind Map V0 CLOSED/PASS. Реальная карта уже читает тот же `value_objects.parent_value_object_id`, что Tree/Cards, отображает две рабочие ветви, поддерживает EN/PL/RU/UK/DE/ES/CS, zoom/pan/fit и collapse/expand. React Flow остаётся `@xyflow/react@12.11.3`, attribution видима.

Контрольные ветви:

- `Human body → Musculoskeletal system → Back muscles → Latissimus dorsi`;
- `Activity → Physical activity → Pull-ups → Narrow-grip pull-up`.

## Решение V1

V1 переводит Map из read-only visualization в controlled authoring surface, но не вводит новых write contracts.

Разрешены три операции:

1. root → `+ Intermediate`;
2. intermediate → `+ Intermediate` или `+ Leaf`;
3. guarded Delete для private user-declared initial-version объекта.

Создание не выполняется новым API из React Flow. Кнопки карты ведут в уже проверенные controlled authoring pages:

- `/value-objects/{id}/new-intermediate`;
- `/value-objects/{id}/new-leaf`.

Таким образом, V1 наследует текущие branch rules, localization create-time generation, double-submit guard и success-state существующих форм.

## Guarded Delete

Map использует уже существующий `DELETE /api/value-objects/{id}` и не создаёт второй delete RPC/contract.

Кнопка удаления показывается только для кандидата, который на catalog payload выглядит как:

- не `scope_code=global`;
- не `usage_scope=commercial`;
- `origin_type_code=user_declared`;
- `definition_version=1` (или отсутствующее legacy значение трактуется как initial version).

Это только UI prefilter. Авторитетный серверный guard остаётся прежним и fail-closed блокирует children, facts, activity/template links, relations, goals, commercial references и любые другие protected dependencies.

После успешного DELETE map вызывает callback каталога, и объект сразу удаляется из текущего client state без полной перезагрузки страницы. Tree/Cards/Map получают один обновлённый массив `valueObjects`.

## Что V1 НЕ делает

- drag/reparent отключён;
- edge connection editing отключён;
- `parent_value_object_id` напрямую из React Flow не меняется;
- semantic relations не редактируются;
- новой таблицы layout/coordinates нет;
- Supabase schema/data migration нет;
- новый AI вызов для карты не добавляется;
- GLOBAL/system/commercial delete control не показывается.

## UX / стиль

Node сохраняет V0 corporate styling. В footer добавляются маленькие controls:

- `+` открывает локализованное меню child authoring;
- delete icon появляется только у eligible private object;
- `Open object` остаётся доступным;
- collapse/expand остаётся отдельным control.

Delete использует ARCTor modal: confirmation → server response → локализованная success/error state. На blocked delete отображается серверная причина и blocking dependency, если она возвращена API.

## Проверки релиза

Launcher обязан до commit выполнить:

- exact branch/origin/HEAD/blob baseline;
- clean Git;
- package/payload SHA;
- patcher self-test;
- payload whitespace/EOF guard до mutation;
- in-memory TS transpile + ESLint для transformed existing files и нового validator до mutation;
- release validator V1;
- regression V0 Mind Map;
- regression Tree Table;
- regression Tree/Mobile/L10;
- regression create/delete;
- regression branch authoring;
- ESLint `--max-warnings=0`;
- полный `npm run build`;
- `git diff --check` и `git diff --cached --check`;
- exact changed/staged path allowlist;
- commit/push/fetch/remote HEAD verification;
- clean worktree after push;
- precommit rollback к baseline при FAIL.

## Следующая точка

После runtime PASS V1 следующий этап — **Mind Map V1.1 controlled reparent**. Drag должен быть только UX gesture поверх существующего `tree-restructure preview → apply` контракта. Прямой update `parent_value_object_id` из React Flow запрещён. До preview система также должна соблюдать уже принятые правила исторического пересчёта и его budget confirmation.

## Runtime closure V1

22.08.2026 пользователь подтвердил runtime на production UI после релиза `vo-mind-map-v1-authoring`.

Подтверждено скриншотами:

- локализованная карта продолжает отображать реальные ветви;
- `+` на intermediate открывает локализованное меню `Intermediate / Leaf`;
- guarded Delete открывает локализованное подтверждение и не выполняет удаление без отдельного confirm;
- визуальная структура V0 не деградировала.

Release report `ARCTOR_VO_MIND_MAP_V1_AUTHORING_20260822_183616_REPORT.txt` зафиксировал: release validator 52/52, regressions 33/33 + 68/68 + 47/47 + 32/32, ESLint PASS, полный Next build PASS, оба `git diff --check` PASS, commit/push/remote verification PASS. Итоговый commit: `b3fab10e35fbbf80282d486de022ab7b224314fb`.

Статус V1: **CLOSED / PASS**.

Разрушающее удаление реального контрольного ЦО специально не выполнялось: runtime-проверка требовала доказать guarded confirmation flow, а не создавать тестовый мусор и затем удалять его.
