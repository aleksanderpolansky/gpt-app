# ARCTOR_TABLE_VIEWS_T2_1_SAFE_VALUE_OBJECT_EDITOR_V1_5 — recovery checkpoint

Дата: 2026-08-28

## 1. Исходная точка

Подтверждённый baseline перед началом T2_1:

`main @ 3e664a4aa45c88f698c0b8c63cad2b8f8b0c6869`

Commit T1_3: `table-views-t1-3-readability-hotfix-v1`.

Table Views T1 считается закрытым как read-only этап для Observation Objects, Activity Journal и Facts.


## 1.1. Предыдущая неудачная попытка V1

Первая попытка `ARCTOR_TABLE_VIEWS_T2_1_SAFE_VALUE_OBJECT_EDITOR_V1` завершилась **до любых изменений source**.

Причина: Windows runner вызвал `npm.cmd --version` напрямую через `spawnSync(..., shell:false)`, что вернуло `status=null` в текущей Windows/Node среде. После ошибки runner выполнил `git reset --hard` к exact baseline `3e664a4aa45c88f698c0b8c63cad2b8f8b0c6869`; `ROLLBACK=PASS`.

V1_1 исправил transport запуска npm: на Windows используется `cmd.exe /d /s /c "npm.cmd ..."`, то есть тот же способ, который уже успешно проходил в предыдущих release runners ARCTor.

## 1.2. Предыдущая неудачная попытка V1_1

Вторая попытка `ARCTOR_TABLE_VIEWS_T2_1_SAFE_VALUE_OBJECT_EDITOR_V1_1` также завершилась **до любых изменений source**.

Причина: packaging/name-generation regression в runner. В payload находился validator `scripts/validate-arctor-table-views-t2-1-safe-value-object-editor-v1-1.mjs`, но runner ошибочно ожидал несуществующий путь `...-v1-1-1.mjs`. `node --check` закономерно завершился `MODULE_NOT_FOUND`. После ошибки runner снова выполнил `git reset --hard` к exact baseline `3e664a4aa45c88f698c0b8c63cad2b8f8b0c6869`; `ROLLBACK=PASS`.

V1_2 устраняет рассинхронизацию имён полностью: release, runner, validator, recovery path, NEW_PATHS, EXPECTED_DIRTY, apply/stage/ESLint references генерируются и проверяются на один канонический validator path `scripts/validate-arctor-table-views-t2-1-safe-value-object-editor-v1-2.mjs`. Перед выдачей пакета выполнен отдельный package-path audit: каждый payload path, на который ссылается runner до mutation, физически существует в ZIP.

## 2. Цель T2_1

Начать безопасное редактирование существующих сущностей непосредственно из табличного представления, не превращая Tabulator в самостоятельный источник бизнес-логики и не обходя существующие server-side contracts ARCTor.

T2_1 ограничен Observation Objects (`/value-objects`). Activity Journal и Facts остаются read-only.

## 3. Что добавлено

В Table View Observation Objects появляется явный opt-in режим `Edit table`.

При выключенном режиме таблица ведёт себя как раньше: клик по строке открывает карточку объекта.

При включённом режиме клик по строке выбирает объект и открывает компактный редактор прямо над таблицей. В T2_1 разрешены только поля:

- title / description;
- название / описание в текущей локали интерфейса.

Структурные и служебные поля не редактируются непосредственно из таблицы.

## 4. Контракты записи

### 4.1. Ontology objects

Если у объекта есть `canonical_key` и `ontology_node_role_code`, таблица использует существующий endpoint:

`PATCH /api/value-objects/[id]/ontology-definition`

Название сохраняется как `editKind=rename`, описание — как `editKind=semantic_definition`. Каждый запрос получает отдельный idempotency key и текущую locale.

Если пользователь изменил одновременно title и description, это два независимых существующих semantic edit operations. Если первая операция прошла, а вторая завершилась ошибкой, уже подтверждённое изменение не откатывается искусственно; UI обновляет успешное поле и показывает ошибку для оставшейся операции. Это предпочтительнее ложного клиентского rollback уже подтверждённой сервером семантической записи.

### 4.2. Draft objects

Если объект не является ontology object и имеет `status=draft`, используется существующий draft PATCH:

`PATCH /api/value-objects/[id]`

В body отправляются только реально изменённые `title` и/или `description`.

### 4.3. Fail-closed

`scope_code=global` и `origin_type_code=system` являются read-only в Table Editor.

Активный объект, который не попадает ни в ontology-definition contract, ни в draft PATCH contract, также считается read-only в T2_1. Пользователь может открыть его карточку и использовать доступный authoring flow.

## 5. Структурный родитель

Parent не редактируется как обычная ячейка и не отправляется через draft PATCH.

Редактор показывает текущего родителя только для информации и даёт ссылку на существующий controlled tree restructure flow:

`/value-objects/[id]/restructure`

Правило остаётся прежним: изменение structural parent выполняется только через существующий preview/apply contract; прямого `parentValueObjectId` или `parent_value_object_id` write из таблицы нет.

## 6. Что сознательно не входит в T2_1

- inline cell editor Tabulator;
- drag-and-drop reparenting;
- изменение Role;
- изменение Status;
- изменение counters;
- массовое редактирование;
- Activity Journal editing;
- Facts editing/correction;
- полноценный Spreadsheet document editor;
- XLSX/Google Sheets export;
- SQL: 0;
- schema migration: 0.

## 7. Safety / side effects

Release runner сам не выполняет DB writes, Storage writes, OpenAI calls или SQL.

После релиза пользовательское нажатие Save является осознанной runtime write-операцией через уже существующие authenticated ARCTor endpoints. Эти endpoints сохраняют собственные ownership, validation, idempotency и localization rules; T2_1 не дублирует и не обходит их.

## 8. Проверки релиза

Runner обязан до commit выполнить:

- clean worktree + exact baseline + exact origin/main;
- exact blob guards для изменяемых файлов;
- payload manifest/secret scan;
- package-path audit: runner validator/recovery/editor source references обязаны существовать физически в распакованном payload;
- pre-mutation TypeScript transpile syntax check для сгенерированных TSX;
- baseline full ESLint snapshot;
- release validator;
- changed-files ESLint с `--max-warnings=0`;
- full `tsc --noEmit`;
- full Next production build;
- `git diff --check`;
- full ESLint post snapshot без регрессии;
- exact dirty/staged file sets;
- commit, push, fetch и exact remote verify.

При любой ошибке до commit runner возвращает checkout к baseline. При push failure после commit commit сохраняется для контролируемого resume-push.


## 9. Будущий блок Documents / Spreadsheets / Mind Maps

Отдельно зафиксирован продуктовый принцип для следующих этапов, не входящий в runtime scope T2_1:

- Guest / Local mode без обязательной регистрации для создания/открытия, локального редактирования и Download;
- по возможности содержимое файла обрабатывается client-side и не отправляется в ARCTor;
- регистрация/аккаунт становится upgrade для `Save to ARCTor`, cloud storage, истории версий, доступа с разных устройств, совместной работы, AI и связей с другими объектами ARCTor;
- Download не должен блокироваться регистрацией после того, как пользователь уже выполнил работу;
- полноценный Spreadsheet editor, DOCX editor и Mind Map editor проектируются отдельным блоком после domain-table editing.

Эта фиксация является продуктовым решением/направлением; T2_1 не реализует Guest editor и не меняет auth/public routes.

## 10. Точка продолжения

После production visual/runtime postcheck T2_1 следующий этап выбирать отдельно:

- T2_2 — безопасное редактирование Activity Journal через существующий activity PATCH contract;
- либо T2_2 — controlled Facts correction/tagging surface;
- полноценный Spreadsheet mode Tabulator остаётся отдельным блоком и не смешивается с domain entity editor.
## Ошибка V1_2 и исправление V1_3

V1_2 успешно прошёл package-path audit, Windows npm transport, baseline guards, premutation TypeScript и применил payload. Единственный FAIL release validator был ложным: validator ожидал буквальную строку `global/system`, хотя recovery уже точно фиксировал два реальных правила — `scope_code=global` и `origin_type_code=system` являются read-only. Код редактора по этим правилам прошёл свои проверки. V1_2 завершился `ROLLBACK=PASS`, поэтому baseline не изменился.

V1_3 заменяет хрупкую проверку буквальной фразы на семантическую проверку обоих фактических правил и `read-only`; функциональный editor payload не расширяется.



## Ошибка V1_3 и исправление V1_4

V1_3 прошёл package-path audit, Windows npm transport, baseline guards, premutation TypeScript и release validator (`85/85 PASS`). Затем changed-files ESLint остановил релиз на `react-hooks/set-state-in-effect`: `ValueObjectTableEditor` синхронно вызывал `setTitleDraft`, `setDescriptionDraft`, `setMessage` и `setError` внутри `useEffect` при смене выбранного объекта. Код до commit не дошёл; runner выполнил возврат к exact baseline `3e664a4aa45c88f698c0b8c63cad2b8f8b0c6869`, `ROLLBACK=PASS`.

V1_4 убирает этот effect полностью. Draft title/description инициализируются лениво из props при mount, а родительский Table View задаёт `key` по id выбранного объекта, поэтому выбор другой строки создаёт новый экземпляр editor с корректным исходным состоянием. Это устраняет cascading-render pattern и сохраняет предсказуемый reset формы без отключения ESLint rule. Validator V1_4 отдельно требует отсутствие `useEffect` в editor и наличие key-based remount contract.

## Ошибка V1_4 и исправление V1_5

V1_4 прошёл package-path audit, Windows npm transport, baseline guards, premutation transpile, release validator (`90/90 PASS`) и changed-files ESLint (`PASS`). Full project TypeScript затем корректно остановил релиз на девяти `TS18047` в `value-object-table-editor.tsx`: после внешнего guard `if (!valueObject?.id) return` nullable prop `valueObject` использовался внутри вложенной async-функции `saveChanges`. TypeScript не обязан сохранять narrowing mutable React prop внутри closure. До commit релиз не дошёл; runner вернул checkout к exact baseline `3e664a4aa45c88f698c0b8c63cad2b8f8b0c6869`, `ROLLBACK=PASS`.

V1_5 после guard сохраняет выбранный объект в immutable local `const selectedValueObject = valueObject` и все async request/onSaved paths используют только этот narrowed capture. Родительский Table View по-прежнему remount-ит editor по `key` выбранного id, поэтому captured selection соответствует lifetime конкретного editor instance.

Дополнительно release runner V1_5 до любых изменений worktree выполняет отдельный `PREMUTATION_EDITOR_SEMANTIC_TYPESCRIPT`: создаёт временный strict TypeScript harness для нового editor, использует TypeScript из production repo и проверяет semantic diagnostics, а не только transpile/syntax. Это специально добавлено, чтобы ошибки типа `TS18047` ловились до mutation. Full project `tsc --noEmit`, changed-files ESLint, Next build и остальные gates всё равно остаются обязательными до commit.
