# ARCTOR_TABLE_VIEWS_T2_2_1_EXPANDED_CELL_EDITOR_UX_HOTFIX_V1_1 — recovery checkpoint

Дата: 2026-08-28

## 1. Исходная точка

Подтверждённый baseline:

`main @ 0aee9d0aa63fc6398802ad22201b67e677c69d24`

Commit baseline:

`table-views-t2-2-inline-cell-editing-v1-1`

T2_2 V1_1 прошёл detached scratch preflight, changed-files ESLint, full TypeScript, full Next production build, `git diff --check`, full ESLint no-regression, commit/push/remote verification; финальный worktree clean.

Production postcheck подтвердил, что Edit table и inline editing работают, но длинный Description неудобно редактировать внутри геометрии 32px ячейки. Пользователь указал Google Sheets как UX-reference и отдельно потребовал визуально выделять нередактируемые ячейки, например Role=`Intermediate`.

## 2. Неудачный T2_2_1 V1

Первый `ARCTOR_TABLE_VIEWS_T2_2_1_EXPANDED_CELL_EDITOR_UX_HOTFIX_V1` завершился до source mutation.

Успели пройти:

- payload manifest/hash/UTF-8/secret/path audit;
- exact baseline guards;
- semantic TypeScript adapter+catalog+editor;
- Tabulator `cellEdited` typing regression;
- expanded-editor runtime test.

Fail произошёл при создании detached scratch worktree. Scratch был размещён внутри очень длинной release-папки в `Downloads`, и Git for Windows не смог создать уже существующий в repository tracked path:

`docs/value-objects/category-derivation-layer-v1-c8-e-f6-e-e-g-cleanup-rollback-policy-before-controlled-production-persist-runtime-proof.txt`

Ошибка: `Filename too long` / `Could not reset index file to revision 'HEAD'`.

Это не ошибка UX-кода. Основной checkout не изменялся: `ROLLBACK=NOT_NEEDED_PREMUTATION`, baseline остался `0aee9d0aa63fc6398802ad22201b67e677c69d24`.

## 3. Исправление release runner V1_1

Detached scratch больше не создаётся внутри длинной release-папки Downloads.

Он создаётся коротким sibling path рядом с production repo:

`<repo-parent>/_arctor_t221_preflight`

Для `git worktree add/remove/prune` используется command-local `-c core.longpaths=true`; глобальная git config пользователя не изменяется.

Runner логирует `PREMUTATION_SCRATCH_SHORT_PATH=PASS` до worktree add. Любой fail scratch-preflight всё ещё происходит до mutation основного `main`.

## 4. Expanded editor UX

Write-contract T2_2 не меняется. Общий `ArctorTabulator` получает ARCTor editor markers:

- `arctor-expanded-input`;
- `arctor-expanded-textarea`.

Custom editor оставляет маленький anchor внутри Tabulator cell, а фактический editor shell рендерится в `document.body`, поэтому он не клипается `overflow:hidden` / `transform` Tabulator.

Desktop:

- Name: 420–620px, Enter saves;
- Description: 620–760px, 120–240px auto height;
- ordinary Enter in Description = newline;
- Ctrl+Enter / Cmd+Enter = save;
- Esc = cancel;
- blur = save;
- editor follows source cell on window scroll/resize.

## 5. Smartphone / touch UX

Mobile usability является обязательной частью V1_1, а не отдельным backlog.

На coarse pointer или viewport <= 768px:

- edit trigger меняется с desktop double-click на single tap;
- Name и Description editor columns получают mobile `minWidth=180` и `responsive=0`, чтобы оба поля не исчезали как secondary columns;
- floating editor работает как нижний viewport-safe sheet почти на всю ширину экрана;
- positioning использует `window.visualViewport` при наличии, поэтому editor перестраивается при появлении мобильной клавиатуры;
- listeners установлены на VisualViewport `resize`/`scroll` и удаляются при закрытии editor;
- mobile text controls используют 16px font, чтобы iOS не делал нежелательный auto-zoom;
- Name получает 48px touch-height;
- Description использует адаптивную высоту примерно 34–55% доступного visual viewport;
- textarea на mobile не требует ручного resize;
- показываются touch-friendly кнопки Save / Cancel с min-height 44px;
- blur всё ещё сохраняет, Esc остаётся cancel для аппаратной клавиатуры.

Help copy во всех 7 locale объясняет: smartphone = single tap, desktop = double-click, gray cells = read-only.

## 6. Read-only visual language

Business permissions CSS не дублирует.

Источник истины — существующий Tabulator `.tabulator-editable`, который вычисляется тем же `editable` callback, что основан на ARCTor write-contract.

В Edit mode:

- editable Name/Description остаются белыми и получают subtle blue hover frame;
- видимые non-editable cells становятся light gray + muted text;
- Role (`Intermediate`, `Root`, `Leaf`), Direct, Descendants, Leaves, Status визуально read-only;
- Name/Description global/system/unsupported objects также gray, потому что их actual editable gate=false.

После Exit editing серый read-only surface исчезает.

## 7. Safety / write boundaries

Без изменений относительно T2_2:

- editable fields: только `title` и `description`;
- `scope_code=global` => fail-closed read-only;
- `origin_type_code=system` => fail-closed read-only;
- unsupported active object => fail-closed read-only;
- ontology writes: existing `/api/value-objects/[id]/ontology-definition` PATCH, `rename` / `semantic_definition`, idempotency key retained;
- draft writes: existing `/api/value-objects/[id]` PATCH;
- structural parent не записывается inline editor и остаётся только controlled restructure preview/apply;
- Role/Status/counters не записываются;
- no create/delete/backfill;
- Activity Journal и Facts остаются read-only в этом step.

## 8. Database / external systems

Source release не добавляет SQL/schema migration.

Expected release-runner counters:

- `DB_WRITES=0`;
- `STORAGE_WRITES=0`;
- `OPENAI_CALLS=0`;
- `SQL_EXECUTED=0`;
- `SCHEMA_MIGRATIONS=0`.

Authenticated browser Save после release использует существующие ARCTor write APIs и не относится к release-runner counters.

## 9. Required release verification

До mutation main:

- exact branch/HEAD/origin baseline + clean worktree;
- exact baseline blob guards;
- payload manifest/hash/UTF-8/secret/path audit;
- TS/TSX transpile;
- semantic adapter+catalog+editor TypeScript;
- Tabulator event typing regression;
- expanded editor desktop/mobile runtime contract tests;
- short-path detached scratch worktree with actual production `node_modules`;
- scratch validator;
- scratch changed-files ESLint;
- scratch full `tsc --noEmit`;
- scratch `git diff --check`.

До commit на main:

- exact dirty set;
- release validator;
- changed-files ESLint `--max-warnings=0`;
- full TypeScript;
- full Next production build;
- `git diff --check`;
- full ESLint no-regression;
- exact staged set;
- staged diff check.

После commit:

- clean worktree;
- push origin/main;
- fetch + exact remote verify;
- final clean worktree.

Fail до commit => exact reset к `0aee9d0aa63fc6398802ad22201b67e677c69d24`. Push fail после commit сохраняет commit и выдаёт `RESUME_HINT=git push origin main`.

## 10. Production postcheck after PASS

Desktop:

1. `/value-objects -> Table -> Edit table`.
2. Double-click long Description => large floating editor over table.
3. Role=`Intermediate` и другие non-editable cells visibly gray and do not edit.
4. Save/Cancel/Esc/blur behavior remains correct.

Smartphone:

1. Open same Table/Edit mode on a real smartphone or narrow touch viewport.
2. Single tap Name or Description => editor opens; double tap is not required.
3. Editor stays visible above the virtual keyboard and uses almost full viewport width.
4. Save / Cancel buttons have comfortable touch targets.
5. Description supports multiline input without making permanent table rows taller.
6. Global/system Name/Description and all non-editable columns remain read-only.

## 11. Future direction retained

Guest/Local Documents / Spreadsheets / Mind Maps remains a separate later product block: local create/edit/download without mandatory registration where technically feasible; ARCTor account adds cloud save/history/collaboration/AI/device sync.
