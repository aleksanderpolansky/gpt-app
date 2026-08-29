# ARCTor — T2_4_1 Table Row Create Contract V1_4

Дата: 2026-08-29
Базовый commit: `a566661d6abb40652c51a751c615f1d152b5cb07`
Предыдущий этап: T2_3 Copy/Paste + range + standalone workspace закрыт как PASS после production postcheck.

## Цель T2_4_1
Добавить создание нового дочернего объекта наблюдения непосредственно из табличного режима, не превращая Tabulator в доменный слой и не создавая параллельный write-contract. Одновременно зафиксировать общий контракт операции добавления строки, пригодный для будущего отдельного Spreadsheet editor.

## Исправление после V1 pre-mutation FAIL
V1 остановился безопасно в detached scratch до mutation main. Все 89 validator checks и changed-files ESLint прошли, но полный `tsc --noEmit` обнаружил `TS18047: 'tableCreateDraft' is possibly 'null'` в `value-object-catalog-views.tsx`. Причина: TypeScript narrowing nullable React state не сохранялся внутри callback `filter`, где использовался `tableCreateDraft.role`.

`ROLLBACK=NOT_NEEDED_PREMUTATION`: main/origin не изменялись и baseline остался `a566661d6abb40652c51a751c615f1d152b5cb07`.

V1_1 устраняет сам класс ошибки: после nullable guard значение состояния копируется в стабильную локальную константу (`const createDraft = tableCreateDraft`) перед передачей в вложенные callback/recursive functions. Runner снова выполняет полный project TypeScript в scratch до mutation main.


## V1_1 pre-mutation FAIL: validator false-negative
V1_1 также остановился безопасно в detached scratch до mutation main. Package integrity, patcher self-test, validator self-test, baseline guards и baseline main Turbopack прошли. После patch exact dirty-set был корректным, однако production validator остановился на check 069 `VO adapter intermediate mode reuses existing API`.

Причина не в product adapter: adapter действительно использовал `intermediate_branch_active_v4` и `leaf_branch_active_v4` через helper `creationMode(role)` с ternary expression. Ошибка была в validator: он искал только буквальный фрагмент `return "intermediate_branch_active_v4"`, которого корректный ternary implementation не содержит. Это release-validator false-negative. REPORT зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; main/origin не изменялись и baseline остался `a566661d6abb40652c51a751c615f1d152b5cb07`.

V1_2 исправляет validator семантически: он проверяет наличие разрешённых API mode literals независимо от конкретной формы `return`. Validator self-test теперь содержит позитивный ternary-case, воспроизводящий реальный adapter, и негативный case, где intermediate mode отсутствует. Patcher self-test дополнительно проверяет наличие обоих mode literals в реально генерируемом adapter. Runner fail-closed проверяет наличие этих regression self-tests до любого git mutation.

## V1_2 pre-mutation FAIL: recovery wording validator false-negative
V1_2 также остановился безопасно в detached scratch до mutation main. Package integrity, patcher self-test, validator self-test, baseline/origin/blob guards, baseline main Turbopack, scratch baseline webpack, patch и exact dirty-set прошли. Production validator прошёл checks 001..092 и остановился ровно на `FAIL 093 recovery closes T2_3 after production postcheck`.

Причина снова не в product-коде. Recovery корректно содержит строку `T2_3 Copy/Paste + range + standalone workspace закрыт как PASS после production postcheck.`, а validator требовал другую грамматическую форму: `закрывается как PASS`. Это formatting/wording-dependent validator false-negative. REPORT зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; main/origin не изменялись и baseline остался `a566661d6abb40652c51a751c615f1d152b5cb07`.

V1_3 устраняет этот класс ошибки двумя уровнями. Во-первых, production validator проверяет семантику строки recovery: наличие маркера T2_3, `PASS` и `production postcheck`, а не конкретное русское окончание глагола. Validator self-test принимает обе корректные формулировки (`закрыт как PASS` и `закрывается как PASS`) и блокирует вариант без `PASS`. Во-вторых, validator self-test декодирует `RECOVERY_B64` непосредственно из соседнего production patcher и прогоняет именно фактически генерируемый recovery payload через тот же semantic predicate. Поэтому несовместимость между patcher payload и validator обязана обнаруживаться package self-test ещё до обращения к git/repository.

## V1_3 pre-mutation FAIL: TypeScript closure narrowing TS18047
V1_3 впервые прошёл production validator полностью (`RESULT=PASS checks=105`) и changed-files ESLint, после чего полный project `tsc --noEmit` в detached scratch остановился на `value-object-catalog-views.tsx(1145,24): error TS18047: 'createDraft' is possibly 'null'`. REPORT снова зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; main/origin не изменялись и baseline остался `a566661d6abb40652c51a751c615f1d152b5cb07`.

Причина: `const createDraft = tableCreateDraft; if (!createDraft) return ...` корректно сужает тип в текущей функции, но TypeScript 5.8.3 намеренно не переносит такое narrowing внутрь объявленной после проверки вложенной функции `insertDraft`, потому что callback рассматривается отдельно. Внутри recursive `map` использовалось `createDraft.parentId`, поэтому full-project TypeScript справедливо блокировал patch.

V1_4 фиксирует именно product-код: сразу после non-null guard сохраняется неизменяемый примитив `const createParentId = createDraft.parentId;`, и recursive callback использует только `createParentId`. Nullable object больше не захватывается вложенной функцией. Patcher self-test запрещает возврат конструкции `row.id === createDraft.parentId`. Дополнительно локальная подготовка V1_4 компилирует TypeScript 5.8.3 strict synthetic regression, который воспроизводит ровно этот nested-callback control-flow case; старый вариант обязан падать TS18047, новый обязан компилироваться.

## Уточнённая семантика создания ОН из таблицы
По решению пользователя root из табличного `+ Row` НЕ создаётся. Для root уже существует отдельная верхняя кнопка `Создать корневой объект наблюдения` и отдельный root-authoring flow.

Таблица создаёт только дочерние ОН:
- выбранный actor-owned root -> по умолчанию `intermediate`; leaf под root запрещён существующим API-контрактом;
- выбранный actor-owned intermediate -> по умолчанию `leaf`, но пользователь может переключить роль на `intermediate`;
- следовательно intermediate может иметь как intermediate, так и leaf child;
- leaf не может быть parent;
- global/system rows не могут быть parent;
- если допустимый parent не выбран, `+ Row` не создаёт provisional row и просит сначала выбрать родительский ОН.

## Общий row-create contract для будущего Spreadsheet editor
Создан generic слой `src/components/tables/arctor-row-create-contract.ts`.

`ArctorTableRowCreateRequest<TDraft>` описывает только операцию над строкой:
- `operationId`;
- `source`;
- `placement`: `root | child | after | append`;
- `historyPolicy`: `table_local | domain_managed`;
- generic `draft`.

Generic контракт намеренно не импортирует Value Objects, Supabase, XLSX или Google Sheets. Абстрактный placement `root` остаётся частью generic tree/table protocol, но Value Object table adapter V1_4 его не использует для создания корневых ОН.

Для будущего обычного Spreadsheet editor тот же контракт сможет использовать `after/append` и `historyPolicy = table_local`, где новая строка является локальной spreadsheet-операцией и входит в обычный Undo/Redo.

Для Value Objects используется `historyPolicy = domain_managed`: создание/удаление структурной сущности не маскируется под обычный cell Undo. Структурный rollback/history относится к T2_5.

## Value Object adapter
`src/components/workspace/value-objects/value-object-table-row-create.ts` переводит generic row request только в существующие authoring modes:
- `intermediate_branch_active_v4`;
- `leaf_branch_active_v4`.

`root_branch_active_v4` из table adapter не вызывается.

Adapter:
- POST выполняет только через существующий `/api/value-objects`;
- использует стабильный `operationId` как `idempotencyKey`;
- parent обязан быть `scope_code = actor`, ontology-ready, draft/active, с canonical/root/branch fields;
- intermediate допускается под root или intermediate;
- leaf допускается только под intermediate;
- после успешного POST перечитывает canonical catalog через GET;
- если refresh не удался, сохраняет created id и показывает warning, не повторяя POST и не делая fallback row новым parent до canonical refresh.

Никаких прямых `supabase.from(...).insert(...)` из таблицы.
Никаких SQL/schema migrations.
Никаких DB/Storage/OpenAI writes из release-runner. Runtime DB write происходит только после явного нажатия пользователем Create через существующий API.

## UX
В Table/Edit mode появляется `+ Row / Добавить строку`.

Flow:
1. пользователь выбирает допустимую строку-parent или ветку hierarchy filter;
2. `+ Row` создаёт только локальную provisional child row внутри Tabulator, без DB write;
3. Name/Description редактируются теми же cell editors;
4. под root роль фиксируется/предлагается как intermediate;
5. под intermediate по умолчанию leaf, при этом role selector позволяет intermediate или leaf;
6. parent можно заменить только на допустимый для выбранной роли;
7. `Create object` выполняет ровно один POST;
8. `Cancel` просто удаляет provisional row;
9. range paste не включает provisional create row в массовые write-операции.

## Safety / release gates
До mutation main release обязан пройти:
- package integrity;
- patcher direct + normal-entrypoint self-tests;
- validator self-test;
- exact baseline / origin/main / blob guards;
- baseline main Turbopack snapshot;
- detached scratch baseline webpack snapshot;
- patch + exact dirty-set;
- validator;
- changed-files ESLint;
- full project TypeScript;
- `git diff --check`;
- patched webpack build no-regression against scratch baseline.

После mutation main до commit повторяются validator, changed-files ESLint, full TypeScript, `git diff --check`, Turbopack no-regression и full-project ESLint no-regression. До commit любой FAIL возвращает main к exact baseline. При push FAIL созданный commit сохраняется и REPORT выдаёт resume hint.

## Production postcheck
После PASS release проверить:
1. выбрать actor-owned root -> `+ Row` -> provisional child создаётся как intermediate, root option отсутствует;
2. выбрать actor-owned intermediate -> `+ Row` -> default leaf;
3. для того же intermediate переключить role leaf -> intermediate и успешно создать intermediate child;
4. убедиться, что leaf не предлагается под root;
5. убедиться, что global/system/leaf row не может стать parent;
6. Cancel не создаёт DB row;
7. T2_3 copy/paste и Undo/Redo существующих cell edits не регрессировали;
8. отдельная верхняя кнопка создания root остаётся прежним root flow.

После production PASS закрыть T2_4 и перейти к T2_5 structural operations: parent/restructure через существующий preview/apply/history contract.
