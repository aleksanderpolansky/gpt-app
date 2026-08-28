# ARCTOR_TABLE_VIEWS_T2_3_RANGE_CLIPBOARD_V1 — recovery checkpoint

Дата: 2026-08-28

## 1. Исходная точка

Подтверждённый baseline:

`main @ 95bbcac37b025ac8ba6e8e16d915e764fa87adf1`

Commit baseline:

`table-views-t2-2-2-mobile-scroll-history-zoom-v1`

T2_2_2 прошёл short scratch preflight, validator 110/110, changed-files ESLint, full TypeScript, full Next production build, `git diff --check`, commit/push/remote verify. Пользователь затем подтвердил production runtime: horizontal swipe, persisted Undo/Redo и native pinch zoom работают.

## 2. Цель T2_3

Приблизить Observation Objects Table View к рабочему сценарию Excel / Google Sheets, не превращая таблицу в обход доменных write-contracts:

1. выделение диапазона ячеек на desktop/fine pointer;
2. `Ctrl+C` / `Cmd+C` копирует выбранный диапазон как TSV;
3. `Ctrl+V` / `Cmd+V` принимает TSV, включая данные, скопированные из Excel и Google Sheets;
4. многострочная и многоколоночная вставка раскладывается от верхней левой выбранной ячейки;
5. записываются только реально редактируемые `Name/title` и `Description`;
6. read-only ячейки и global/system/unsupported объекты пропускаются;
7. одна массовая вставка является одним Undo/Redo action;
8. частичный server failure запускает компенсационный rollback уже выполненных PATCH writes.

## 3. Почему встроенный Tabulator paste не пишет данные напрямую

Tabulator 6.5.2 используется для range selection и clipboard copy. Для paste ARCTor перехватывает `text/plain` самостоятельно.

Причина: встроенный mutation paste не знает ARCTor ontology/draft write contracts, read-only gates, server persistence и compensation rules. Поэтому T2_3 НЕ включает `clipboardPasteAction: "range"` и не разрешает Tabulator локально мутировать модель без подтверждённого server write.

TSV parser ARCTor поддерживает:

- LF и CRLF;
- tab-separated columns;
- quoted cells;
- переносы строк внутри quoted cells;
- escaped double quotes;
- BOM removal.

## 4. Безопасная массовая вставка

Перед первым server write весь фактически редактируемый batch проходит prevalidation через общий `validateValueObjectTableFieldValue(...)`.

Для каждого значения проверяются те же правила, что у одиночного inline edit:

- только `title` / `description`;
- title не пустой и максимум 180 символов;
- description максимум 4000 символов;
- `scope_code=global` — read-only;
- `origin_type_code=system` — read-only;
- unsupported write contract — read-only;
- ontology использует существующий `/ontology-definition` PATCH;
- draft использует существующий `/api/value-objects/[id]` PATCH.

Read-only/unsupported target cells не вызывают PATCH и считаются skipped. Вставка ограничена максимум 100 фактическими editable changed cells за одну операцию.

## 5. Partial failure и compensation rollback

Серверной multi-row transaction для этих разнородных существующих endpoints сейчас нет. Поэтому T2_3 использует последовательный безопасный batch с компенсацией:

1. PATCH выполняются последовательно;
2. после каждого успешного ответа React state обновляется только подтверждённым patch;
3. если следующий write падает, уже применённые writes откатываются в обратном порядке через тот же existing PATCH contract;
4. при полном compensation rollback пользователь получает явное сообщение, что paste не применён;
5. если хотя бы один rollback write не прошёл, UI сообщает `rollback incomplete` и требует reload перед дальнейшим редактированием.

Это best-effort compensation, а не ACID-транзакция. T2_3 не вводит ETag/version compare-and-swap и не заявляет защиту от конкурентной правки тем же объектом другим клиентом между запросами.

## 6. Undo / Redo

История T2_2_2 расширена от single cell entry до action с одним или несколькими entries.

- обычная одиночная правка = один action с одним entry;
- массовый paste = один action со всеми успешно записанными editable cells;
- один Undo откатывает весь paste в обратном порядке;
- один Redo повторяет весь paste в прямом порядке;
- Undo/Redo также используют real server PATCH writes и compensation rollback;
- новая успешная правка или paste очищает Redo;
- session history по-прежнему ограничена 50 actions и сбрасывается при входе/выходе из Edit table.

## 7. Smartphone UX boundary

На смартфоне multi-cell drag-range намеренно НЕ включается в T2_3.

Причина: drag-range конфликтует с уже подтверждёнными пользователем horizontal swipe, native pinch zoom и single-tap expanded cell editing. На compact/coarse pointer range clipboard gate выключен, поэтому навигация смартфона не деградирует.

На смартфоне остаётся native OS copy/paste внутри открытого expanded editor для одной ячейки. Отдельный touch-oriented multi-cell selection/toolbar может быть спроектирован позже без поломки swipe UX.

## 8. Сохранённые boundaries

Не меняются:

- structural parent не редактируется paste;
- reparent только controlled restructure preview/apply;
- Role, Direct, Descendants, Leaves, Status read-only;
- нет create/delete;
- нет изменения schema / Reality Model;
- release runner не делает DB/Storage/OpenAI writes.

Release markers:

- `DB_WRITES=0`;
- `STORAGE_WRITES=0`;
- `OPENAI_CALLS=0`;
- `SQL_EXECUTED=0`;
- `SCHEMA_MIGRATIONS=0`.

## 9. Release safety

До mutation основного `main` обязательны:

- exact branch/head/origin guards;
- exact baseline blob guards;
- payload manifest/hash/UTF-8/no-BOM/secret scan;
- TS transpile;
- semantic integration TypeScript;
- Tabulator event typing regression;
- TSV parser runtime fixtures;
- range target mapper runtime fixtures;
- inline save runtime fixtures;
- short detached scratch worktree `_arctor_t23_preflight`;
- release validator;
- changed-files ESLint;
- full project TypeScript;
- `git diff --check`.

После mutation и до commit проверки повторяются, дополнительно full Next production build и full ESLint no-regression. Любой FAIL до commit должен вернуть exact baseline и clean worktree. Push failure после commit должен оставить clean committed state и `RESUME_HINT=git push origin main`.

## 10. Следующая точка

После PASS release проверить production desktop:

- drag selection виден;
- Ctrl+C копирует диапазон и вставляется в Excel/Google Sheets как строки/колонки;
- Ctrl+V из Excel/Google Sheets обновляет только Name/Description;
- серые columns/rows пропускаются;
- один Undo откатывает весь массовый paste; один Redo возвращает;
- намеренно невалидный batch останавливается до первого write;
- при runtime server failure отображается явный rollback status.

На smartphone убедиться, что horizontal swipe, pinch zoom и single-tap editing не деградировали; multi-cell range на touch в T2_3 не обещается.

После T2_3 runtime PASS следующий разумный блок — создание нового Observation Object/строки из таблицы через существующий create flow, затем controlled structural operations и более широкий Spreadsheet mode.

## 11. Долгосрочное направление Guest / Local tools

Guest/Local Documents / Spreadsheets / Mind Maps направление сохраняется: без обязательной регистрации для открытия/создания/редактирования/Download; client-side processing там, где возможно; account добавляет cloud save, history, sync, collaboration, AI и связи с ARCTor.

## 12. Проверки пакета до передачи пользователю

В локальной среде подготовки release выполнено:

- `node --check` runner — PASS;
- `node --check` validator — PASS;
- semantic TypeScript integration adapter + catalog + editor с `strictNullChecks` — PASS;
- найден и исправлен до упаковки TypeScript narrowing defect в refactored single-field save helper: optional `id` теперь явно захватывается как `valueObjectId` после guard;
- TSV parser runtime fixtures — PASS: LF, CRLF, quoted multiline cell, literal quotes, escaped double quotes, BOM, empty clipboard, trailing empty column;
- range target mapper runtime fixtures — PASS: 2x2 mapping, overflow/truncation, start from Description, no active range;
- actual-source batch compensation runtime — PASS: full forward batch, mid-batch failure + complete compensation, forced rollback failure + `rollbackIncomplete=true`, reverse batch for Undo;
- release validator на synthetic baseline tree — 136/136 PASS;
- synthetic `git diff --check` — PASS;
- package self-test — PASS.

Release-runner дополнительно был прогнан на отдельном synthetic Git repository с теми же baseline blobs:

1. полный preflight → scratch → apply → validation → commit → push → fetch → remote verify → clean worktree — PASS;
2. intentional Next build failure до commit → `ROLLBACK=PASS`, exact baseline HEAD и clean worktree — PASS;
3. intentional remote push reject после commit → `RESULT=COMMIT_CREATED_PUSH_FAILED`, clean committed worktree, `RESUME_HINT=git push origin main`; после снятия reject resume push синхронизировал `origin/main` — PASS.

Эти synthetic проверки не подменяют реальные project-wide ESLint/TypeScript/Next checks production checkout. Поэтому runner выполняет их ещё раз на компьютере пользователя: full TypeScript и changed-files ESLint сначала в detached scratch до mutation main, затем повторно на main до commit вместе с full Next production build и ESLint no-regression.
