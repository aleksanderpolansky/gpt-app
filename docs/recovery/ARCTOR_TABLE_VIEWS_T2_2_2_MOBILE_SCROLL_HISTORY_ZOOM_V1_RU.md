# ARCTOR_TABLE_VIEWS_T2_2_2_MOBILE_SCROLL_HISTORY_ZOOM_V1 — recovery checkpoint

Дата: 2026-08-28

## 1. Исходная точка

Подтверждённый baseline:

`main @ ef40312b861db69553199249bef6500dcd021d5e`

Commit baseline:

`table-views-t2-2-1-expanded-cell-editor-ux-hotfix-v1-1`

T2_2_1 прошёл short scratch preflight, validator 138/138, changed-files ESLint, full TypeScript, full Next production build, git diff --check, commit/push/remote verify. Production UX подтверждён пользователем на desktop и smartphone: expanded Description editor удобен, Save работает, gray/read-only cells видимы, smartphone adaptation выглядит корректно.

## 2. Цель T2_2_2

Добавить три usability-функции Table View Observation Objects без изменения Reality Model и write contracts:

1. горизонтальный touch-scroll таблицы на смартфоне, чтобы были доступны все видимые столбцы;
2. Undo / Redo для уже подтверждённых title/description edits текущей сессии редактирования;
3. разрешить native browser pinch zoom на смартфоне, без кастомного transform-scale таблицы.

## 3. Mobile horizontal scroll

На compact touch environment Table View переключается с desktop `fitColumns + responsiveLayout=hide` на `fitData + responsiveLayout=false`.

Все видимые столбцы сохраняются и доступны горизонтальным swipe внутри `.tabulator-tableholder`.

Мобильные min-width задаются отдельно. Первый столбец на смартфоне не frozen, чтобы он не занимал почти весь viewport.

CSS явно разрешает `overflow-x:auto`, inertial touch scrolling и `touch-action: pan-x pan-y pinch-zoom`.

## 4. Native pinch zoom

ARCTor не вводит собственный CSS transform zoom: он конфликтовал бы с fixed expanded editor, touch coordinates и accessibility.

Используется browser-native pinch zoom. `src/app/layout.tsx` не содержит `userScalable:false`, `maximumScale:1` или `user-scalable=no`; table touch-action явно допускает `pinch-zoom`.

## 5. Undo / Redo

Undo/Redo относится только к успешно сохранённым изменениям `title` и `description` текущей Edit table session.

Каждый history entry хранит:

- objectId;
- field;
- persisted before;
- persisted after.

Undo и Redo НЕ являются локальной визуальной подменой. Они повторно вызывают existing `saveValueObjectTableField(...)`, то есть серверный ontology/draft PATCH contract. После подтверждения patch обновляется React state.

Новая обычная правка очищает Redo stack. История ограничена 50 действиями и очищается при входе/выходе из Edit table, чтобы не применять stale operations после смены editing session.

Global/system и unsupported objects остаются fail-closed. Undo/Redo не обходят `getValueObjectTableEditStrategy`.

## 6. UX кнопок

В Edit table появляются Undo и Redo рядом с Exit editing.

На смартфоне сохраняются touch targets не менее 44px; текст подписи скрывается на узком экране, но aria-label/title остаются.

Disabled state серый и неактивный. Во время history write обе кнопки заблокированы.

## 7. Структурные и data boundaries

Не меняются:

- только title/description через existing PATCH contracts;
- parent не меняется из таблицы;
- parent/reparent только controlled restructure preview/apply;
- Role, Direct, Descendants, Leaves, Status — read-only;
- `scope_code=global` — read-only;
- `origin_type_code=system` — read-only;
- нет create/delete в этом релизе.

Release runner:

- `DB_WRITES=0`;
- `STORAGE_WRITES=0`;
- `OPENAI_CALLS=0`;
- `SQL_EXECUTED=0`;
- `SCHEMA_MIGRATIONS=0`.

## 8. Release safety

До mutation main:

- exact branch/head/origin guards;
- exact blob guards;
- payload manifest/hash/UTF-8/secret scan;
- semantic TypeScript integration;
- Tabulator cellEdited typing regression;
- expanded editor runtime tests;
- short detached worktree `_arctor_t222_preflight` with command-local `core.longpaths=true`;
- validator;
- changed-files ESLint;
- full project TypeScript;
- git diff --check.

После mutation и до commit все критические проверки повторяются, плюс full Next production build и ESLint no-regression.

## 9. Следующая точка

После PASS release проверить production на смартфоне:

- swipe вправо/влево показывает все столбцы;
- pinch zoom работает как native page zoom;
- Undo реально возвращает сохранённое значение после F5;
- Redo повторно сохраняет отменённое значение;
- gray/read-only cells не редактируются.

После runtime PASS T2_2_2 можно закрыть и переходить к созданию строк/объектов, copy/paste и будущему Spreadsheet mode.

Guest/Local Documents / Spreadsheets / Mind Maps направление сохраняется: guest mode без обязательной регистрации, client-side processing там, где возможно, Download без forced signup; account добавляет cloud/history/collaboration/AI.

## 10. Локальная проверка release-runner перед выдачей

На отдельном synthetic Git repo с exact baseline blobs выполнены три сценария:

1. полный source release: preflight → apply → validation → commit → push → fetch → remote verify → clean worktree — PASS;
2. intentional Next build failure до commit: runner выполнил `ROLLBACK=PASS`, HEAD вернулся точно к baseline, worktree clean — PASS;
3. intentional remote push reject после commit: `RESULT=COMMIT_CREATED_PUSH_FAILED`, worktree clean, `RESUME_HINT=git push origin main`; после снятия reject обычный resume push синхронизировал origin/main — PASS.

Это не заменяет full checks на production checkout: реальные ESLint/TypeScript/Next выполняются runner-ом повторно на компьютере пользователя.
