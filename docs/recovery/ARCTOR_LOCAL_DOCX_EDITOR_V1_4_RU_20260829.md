# ARCTOR_LOCAL_DOCX_EDITOR_V1_4 — recovery checkpoint

Дата: 2026-08-29

## Baseline

- Репозиторий: `aleksanderpolansky/gpt-app`.
- Ветка: `main`.
- Обязательный исходный commit: `ee22b59784692eaaa1c4307ffb98c05f51a5bbac` (`local-editor-platform-v1`).
- Точка входа локальных редакторов: `/local-editors`.

## Что добавлено

1. Для типа `document` подключён `@casualoffice/docs@1.4.2`.
2. Локальный `.docx` передаётся напрямую в `DocxEditor` как браузерный `File`.
3. Редактирование работает внутри страницы ARCTor; shell CasualOffice скрыт через `chrome="embedded"`, но меню и панель форматирования редактора остаются.
4. Сохранение выполняется только явной кнопкой пользователя и возвращает `.docx` на его устройство через существующий `saveLocalEditorBlob`.
5. Для замены/очистки документа и закрытия вкладки добавлена защита от потери несохранённых изменений.
6. Spreadsheet и Mind map остаются на предыдущем локальном файловом runtime и этим релизом не получают движок редактирования.

## Граница приватности

Исходный контракт `LOCAL_EDITOR_PRIVACY_CONTRACT` сохраняется: серверная загрузка, серверное хранение, постоянное браузерное хранение содержимого, cloud autosave и content AI calls должны оставаться `false`.

У `@casualoffice/docs` веб-режим по умолчанию содержит IndexedDB autosave/recent-file recovery. Его собственный код отключает эти пути, когда `window.__deskApp__.isDesktop === true`. ARCTor активирует этот локально-ориентированный compatibility guard синхронно в пользовательском обработчике открытия файла до mount `DocxEditor`, предварительно сохраняя прежние значения. Guard восстанавливается после удаления документа из памяти или при unmount страницы локальных редакторов. Одновременно `window.__casualFeatures__.docops` принудительно выключается на время жизни редактора. Tauri (`window.__TAURI__`) не включается.

Важно: это интеграционный privacy adapter V1. Если CasualOffice выпустит публичный prop вроде `autosave={false}` / `persistentStorage={false}`, следует заменить внутренний compatibility guard на официальный API.

## Сохранение

`DocxEditorRef.export({ selective: false })` вызывается только после установки local-only guard. Поэтому встроенный `handleSave` пропускает IndexedDB autosave. Полученный `ArrayBuffer` превращается в DOCX `Blob` и передаётся в `saveLocalEditorBlob`.

## Safety rails

- В ARCTor-интеграции редактора запрещены прямые `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `/api/`, Supabase/OpenAI вызовы с документом.
- Не добавляются Server Actions и API routes для DOCX.
- Не добавляются `localStorage`, `sessionStorage` или `indexedDB` вызовы в ARCTor-коде редактора.
- AI DocOps выключен.
- Патч применяется только к точному baseline commit и точным git blob SHA для `package.json`, `package-lock.json` и текущего `local-editor-platform.tsx`.

## Проверки release runner

До изменения `main` runner обязан выполнить в detached worktree:

- package integrity;
- patcher self-test и normal-entrypoint self-test;
- validator self-test + negative privacy test;
- baseline branch/HEAD/origin/clean guards;
- baseline `npm run build`;
- baseline whole-repo ESLint snapshot;
- patch в detached worktree;
- `npm install --ignore-scripts --no-audit --no-fund` для генерации lock/install dependency;
- exact dirty-set check;
- validator;
- changed-file ESLint;
- full TypeScript `tsc --noEmit`;
- `git diff --check`;
- patched `npm run build`;
- whole-repo ESLint no-regression.

Только после PASS всех pre-mutation gates runner повторяет patch на `main`, устанавливает dependency, повторяет проверки, делает commit/push, проверяет `origin/main` и clean worktree.

## Rollback / resume

- Ошибка до commit: runner возвращает tracked-файлы к baseline и удаляет только новые файлы этого релиза.
- Ошибка после локального commit, но до успешного push: commit сохраняется; повторная команда — `git push origin main` после устранения причины.
- После успешного push rollback выполняется отдельным revert/release, а не переписыванием истории.

## Следующая точка

После production-проверки DOCX: открыть реальный документ, изменить текст/форматирование, сохранить копию, повторно открыть её в Word/LibreOffice и убедиться в round-trip. Затем переходить к XLSX editor, не смешивая его persistence/history с DOCX.

## DB / schema impact

- SQL: 0.
- Миграции БД: 0.
- Новые API routes / Server Actions для содержимого DOCX: 0.
- Серверные записи содержимого документа: 0.


## V1_1 — первая попытка hotfix runner

Первая попытка V1 остановилась fail-closed до изменения `main`: Node 24 / Windows вернул `spawnSync npm.cmd EINVAL` на baseline build. V1_1 не менял прикладной scope DOCX-редактора. Попытка заменить прямой spawn `.cmd` на `cmd.exe /d /s /c` тоже остановилась fail-closed на baseline build: `cmd.exe` получил экранированное имя `\"npm.cmd\"` и вернул `not recognized`. `main` не изменялся.


## V1_2 — Node CLI runner hotfix

V1_2 полностью убирает запуск `npm.cmd` / `npx.cmd` через Windows shell. На Windows runner находит `node_modules/npm/bin/npm-cli.js` и `npx-cli.js` рядом с текущим `node.exe` либо рядом с launcher, найденным через `where.exe`, после чего запускает CLI напрямую текущим `node.exe`. Это исключает оба наблюдавшихся класса ошибок Node 24 / Windows: `spawnSync npm.cmd EINVAL` и ошибочное shell quoting `\"npm.cmd\" is not recognized`.

Добавлены self-tests для npm/npx Node-CLI resolution, fallback через `where.exe`, fail-closed при отсутствии CLI и прямого исполнения JS CLI. Прикладной DOCX payload, privacy boundary, SQL/DB scope и baseline остаются неизменными.


## V1_3 — React ESLint hotfix

V1_2 впервые успешно прошёл реальный baseline `npm run build`, baseline ESLint snapshot, detached worktree, установку `@casualoffice/docs@1.4.2`, exact dirty-set и validator. Затем pre-mutation changed-file ESLint корректно остановил релиз на двух `react-hooks/set-state-in-effect` ошибках в `local-docx-editor.tsx`. `main` не изменялся, scratch worktree был удалён.

V1_3 убирает оба запрещённых synchronous setState из effects:

1. privacy guard теперь активируется синхронно внутри пользовательского `openFile(document)` event handler **до** `setFiles` и, следовательно, до mount `DocxEditor`; отдельный `privacyGuardReady` state/effect больше не нужен;
2. сброс состояния при смене файла выполняется через remount `LocalDocxEditor` с `documentRevision` key, а не через effect с `setDirtyState`/`setMessage`/`setError`.

Effects в V1_3 используются только для внешней синхронизации/cleanup: `beforeunload` listener и восстановление compatibility guard. Прикладной DOCX scope, dependency version, privacy boundary, SQL/DB scope и baseline не меняются.

## V1_4 — Turbopack / optional foreign-format converter isolation

V1_3 успешно прошёл реальные Windows-гейты до production build: baseline build, detached worktree, `npm install`, точную установку `@casualoffice/docs@1.4.2`, validator 62/62, changed-file ESLint и полный `tsc --noEmit`. Затем patched Turbopack build корректно остановил релиз до mutation `main` на транзитивном optional converter dependency: `@schnsrw/core/dist/s1engine_wasm-*.js` ссылался на `s1engine_wasm_bg.wasm`, который Turbopack не смог разрешить. Scratch worktree был удалён; `main` не изменялся.

Проверка исходного кода exact upstream `@casualoffice/docs@1.4.2` показала, что `format-converter.worker.ts` импортирует из `@schnsrw/core` только `init`, `convert`, `convertToString` и `detectFormat`. При этом `format-converter.ts` прямо ограничивает этот worker иностранными форматами `.odt/.md/.txt` и фиксирует правило: **DOCX stays on the native path**. ARCTor V1 принимает только `.docx`, поэтому 7 MB WASM-конвертер не относится к нашему разрешённому runtime-path.

V1_4 не копирует отсутствующий WASM, не патчит `node_modules` и не расширяет список форматов. Вместо этого `next.config.ts` получает `turbopack.resolveAlias` для `@schnsrw/core` на локальный fail-closed adapter `src/lib/local-editors/casual-core-foreign-converter-disabled.ts`. Adapter экспортирует совместимые имена `init`, `convert`, `convertToString`, `detectFormat`, `extractText`, но любой вызов немедленно завершается ошибкой `ARCTor local DOCX mode disables CasualOffice foreign-format conversion.`

Таким образом:

- native DOCX parser/serializer CasualOffice остаётся доступен;
- `.odt/.md/.txt/.pdf` conversion через Casual Core намеренно недоступен;
- `s1engine_wasm_bg.wasm` не копируется в `public`, source tree или release payload;
- исходный CSP `/local-editors` с `connect-src 'none'` сохраняется;
- privacy compatibility guard и `ai={{ enabled: false }}` сохраняются;
- SQL: 0; миграции БД: 0; document-content API routes: 0; server document storage: 0.

Runner V1_4 дополнительно blob-guard'ит baseline `next.config.ts`, проверяет точный alias, fail-closed adapter и его пять экспортов, выполняет negative converter-alias self-test и включает `next.config.ts` + adapter в changed-file ESLint. Критический acceptance-gate — реальный patched `npm run build` в detached worktree: только его PASS разрешает mutation `main`.
