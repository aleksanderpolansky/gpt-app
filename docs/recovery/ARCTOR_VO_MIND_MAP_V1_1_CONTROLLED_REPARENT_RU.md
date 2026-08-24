# ARCTOR_VO_MIND_MAP_V1_1_CONTROLLED_REPARENT

Дата: 2026-08-22
Source baseline: `b3fab10e35fbbf80282d486de022ab7b224314fb` (`vo-mind-map-v1-authoring`)
DB schema change: NONE

## Точка восстановления

Mind Map V0 CLOSED/PASS.
Mind Map V1 AUTHORING CLOSED/PASS: `+ Intermediate`, `+ Leaf` и guarded Delete доказаны на production UI; release commit `b3fab10e35fbbf80282d486de022ab7b224314fb`.

Контрольная онтология остаётся реальной:

- `Human body → Musculoskeletal system → Back muscles → Latissimus dorsi`;
- `Activity → Physical activity → Pull-ups → Narrow-grip pull-up`.

## Решение V1.1

V1.1 добавляет controlled reparent непосредственно в React Flow, но **не создаёт нового write contract**.

UX gesture:

`drag intermediate/leaf → drop on root/intermediate → preview → explicit confirm → apply`.

Авторитетные server contracts уже существуют и переиспользуются без изменения:

- `POST /api/value-objects/{id}/tree-restructure/preview`;
- `POST /api/value-objects/{id}/tree-restructure/apply`;
- RPC `preview_value_object_tree_restructure_v1`;
- RPC `apply_value_object_tree_restructure_v1`.

Map не выполняет прямой `UPDATE value_objects.parent_value_object_id`.

## Fail-closed правила карты

Draggable только actor-owned candidate, который в catalog payload выглядит как:

- semantic role = `intermediate` или `leaf`;
- не `scope_code=global`;
- не `usage_scope=commercial`;
- `origin_type_code=user_declared`.

Root в V1.1 не перетаскивается: превращение root в child затрагивает семантическую роль верхнего уровня и требует отдельного решения, а не неявного drag.

Для source=`intermediate` drop target допускается на `root` или `intermediate`. Для source=`leaf` target допускается только `intermediate`, чтобы сохранить уже зафиксированное правило «leaf не является прямым ребёнком root». Drop на leaf, на текущего parent, на самого себя или собственного descendant не применяется. Даже после UI-prefilter окончательное решение принимает server preview.

## Preview / apply

После drop node визуально возвращается в исходную auto-layout позицию. До подтверждения карта не изображает неподтверждённую структуру как факт.

Preview получает:

- target Value Object;
- `mode=reparent`;
- `newParentValueObjectId`.

Apply разрешён только с `previewHash` полученного preview и новым idempotency key. Если дерево изменилось после preview, существующий серверный guard обязан отклонить stale apply и потребовать новый preview.

После PASS apply client-state обновляет `parent_value_object_id` перемещённого объекта, после чего Tree/Cards/Map немедленно строятся из одной обновлённой коллекции. Следующее серверное чтение остаётся каноническим источником всех derived/root полей.

## Вертикальная ориентация

По запросу пользователя Map меняется с left-to-right на top-to-bottom:

- roots находятся сверху;
- structural depth задаёт Y;
- siblings/независимые roots распределяются по X;
- target handle = Top;
- source handle = Bottom;
- родитель центрируется по видимым детям;
- collapse/expand сохраняется.

Отдельная таблица координат по-прежнему не создаётся; layout детерминированно вычисляется из текущего дерева.

## Исторический пересчёт

Controlled reparent V1.1 меняет только текущую структурную иерархию. Он **не запускает автоматический полный пересчёт прошлой истории**.

Зафиксированная политика ARCTor сохраняется: если полный исторический пересчёт после переноса когда-либо нужен, это отдельная платная операция с предварительной оценкой AI/token budget, явным подтверждением жёсткого token cap и остановкой при исчерпании подтверждённого лимита. V1.1 такой операции не выполняет.

## Что V1.1 НЕ делает

- root demotion/reparent;
- drop на leaf;
- прямой update `parent_value_object_id`;
- edge connection editing;
- semantic relation editing;
- historical recalculation;
- новый AI-вызов;
- новую Supabase migration/table;
- сохранение React Flow coordinates.

## Проверки релиза

Launcher обязан до commit выполнить:

- exact branch/origin/HEAD/blob baseline;
- clean Git;
- package/payload SHA;
- `@xyflow/react@12.11.3` retained;
- patcher self-test;
- whitespace/EOF guard до mutation;
- in-memory TS transpile + repo ESLint preflight до mutation;
- repo TypeScript semantic preflight через virtual overlay изменяемых TSX до mutation;
- release validator V1.1;
- regressions Tree Table / Tree Mobile L10 / Create Delete / Branch Authoring;
- ESLint `--max-warnings=0`;
- полный `npm run build`;
- `git diff --check` и cached diff check;
- exact changed/staged path allowlist;
- commit/push/fetch/remote HEAD verification;
- clean worktree after push;
- precommit rollback к baseline при FAIL.

## Ошибка первого release candidate и исправление V2

Первый package V1 дошёл на production repo до полного `npm run build`: Turbopack compile прошёл, но TypeScript остановил релиз до commit на `value-object-mind-map.tsx`, потому что `MindMapValueObject.id` имеет контракт `string | null | undefined`, а `buildLocalizedPath(...)` требует обязательный `string`. В drop-handler использовался `targetObject.id`, хотя канонический React Flow `targetNode.id` уже имеет обязательный строковый тип. Launcher корректно выполнил precommit rollback к `b3fab10e35fbbf80282d486de022ab7b224314fb`; commit/push не было.

V2 исправляет это без изменения поведения: после успешного lookup target используется обязательный `const targetId = targetNode.id`; этот id применяется для current-parent noop guard, path preview и `newParentId`. `sourceId` аналогично берётся из обязательного `node.id`. Patcher и release-validator теперь fail-closed запрещают возврат к optional `targetObject.id` в этих string-only местах.

## Runtime closure V1.1

V1.1 CLOSED/PASS на production runtime. Release commit: `1670e9067b3c46a4ae37da44c11a3862aa19590d`; release report: `ARCTOR_VO_MIND_MAP_V1_1_CONTROLLED_REPARENT_20260822_204217_REPORT.txt`.

Доказан полный безопасный цикл на реальном leaf `Narrow-grip pull-up` / `Podciąganie wąskim chwytem`:

1. карта отображается top-to-bottom;
2. drag с `Pull-ups` на `Physical activity` показал preview старого и нового parent/path;
3. Cancel вернул node в каноническую auto-layout позицию и не изменил БД;
4. повторный preview + Confirm применил перенос и немедленно перестроил Map;
5. leaf стал sibling для `Pull-ups` под `Physical activity`;
6. вторым controlled move leaf возвращён обратно под `Pull-ups`;
7. исходная правильная ветвь полностью восстановлена.

Финальная контрольная структура после теста:

`Activity → Physical activity → Pull-ups → Narrow-grip pull-up`.

Автоматический исторический пересчёт во время forward/reverse runtime test не запускался.

## Следующая точка

Следующий этап — **ARCTOR_VO_MIND_MAP_V1_2_FAST_AUTHORING**: создание intermediate/leaf в компактном локализованном modal прямо на Map без перехода на отдельную страницу. Новый write contract не создаётся: переиспользуется существующий `POST /api/value-objects` с `intermediate_branch_active_v4` / `leaf_branch_active_v4`, а созданный объект сразу добавляется в общий client-state Tree/Cards/Map. Семантические relations остаются отдельным слоем, а не structural edges.
