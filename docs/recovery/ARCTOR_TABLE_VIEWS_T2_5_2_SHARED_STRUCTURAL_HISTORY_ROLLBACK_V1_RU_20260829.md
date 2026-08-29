# ARCTOR_TABLE_VIEWS_T2_5_2_SHARED_STRUCTURAL_HISTORY_ROLLBACK_V1 — recovery checkpoint

Дата: 2026-08-29
Baseline: `9ceb2f387eff75eb79524427f5c68c0be2a212e4` (`table-views-t2-5-1-shared-reparent-preview-apply-v1-1`).

## Закрытие T2_5_1

T2_5_1 закрыт как production PASS. В standalone Table объект `Cognitive Activity` был перенесён из `Activities and processes → Human Activity → Cognitive Activity` непосредственно под `Activities and processes`, preview показал старый и новый путь и предупреждение о переносе потомков. Apply корректно перенёс подветвь и пересчитал счётчики. Затем тем же Table UX выполнен обратный preview/apply под `Human Activity`; MindMap подтвердил восстановленную структуру. Table и MindMap используют единый `value-object-reparent-client.ts` и существующий серверный preview/apply contract.

## Что уже существовало до T2_5_2

P8 controlled tree restructure уже содержит серверную историю и rollback. `GET /api/value-objects/[id]/tree-restructure/preview` возвращает `ValueObjectTreeRestructureContext`, включая последние до 10 записей `value_object_tree_operations` для выбранного target. `POST /api/value-objects/tree-restructure/[operationId]/rollback` использует active actor context, idempotency key и существующий RPC `rollback_value_object_tree_restructure_v1`.

Поэтому T2_5_2 не добавляет SQL, таблицы, RPC или новый backend history. Задача — безопасно экспонировать уже существующий domain-managed history/rollback в табличном workspace.

## Shared structural operation client

Создан `src/components/workspace/value-objects/value-object-tree-operation-client.ts` как переиспользуемый клиент context/history и rollback для табличного workspace и будущих UI-потребителей. Он:

- загружает existing restructure context через GET существующего preview route;
- валидирует identity текущего объекта;
- выполняет rollback только через существующий rollback route;
- требует корректный idempotency key;
- валидирует, что `rolledBackOperationId` совпадает с запрошенной операцией;
- не содержит Supabase, SQL или прямых DB writes;
- определяет newest applied non-rollback operation как клиентского кандидата на rollback, а сервер остаётся окончательным guard порядка/состояния.

Existing `ValueObjectTreeRestructureManager` уже остаётся рабочим P8 UI поверх тех же context/history и rollback endpoints. T2_5_2 его не меняет: новый client нужен табличному workspace и повторно использует тот же серверный контракт, не создавая второй backend-механизм.

## Table UX T2_5_2

В table edit mode после выбора собственного actor ОН доступна кнопка `Structure history` / `История структуры`. Она загружает последние controlled operations выбранного ОН. Для каждой записи показываются тип, статус и время. Кнопка rollback доступна только у новейшей операции со `status=applied` и `operationType != rollback`; более старые операции read-only, чтобы UI не предлагал очевидно неправильный порядок отката.

Rollback требует отдельного confirm. После успешного domain rollback cell Undo/Redo очищается и выполняется reload страницы, потому что rollback может восстановить несколько ОН или удалить созданный intermediate; локально угадывать полную структуру нельзя. Источник истины после rollback — сервер.

## Разделение с будущим Spreadsheet Editor

Structural history ОН остаётся `domain_managed` и не смешивается с `table_local` Undo/Redo ячеек. Будущий Spreadsheet Editor использует собственную локальную/документную историю строк и ячеек; P8 tree operation history применяется только к доменным структурным операциям ARCTor.

## Release safety

Нет SQL/schema migrations, OpenAI calls, release-time DB writes или storage writes. Existing context/rollback API читаются validator/blob guards и не изменяются. Main меняется только после detached preflight: patch, validator, changed-files ESLint, full TypeScript, `git diff --check`, webpack no-regression и whole ESLint no-regression. Основной Turbopack build должен оставаться PASS. До commit любой FAIL возвращает exact baseline; после commit при push failure commit сохраняется и REPORT выводит `RESUME_HINT`.

## Следующий production acceptance

1. Выбрать ОН с недавним reparent → `Structure history`.
2. Убедиться, что видны последние controlled operations и только latest applied non-rollback имеет кнопку Rollback.
3. Отмена confirm не меняет дерево.
4. Подтвердить rollback последней операции; страница reload, структура и счётчики возвращаются к предыдущему состоянию.
5. MindMap должен показать ту же восстановленную структуру.
6. Повторно открыть history: исходная операция должна иметь `rolled_back`, а новая rollback operation — быть видна в истории; rollback для уже rolled-back записи не предлагается.
7. После PASS закрыть T2_5 и перейти к табличному Activity Journal.
