# ARCTOR_LOCAL_DOCX_EDITOR_V1_5_BROWSER_RUNTIME_HOTFIX — recovery checkpoint

Дата: 2026-08-29
Baseline: `037411a2ace54fcdd542c9b6dbbc31f51aeff08c` (`local-docx-editor-v1-4`).

## Причина этапа

V1_4 прошёл полный release/build pipeline, но production acceptance на `/local-editors` выявил browser-runtime проблемы:

1. React production error `#418` (hydration mismatch). Local-editor page читала `window.location.search` непосредственно в initial client state, тогда как SSR/static snapshot был английским.
2. CSP `connect-src 'none'` блокировал штатную оболочку ARCTor на той же странице (`/api/me`, `/api/actor-context`, admin navigation, heartbeat, help, AI model catalog и другие shell-запросы).
3. CSP блокировал подключаемый общей оболочкой Google Fonts stylesheet.
4. Локализация local-editor body не соответствовала языковому переключателю: PL/DE/ES/CS использовали EN_COPY, UK использовал RU_COPY.
5. В `openLocalEditorFile()` существовал слишком агрессивный fallback `window.focus -> setTimeout(0) -> cancelled`. Production console measurement показал, что реальный Chrome picker корректно выдаёт `change` с выбранным DOCX, поэтому современный путь должен опираться на `change/cancel`, а focus fallback допустим только как медленный legacy fallback.

## Решения

- Для `/local-editors/:path*` CSP изменён на `connect-src 'self'`: штатная same-origin оболочка ARCTor снова работает, внешние подключения по-прежнему не разрешены.
- Разрешены только необходимые Google Fonts origins для stylesheet/font assets общей оболочки:
  - `style-src ... https://fonts.googleapis.com`
  - `font-src ... https://fonts.gstatic.com`
- Граница документа остаётся fail-closed на уровне ARCTor editor integration: локальные editor/runtime файлы не содержат `fetch`, XHR, WebSocket, EventSource, sendBeacon, Supabase, `/api/`, IndexedDB/localStorage/sessionStorage или server actions.
- `ai={{ enabled: false }}` сохранён.
- CasualOffice persistent browser autosave/recent-file path по-прежнему отключается через local desktop compatibility guard; `docops=false` сохранён.
- Locale теперь берётся из общего `src/i18n` через `getLocaleSearchParam` и `useSyncExternalStore`. Server snapshot всегда `en`, поэтому hydration совпадает с SSR; после hydration React получает URL locale без hydration error.
- Добавлены самостоятельные тексты local-editor UI для `en/pl/ru/uk/de/es/cs`.
- Встроенный CasualOffice editor получает штатные i18n-пакеты там, где они доступны в `@casualoffice/docs@1.4.2`: EN / PL / DE. Для остальных ARCTor locale используется engine EN fallback; оболочка ARCTor при этом полностью локализована.
- File picker использует реальные `change` и `cancel`; focus fallback включается только если браузер не поддерживает `cancel` event и ждёт 500 ms, исключая прежний `setTimeout(0)` race.

## Privacy contract

Документ пользователя:

`локальный диск -> File/Blob в памяти браузера -> DOCX editor -> Blob -> локальный диск`.

Серверное хранение документа: 0.
Document upload endpoint: 0.
Миграции БД: 0.
SQL: 0.
Runner DB writes: 0.
OpenAI/document-content calls: 0.

Разрешение `connect-src 'self'` относится к существующей оболочке сайта и не создаёт document-upload path. Валидатор отдельно запрещает любые сетевые primitives/API routes в local-editor integration code.

## Проверки release

Runner обязан до изменения `main` выполнить:

- exact baseline/origin/clean guards;
- baseline Turbopack build;
- baseline whole-repo ESLint counts;
- detached scratch worktree;
- patcher + validator;
- changed-files ESLint;
- full TypeScript;
- `git diff --check`;
- patched Turbopack build;
- whole-repo ESLint no-regression;
- exact dirty set.

Только после всех pre-mutation PASS допускаются patch main, повтор полного gate-набора, exact stage, commit, push, remote verify и final clean.

## Rollback / resume

До commit любой failure должен оставить/вернуть `main` к baseline `037411a2ace54fcdd542c9b6dbbc31f51aeff08c` и clean status. После созданного commit при failure push commit сохраняется локально и runner обязан вывести resume hint; автоматический destructive reset после commit запрещён.

## Точка продолжения

После PASS проверить production:

1. переключатели UK/PL/CS/DE/ES/RU/EN — local-editor body соответствует выбранному locale;
2. в console отсутствует React hydration `#418`;
3. shell same-origin API больше не блокируется CSP;
4. Google Fonts stylesheet не блокируется CSP;
5. выбрать `.docx` — файл должен реально перейти в editor, а не получить ложное `cancelled`;
6. изменить документ, Save DOCX locally, открыть сохранённую копию в Microsoft Word.
