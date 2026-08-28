# ARCTOR_TABLE_VIEWS_T1_TABULATOR_V1_1 — recovery checkpoint

Дата: 2026-08-28
Baseline: `main @ 6c91b6d48a379c05fdc5532cd74e327d34b32313`
Release commit message: `table-views-t1-tabulator-v1-1`

## 1. Зачем сделан этап

Добавить компактное табличное представление в три уже существующих пользовательских контура ARCTor без изменения их данных, API и бизнес-логики:

- `/value-objects` — объекты наблюдения;
- `/activity-today` — журнал активностей;
- `/activity-facts` — факты активности.

T1 даёт плотный режим просмотра уровня Excel / Google Sheets / Asana grid. Это не полноценный spreadsheet editor.

## 2. История неуспешного V1 и исправление V1_1

Первый release attempt `ARCTOR_TABLE_VIEWS_T1_TABULATOR_V1` 28.08.2026 дошёл до full TypeScript gate и был остановлен до commit/push.

Фактическая причина:

- в `src/components/workspace/value-objects/value-object-catalog-views.tsx` локализационные поля `table / description / parent / emptyTable` для `cs` и `es` по ошибке попали внутрь объекта `pl`;
- TypeScript выдал `TS1117` по повторным свойствам объекта;
- объекты locale `es` и `cs` не содержали обязательные поля `CatalogCopy`, что дало `TS2739`.

Release runner выполнил `ROLLBACK=PASS`; `HEAD` и production baseline остались `6c91b6d48a379c05fdc5532cd74e327d34b32313`; commit/push не создавались.

V1_1 исправляет именно этот дефект:

- `pl` содержит только польские значения;
- `es` содержит собственные `table / description / parent / emptyTable`;
- `cs` содержит собственные `table / description / parent / emptyTable`;
- validator теперь проверяет не только общее количество переводов, а наличие каждого нового ключа ровно один раз внутри каждого из 7 locale blocks;
- runner добавляет pre-mutation isolated TypeScript delta gate: для изменяемых TS/TSX сравниваются non-module diagnostics payload с baseline, а новые adapter/declaration обязаны не иметь собственных TypeScript diagnostics. Это должно ловить ошибки класса `TS1117/TS2739` до изменения рабочего дерева.

## 3. Архитектурное решение

UI-движок таблиц: `tabulator-tables` exact `6.5.2`, MIT.

Tabulator используется только как presentation/grid layer. Источником истины остаются существующие ARCTor API, React state и Supabase-backed data contracts. В T1 Tabulator не получает самостоятельных write-boundaries.

Общий React adapter:

- `src/components/tables/arctor-tabulator.tsx`;
- `src/components/tables/arctor-tabulator.css`;
- локальный минимальный TypeScript contract `src/types/tabulator-tables.d.ts`.

Adapter уничтожает instance при unmount/reconfiguration, хранит row-click callback через ref и не реагирует на клики по интерактивным DOM-элементам / data-tree control.

## 4. `/value-objects`

Существующие режимы `Дерево / Карточки / Карта` сохранены. Добавлен четвёртый режим `Таблица` во всех 7 locale.

Таблица:

- использует Tabulator Data Tree;
- одна строка = один ЦО/ОН;
- дочерние узлы передаются через `_children`;
- сохраняет текущие search/role/hierarchy filters;
- колонки: название, описание, родитель, роль, прямые дети, потомки, листы, статус;
- строка открывает существующую detail page объекта;
- структурные изменения, создание, удаление и reparenting этим режимом не выполняются.

Существующие Tree authoring controls и React Flow Map не изменяются.

## 5. `/activity-today`

Существующий карточный журнал сохранён и остаётся default. Добавлен переключатель `Карточки / Таблица` во всех 7 locale.

Таблица показывает:

- когда запись появилась в журнале;
- активность;
- actor;
- время активности;
- длительность;
- состояние basic intake analysis;
- status;
- source.

Клик по строке открывает существующий detail/modal. Edit/Delete/Restore остаются в существующем контуре и не переносятся в editable grid на T1.

## 6. `/activity-facts`

Существующие grouped cards, filters, summary counters, detail block и `ActivityFactTaggingPanel` сохранены. Добавлен переключатель `Карточки / Таблица` во всех 7 locale.

Таблица показывает:

- дату;
- активность;
- связанный ЦО/ОН;
- тип измерения;
- значение;
- единицу;
- статус;
- source;
- confidence.

Клик по строке выбирает факт для уже существующего detail/tagging panel. Никакой новой записи/редактирования фактов Tabulator не делает.

## 7. Что сознательно НЕ входит в T1

- inline cell editing;
- drag-and-drop/reparent через grid;
- создание произвольных пользовательских таблиц;
- formulas;
- XLSX import/export;
- Google Sheets synchronization;
- новые API endpoints;
- SQL/migrations/DB writes;
- Storage writes;
- OpenAI calls.

Это сохраняется для отдельного Table/Spreadsheet T2+ design gate.

## 8. Acceptance gates release runner

Release считается успешным только если runner подтверждает:

1. `main`, clean worktree, exact baseline HEAD и `origin/main`;
2. exact Git-content baseline guards для изменяемых tracked files;
3. отсутствие new-path collisions;
4. pre-mutation isolated TypeScript delta gate для payload;
5. exact dependency `tabulator-tables@6.5.2` после npm install;
6. release validator PASS, включая per-locale key uniqueness/completeness;
7. changed-file ESLint PASS;
8. full TypeScript PASS;
9. full Next build PASS;
10. `git diff --check` PASS;
11. baseline/post full ESLint без регрессии;
12. exact dirty/staged allowlists;
13. commit + push + remote verification;
14. final clean worktree.

При любой ошибке до commit runner возвращает tracked files к baseline и удаляет только new paths этого release. Если commit создан, но push не прошёл, commit сохраняется и runner поддерживает `--resume-push`.

## 9. Точка продолжения

После визуальной проверки T1 можно проектировать T2: контролируемое inline editing / keyboard navigation / clipboard, а отдельно — будущую сущность ARCTor Table Document с XLSX export/import и Google Sheets adapter. Tabulator остаётся UI engine, но не форматом хранения данных.
