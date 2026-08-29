# ARCTor — T2_4_2 Table Row Delete Contract V1_2

Дата: 2026-08-29
Baseline: `c63bdb79b023dc3b5edd8e6328b6d267bb0f4c77` (`table-views-t2-4-1-row-create-contract-v1-4`)

## Точка входа

T2_4_1 закрыт production smoke-test: создание intermediate под root, leaf/intermediate под intermediate, provisional row/Cancel и сохранение созданного ОН работают.

## Цель T2_4_2

Добавить удаление строки ОН из табличного режима, не создавая параллельный механизм удаления и сразу сохранить совместимость с будущим Spreadsheet editor.

## Архитектура

1. Добавлен generic `src/components/tables/arctor-row-delete-contract.ts`.
2. Generic delete request содержит `operationId`, `source`, `rowKey`, `historyPolicy` и не импортирует Value Objects/Supabase.
3. Для обычного Spreadsheet в будущем допускается `historyPolicy=table_local`.
4. Для Value Objects используется `historyPolicy=domain_managed`.
5. VO adapter `value-object-table-row-delete.ts` вызывает только существующий `DELETE /api/value-objects/[id]`.
6. Никаких прямых `supabase.from(...).delete()` из таблицы.
7. Никаких SQL/schema migrations.

## Используемый существующий safe-delete

Существующий `DELETE /api/value-objects/[id]` вызывает RPC `delete_value_object_safe_v1`.
Hard delete остаётся разрешён только для свежего вручную созданного private actor-owned ontology_v1 объекта без детей и внешних зависимостей. Любой child/fact/activity/relation/goal/commerce/protected dependency блокирует удаление fail-closed.

## UX

- в Table/Edit появляется `Delete row`;
- сначала пользователь выбирает строку;
- system/global/contract readonly строки не становятся delete-target;
- перед DELETE требуется явный `window.confirm`;
- при PASS вызывается существующий `onValueObjectDeleted`, таблица и счётчики обновляются;
- при 409/error показывается сообщение safe-delete и, если есть, `blocker.table.column`;
- provisional `New row` не удаляется через API: для неё остаётся `Cancel`;
- Delete не входит в cell Undo/Redo, потому что VO structural/domain operation использует `domain_managed`.

## Связь с будущим Spreadsheet editor

UI ОН не вызывает `Tabulator.deleteRow()` как persistence-механизм. Generic row-delete contract отделён от доменного VO adapter. В будущем spreadsheet сможет использовать тот же общий контракт с `table_local` history, тогда как ОН продолжат использовать защищённый domain-managed delete.

## Safety / release gates

До mutation main:
- package integrity;
- patcher direct + normal-entrypoint self-tests;
- validator self-test;
- exact baseline/origin/blob guards;
- baseline Turbopack snapshot;
- detached worktree;
- exact dirty set;
- validator;
- changed-files ESLint;
- full TypeScript;
- `git diff --check`;
- webpack no-regression;
- full-project ESLint no-regression.

После mutation до commit повторяются validator/ESLint/TypeScript/diff/build/no-regression. FAIL до commit возвращает main к baseline. Push FAIL сохраняет commit и пишет resume hint.

## Production postcheck

1. выбрать созданный тестовый leaf/intermediate без зависимостей → `Delete row` → Confirm → объект исчезает;
2. перезагрузка не возвращает объект;
3. выбрать объект с дочерними узлами → safe-delete блокирует операцию, ветка остаётся;
4. system/global readonly строка не может стать delete-target;
5. Cancel provisional row по-прежнему ничего не пишет;
6. Add row, copy/paste и cell Undo/Redo продолжают работать.

## Точка продолжения

После PASS T2_4_2 перейти к T2_5 structural operations: parent/restructure через существующий preview → apply → history/rollback contract.

## История V1 FAIL и причина V1_1

Первый release `ARCTOR_TABLE_VIEWS_T2_4_2_ROW_DELETE_CONTRACT_V1` остановился **до mutation main** в detached preflight. Все package/self-tests, baseline guards и baseline builds прошли; patcher изменил только ожидаемые 4 файла. Validator затем дал `CRLF_FORBIDDEN:src/app/api/value-objects/[id]/route.ts`.

Причина: `src/app/api/value-objects/[id]/route.ts` является **неизменяемой baseline dependency**, которую T2_4_2 только читает, чтобы доказать повторное использование существующего safe-delete API. На Windows checkout Git может материализовать этот уже существующий файл с CRLF. V1 ошибочно применял к нему правило LF-only, предназначенное для файлов, создаваемых/изменяемых release. Это false-negative validator, а не product-код.

V1_1: validator нормализует CRLF **только при чтении неизменяемого existing DELETE route**; lone CR по-прежнему запрещён. Все четыре файла dirty-set (catalog + два новых TS contracts + recovery) остаются строго UTF-8 без BOM, LF-only и без trailing whitespace. Добавлен regression self-test, который создаёт CRLF baseline-route fixture и требует его успешного read-only validation, одновременно проверяя, что strict mode всё ещё блокирует CRLF для changed files.

По V1 report: `ROLLBACK=NOT_NEEDED_PREMUTATION`; `main` не изменялся.


## История V1_1 FAIL и исправление V1_2

V1_1 прошёл package integrity, patcher/validator self-tests, baseline guards, baseline Turbopack, detached-worktree patch, exact dirty set, validator 73/73 и changed-files ESLint. Полный `tsc --noEmit` затем остановил release **до mutation main** с `TS2345` в `value-object-catalog-views.tsx`: `valueObject.id` имеет тип `string | null | undefined`, а `setTableRowSelectionId` принимает только `string | null`.

Причина: T2_4_2 расширил выбор строк на leaf/другие writable строки и вынес `setTableRowSelectionId(valueObject.id)` за type-guard `canCreateObservationObjectChildUnder(...)`. Старый guard раньше сужал `id` до `string`; после расширения selection это сужение больше не действовало.

V1_2 сохраняет расширенный выбор строк, но делает его типобезопасным: `setTableRowSelectionId(valueObject.id ?? null)`. Строка без id не становится delete-target; для режима создания последующий существующий parent guard по-прежнему требует реальный actor-owned root/intermediate с id. Добавлены regression-guards, запрещающие возврат unsafe optional-id selection pattern.

По V1_1 report: validator 73/73 PASS, changed-files ESLint PASS, затем `TS2345`; `ROLLBACK=NOT_NEEDED_PREMUTATION`; `main` не изменялся.
