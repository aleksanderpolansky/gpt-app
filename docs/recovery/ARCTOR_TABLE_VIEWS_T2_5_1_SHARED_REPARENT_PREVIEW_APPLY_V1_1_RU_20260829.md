# ARCTOR_TABLE_VIEWS_T2_5_1_SHARED_REPARENT_PREVIEW_APPLY_V1_1 — recovery checkpoint

Дата: 2026-08-29
Baseline: `ab047031db74bdc6ca45ccf92a085fdf9f082d4a` (`table-views-t2-4-2-row-delete-contract-v1-2`).

## Закрытый этап T2_4

T2_4 закрыт как PASS после production smoke. Создание ОН из табличного режима прошло production acceptance. Удаление тестового ОН `test` прошло через существующий safe-delete. Попытка удалить `Physical State` была корректно заблокирована из-за дочерних объектов с dependency `value_objects.parent_value_object_id`.

## Причина V1 FAIL

`ARCTOR_TABLE_VIEWS_T2_5_1_ROW_REPARENT_PREVIEW_APPLY_V1` не менял main: runner остановился в detached preflight и записал `ROLLBACK=NOT_NEEDED_PREMUTATION`. Product patch прошёл validator 74/74, changed-files ESLint, полный `tsc --noEmit` и `git diff --check`. FAIL был вызван слишком строгим сравнением полного fingerprint падающего baseline webpack build: baseline и patched оба падали на существующем дефекте `ARCTOR_AI_RIGHT_RAIL_BACKGROUND_REVIEW_V1`, но в warning/import-trace присутствовали нестабильные строки, из-за чего SHA различался.

## Уже существующий reparent в MindMap

До T2_5_1 MindMap уже имел полноценный controlled reparent UX: drag выбирал source/destination, затем выполнялись `POST /api/value-objects/[id]/tree-restructure/preview` и `POST /api/value-objects/[id]/tree-restructure/apply`; apply использовал `previewHash` и idempotency key. Поэтому табличный режим не должен иметь второй сетевой reparent-контракт.

## Решение V1_1: один общий reparent client

Создан `src/components/workspace/value-objects/value-object-reparent-client.ts`. Он является единым клиентским источником истины для Preview/Apply и используется одновременно MindMap и Table adapter.

Общий client:

- не содержит Supabase и прямых DB writes;
- использует только существующие tree-restructure preview/apply routes;
- нормализует source/new-parent id;
- запрещает self-parent;
- валидирует identity Preview: `mode=reparent`, target и destination;
- Apply требует тот же Preview, `previewHash` и стабильный idempotency key;
- валидирует identity Apply result.

`value-object-mind-map.tsx` больше не содержит собственных fetch к `tree-restructure/preview|apply`: он вызывает общий client. `value-object-table-row-reparent.ts` также вызывает тот же общий client, оставляя table-specific role/branch/candidate checks в adapter.

## Generic table move contract и будущий Spreadsheet Editor

`src/components/tables/arctor-row-move-contract.ts` остаётся domain-neutral. Он поддерживает `child`, `before`, `after`, `append`, sources `toolbar|keyboard|drag|api` и общий history policy. Для ОН используется только `child + domain_managed`. Будущий Spreadsheet Editor сможет использовать `before|after|append + table_local` без зависимости от VO semantics.

## Table UX T2_5_1

В table edit mode после выбора persisted intermediate/leaf доступно `Change parent`. Root не является source. Новый parent выбирается из допустимых actor objects в той же branch; текущий parent, self и потомки source исключаются client-side, а серверный preview/apply остаётся авторитетным guard.

Последовательность: `Change parent` → выбрать parent → `Preview move` → проверить old/new path и warnings → `Apply move`. После apply вызывается существующий `onValueObjectReparented`, cell Undo/Redo очищается, потому что structural move имеет `domain_managed` history.

## Build regression policy V1_1

Webpack baseline defect не считается PASS и не маскируется. Для baseline FAIL → patched FAIL сравнивается нормализованная core diagnostic signature, исключающая нестабильные import-trace/warning строки, но сохраняющая Type error, `.next/types` location, несовместимое property и worker exit. Новый дополнительный Type error обязан изменить signature и заблокировать release. Основной Turbopack build обязан оставаться PASS.

## Безопасность release

Нет SQL/schema migrations, OpenAI calls или release-time DB writes. Existing preview/apply routes только читаются validator/blob guards. Main меняется только после detached preflight: patch, validator, changed-files ESLint, full TypeScript, `git diff --check`, webpack no-regression и Turbopack PASS. До commit любой FAIL откатывает main к точному baseline; после commit/push failure commit сохраняется с `RESUME_HINT`.

## Следующий production acceptance

1. Выбрать intermediate → `Change parent` → другой root/intermediate → Preview; Cancel ничего не применяет.
2. Повторить и Apply; дерево и счётчики должны обновиться.
3. Leaf должен предлагать только intermediate parents.
4. Root не должен предлагать Change parent.
5. Попытка цикла/недопустимого parent должна быть заблокирована client-side или server Preview.
6. После PASS перейти к следующему structural UX/history/rollback exposure без прямого parent write.
