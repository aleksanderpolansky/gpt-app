# ARCTOR_TABLE_VIEWS_T2_2_INLINE_CELL_EDITING_V1_1 — recovery checkpoint

Дата: 2026-08-28

## 1. Исходная точка

Подтверждённый baseline:

`main @ 3ce5f149818dac7cc0d30351d1f32746defbf5ee`

Commit baseline:

`table-views-t2-1-safe-value-object-editor-v1-5`

T2_1 прошёл release validator, changed-files ESLint, full TypeScript, full Next production build, `git diff --check`, full ESLint no-regression, commit/push/remote verify. Production runtime persistence также подтверждён пользователем: описание Observation Object было изменено, сохранено и затем возвращено обратно; оба Save завершились корректно.

## 2. Цель T2_2

Сделать Table View Observation Objects ближе к настоящей рабочей таблице: `title` и `description` редактируются непосредственно в ячейках Tabulator без отдельной верхней формы, но business/write contracts остаются серверными контрактами ARCTor, а не логикой Tabulator.

## 3. UX

Режим редактирования остаётся opt-in через существующую кнопку `Edit table / Exit editing`.

При выключенном режиме поведение не меняется: клик по строке открывает карточку Observation Object.

При включённом режиме:

- двойной клик по `Name` открывает встроенный Tabulator `input` editor;
- двойной клик по `Description` открывает встроенный `textarea` editor;
- выход из editor подтверждает значение и запускает безопасный server write;
- Esc отменяет редактирование на уровне Tabulator;
- `Name` ограничен 180 символами;
- `Description` ограничен 4000 символами;
- пустое название запрещено;
- пустое описание нормализуется в `null`;
- после успешной записи показывается явный `Saved` feedback;
- во время запроса показывается `Saving…`;
- при ошибке показывается локализованное сообщение и ячейка возвращается к предыдущему значению.

Для Description используется `textarea` editor с `verticalNavigation=editor` и `shiftEnterSubmit=true`. Глобальная опция Tabulator `editTriggerEvent=dblclick` отделяет обычную навигацию/раскрытие Data Tree от намеренного начала редактирования.

## 4. Write contracts

### 4.1. Ontology object

Если объект разрешён T2_1/T2_2 ontology strategy, используются только существующие операции:

- title → `PATCH /api/value-objects/[id]/ontology-definition`, `editKind=rename`;
- description → тот же endpoint, `editKind=semantic_definition`.

Каждый semantic edit получает отдельный idempotency key и текущую locale.

### 4.2. Draft object

Для `status=draft`, если объект не является system/global, используется существующий:

`PATCH /api/value-objects/[id]`

Body содержит только редактируемое поле.

### 4.3. Fail-closed

Read-only:

- `scope_code=global`;
- `origin_type_code=system`;
- active/local object без поддерживаемого ontology/draft write-contract.

Такие строки остаются видимыми, но Tabulator `editable` callback возвращает false. Клик по строке в Edit mode показывает причину read-only.

## 5. Rollback поведения ячейки

Tabulator остаётся presentation/editor layer. Локальное изменение ячейки не считается подтверждённым Reality Model write до ответа существующего ARCTor endpoint.

`ArctorTabulator` передаёт consumer callback событие `cellEdited` с:

- row data;
- field;
- new value;
- old value;
- `restoreOldValue()`.

Если write не прошёл, consumer вызывает `restoreOldValue()`. Tabulator документирует этот метод как восстановление предыдущего значения без повторного запуска edit callbacks, поэтому client rollback не создаёт рекурсивный save-loop.

Если consumer callback неожиданно reject-ит promise, общий adapter имеет дополнительный fallback и также восстанавливает старое значение.

## 6. State synchronization

После успешного server write helper возвращает минимальный patch `{id, title}` или `{id, description}`. Существующий `onValueObjectUpdated` обновляет только matching Observation Object в `ActualValueObjectsList`, после чего React пересобирает Table rows из подтверждённого state.

Если пользователь ввёл только пробелы вокруг старого значения и нормализованное значение фактически не изменилось, network write не выполняется; Tabulator возвращается к старому отображению и показывает `No changes`.

## 7. Что T2_2 не меняет

- structural parent — только controlled restructure preview/apply;
- Role;
- Status;
- Direct/Descendants/Leaves counters;
- delete/create;
- Map / Tree / Cards contracts;
- Activity Journal editing;
- Facts correction/editing;
- DB schema;
- SQL;
- Storage;
- OpenAI;
- Tabulator dependency version (`6.5.2`).

Существующий компонент T2_1 `ValueObjectTableEditor` остаётся в source как совместимый safe-contract surface/helper, но `/value-objects → Table` больше не рендерит его верхнюю форму.

## 8. Release safety

Runner обязан до mutation проверить:

- Windows Node/Git/npm transport;
- branch `main`;
- clean worktree;
- exact HEAD и exact `origin/main`;
- exact blob SHA изменяемых baseline-файлов;
- отсутствие новых validator/recovery paths;
- payload manifest SHA256;
- secret scan;
- package-path audit;
- UTF-8/no-BOM;
- pre-mutation TypeScript transpile всех трёх изменяемых TSX;
- отдельный strict semantic TypeScript harness для adapter/editor/catalog integration;
- inline-save runtime contract tests с mocked `fetch` (ontology rename/description, draft title/description, no-op, limits, global/system/unsupported read-only).

После mutation, но до commit:

- release validator;
- changed-files ESLint `--max-warnings=0`;
- full `tsc --noEmit`;
- full Next production build;
- `git diff --check`;
- full ESLint post snapshot без регрессии относительно baseline;
- exact dirty set;
- exact staged set;
- staged diff check.

Только после всех PASS разрешены commit и push. Push failure после commit сохраняет commit и выдаёт resume-push hint. Любой FAIL до commit выполняет rollback к exact baseline.

## 8.1. Локальная проверка release-пакета перед выдачей

До передачи пользователю выполнены отдельные проверки, не зависящие от production checkout:

- `node --check` runner и validator — PASS;
- payload manifest SHA256 / exact path set / UTF-8 без BOM / secret scan — PASS;
- validator на synthetic source tree с exact baseline blobs — 91/91 PASS;
- semantic TypeScript integration harness для adapter + catalog + editor — PASS;
- mocked-fetch runtime tests single-field helper — PASS: ontology rename/description, draft title/description, no-op, пустой title, max-length, global/system/unsupported read-only;
- synthetic Git apply/stage: `git diff --check`, exact dirty set, exact staged set и staged diff check — PASS;
- synthetic pre-commit failure после APPLY/validator: runner корректно выполнил rollback и вернул clean exact baseline — PASS;
- synthetic full release lifecycle с локальным bare `origin`: commit + push + fetch + exact remote verify + clean worktree — PASS;
- synthetic rejected push: commit сохранён, `RESULT=COMMIT_CREATED_PUSH_FAILED`, worktree clean и выдан `RESUME_HINT=git push origin main` — PASS.

Эти симуляции проверяют управляющую логику release-runner. Они не заменяют обязательные full ESLint/TypeScript/Next checks на production checkout; runner выполняет их до production commit.

## 9. Production postcheck после PASS release

Нужно проверить один пользовательский объект:

1. включить `Edit table`;
2. double-click по Name или Description;
3. изменить значение;
4. выйти из ячейки;
5. увидеть `Saving…` → `Saved`;
6. F5 и проверить persistence;
7. вернуть исходное значение.

Отдельно выбрать system/global строку и убедиться, что встроенный editor не открывается, а UI сообщает read-only.

## 10. Следующие блоки

После T2_2 следующий domain-table этап выбирать отдельно: безопасные Activity Journal edits либо controlled Facts corrections.

Отдельное продуктовое направление остаётся зафиксированным: Documents / Spreadsheets / Mind Maps с Guest/Local mode без обязательной регистрации для локальной работы и Download; аккаунт ARCTor — upgrade для cloud save/history/collaboration/AI. Полноценный Spreadsheet document editor не смешивается с domain-table T2_2.


## 11. V1 failure and V1_1 correction

Первая попытка `ARCTOR_TABLE_VIEWS_T2_2_INLINE_CELL_EDITING_V1` не была выпущена. Release validator и changed-files ESLint прошли, но полный project `tsc --noEmit` остановил релиз в `arctor-tabulator.tsx`.

Причина: `tabulator-tables@6.5.2` поставляется как JavaScript. При `allowJs=true` TypeScript в текущем проекте вывел тип метода `instance.on` из уже используемого события `rowClick`. Прямой второй вызов `instance.on("cellEdited", ...)` поэтому дал `TS2345`, а параметр callback был ошибочно типизирован как `MouseEvent`, что породило последующие `TS2339` для `getRow/getField/getValue/getOldValue/restoreOldValue`. Runtime API Tabulator при этом поддерживает `cellEdited`; ошибка была именно на границе JS type inference.

Runner V1 после FAIL выполнил `git reset --hard 3ce5f149818dac7cc0d30351d1f32746defbf5ee`; итоговый `ROLLBACK=PASS`, commit не создавался, production source не изменился.

V1_1 оставляет runtime subscription `cellEdited`, но вводит узкий локальный structural bridge `TabulatorCellEditedEmitter`. Только `cellEdited`-подписка приводится через `instance as unknown as TabulatorCellEditedEmitter`; весь остальной Tabulator instance не переводится в `any` и существующий `rowClick` остаётся на фактически выведенном типе.

Дополнительно V1_1 усиливает pre-mutation gates:

- semantic integration stub теперь намеренно моделирует `instance.on` как rowClick-only signature, то есть старый V1 не прошёл бы этот preflight;
- отдельный regression fixture обязан доказать `bad direct cellEdited -> TS2345`, `typed bridge -> PASS`;
- до mutation runner создаёт detached scratch worktree exact baseline, подключает фактический production `node_modules` через junction/symlink и применяет payload только в scratch. Там до изменения основного worktree проходят exact dirty set, release validator, changed-files ESLint, полный project `tsc --noEmit` и `git diff --check`. Ключевые markers: `PREMUTATION_SCRATCH_RELEASE_VALIDATOR=PASS`, `PREMUTATION_SCRATCH_CHANGED_FILES_ESLINT=PASS`, `PREMUTATION_FULL_PROJECT_TYPESCRIPT_SCRATCH=PASS`, `PREMUTATION_SCRATCH_GIT_DIFF_CHECK=PASS`.

Все прочие T2_2 contracts, fail-closed правила, отсутствие parent/status/role writes и Guest/Local направление остаются без изменений.


## 12. V1_1 local verification before packaging

Перед упаковкой V1_1 локально выполнено:

- `node --check` runner и validator — PASS;
- package manifest / SHA256 / exact payload paths / UTF-8 no BOM / secret scan через runner self-test — PASS;
- semantic TypeScript integration adapter + catalog + editor с намеренно rowClick-only `TabulatorFull.on` model — PASS;
- regression fixture: старый прямой `instance.on("cellEdited")` воспроизводит `TS2345`, новый `TabulatorCellEditedEmitter` bridge проходит strict TypeScript — PASS;
- emit-check подтверждает, что TypeScript cast стирается, а runtime остаётся обычным `cellEditedEmitter.on("cellEdited", ...)` — PASS;
- обновлённый release validator на synthetic tree — 97/97 PASS;
- CR/LF/BOM/trailing-whitespace checks всего пакета — PASS;
- механизм detached git worktree + linked node_modules + `tsc` отдельно воспроизведён на локальном synthetic git repo — PASS.

Невозможно локально выполнить именно полный production ARCTor `tsc`/ESLint/Next build, потому что локальная среда не содержит полного production checkout и его `node_modules`. Поэтому V1_1 теперь переносит full project TypeScript и changed-files ESLint в отдельный scratch worktree **до mutation основного checkout**, а затем повторяет обязательные static/build gates уже после controlled apply и до commit.
