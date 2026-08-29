# ARCTOR_LOCAL_EDITORS_V1_6_2_CSP_SHELL_IMAGE_CLEANUP

Дата: 29.08.2026
Baseline: `main @ 01a8bc22f188c406b00fd04d84b2f5691df28f91`
Статус до запуска release runner: **IMPLEMENTATION PACKAGE READY / Production browser acceptance: PENDING**.

## 1. Откуда продолжаем

`ARCTOR_LOCAL_DOCX_EDITOR_V1_5_BROWSER_RUNTIME_HOTFIX` принят в production: DOCX открывается, редактируется и сохраняется локально. Оставшийся Console noise относится к общей оболочке ARCTor: `src/components/app-shell/global-navigation.tsx` рендерит `profile.imageUrl` обычным `<img>`, а URL профиля/аватара может вести в Supabase Storage.

Для `/local-editors` специально действует жёсткая CSP `img-src 'self' data: blob:`. Разрешать Supabase Storage в этой директиве не нужно.

## 2. V1.6 PRE-MUTATION FAIL и урок

Первый пакет `ARCTOR_LOCAL_EDITORS_V1_6_CSP_SHELL_IMAGE_CLEANUP` остановился до изменения main. Причина была в LF-only exact-string patcher: Windows scratch checkout использовал CRLF. Baseline build прошёл, scratch был удалён, `main` не изменился.

## 3. V1.6.1 PRE-COMMIT FAIL и урок

V1.6.1 исправил CRLF-проблему. Пользовательский Windows REPORT `ARCTOR_LOCAL_EDITORS_V1_6_1_CSP_SHELL_IMAGE_CLEANUP_20260829_205536_REPORT.txt` доказал, что сам product patch уже корректен:

- package integrity и secret scan: PASS;
- LF/CRLF patcher self-tests: PASS;
- validator: PASS, 49 checks;
- baseline build: PASS;
- scratch patch, changed-files ESLint, full TypeScript, `git diff --check`, production build: PASS;
- scratch whole-repo ESLint: без регрессии, `244 errors / 107 warnings` как baseline;
- все pre-mutation gates: PASS;
- main patch, validator, changed-files ESLint, full TypeScript, `git diff --check`, production build: PASS;
- main whole-repo ESLint: без регрессии.

FAIL произошёл только после `git add`, на `git diff --cached --check`: recovery-файл содержал Markdown hard-break пробелы в конце пяти строк. Это release-tooling/packaging defect, а не product-код.

Почему scratch не поймал это раньше: обычный `git diff --check` не проверяет новый untracked recovery-файл. После staging Git начал его видеть и правильно остановил release.

Runner выполнил `git reset --hard` к baseline, удалил новый recovery-файл и сообщил `ROLLBACK_RESULT=PASS`. GitHub `main` остался на baseline.

## 4. Исправление V1.6.2

V1.6.2 не меняет уже проверанный product patch. Изменения относятся к release safety:

- recovery-файл переписан без trailing whitespace;
- validator отдельно запрещает trailing spaces/tabs в recovery;
- в detached scratch worktree теперь выполняется exact staging двух ожидаемых файлов;
- затем выполняется `git diff --cached --check` ещё до mutation main;
- после scratch cached-check index возвращается в исходное состояние, рабочие изменения остаются для последующих build/lint checks;
- таким образом новый untracked recovery-файл входит в whitespace gate до изменения main.

## 5. Поведение продукта

В `src/components/app-shell/global-navigation.tsx`:

- `/local-editors` и `/local-editors/*` считаются privacy route;
- `profile.imageUrl` на этих маршрутах не рендерится как `<img>`;
- вместо картинки используется существующий initials fallback;
- на остальных страницах `profile.imageUrl` продолжает работать как раньше;
- CSS-hide не применяется: удалённый `<img>` вообще отсутствует в дереве React;
- до определения текущего пути удалённые изображения подавляются fail-closed, чтобы не возникал краткий первоначальный запрос.

CSP не расширяется. `next.config.ts` обязан сохранить `img-src 'self' data: blob:`.

## 6. Privacy boundary

Hotfix не создаёт image proxy, upload API или document storage. Контракт остаётся:

- server upload: false;
- server storage: false;
- browser persistent storage: false;
- cloud autosave: false;
- document AI calls: false.

SQL: 0.
Миграции БД: 0.
Серверное хранение документа: 0.
Runner DB writes: 0.

## 7. Release gates

До mutation main runner обязан пройти package integrity, secret scan, LF/CRLF patcher self-tests, validator positive/negative self-tests, exact baseline/origin/clean guards, baseline build и baseline ESLint. Затем тот же patch проверяется в detached scratch worktree: exact dirty set, validator, changed-files ESLint, full TypeScript, обычный `git diff --check`, **exact scratch stage + `git diff --cached --check`**, production build и whole-repo ESLint no-regression. Только после этого допускается изменение main, повтор gates, exact stage, cached diff-check, commit, push и remote verification.

Ожидаемые изменения:

1. `src/components/app-shell/global-navigation.tsx`
2. `docs/recovery/ARCTOR_LOCAL_EDITORS_V1_6_2_CSP_SHELL_IMAGE_CLEANUP_RU_20260829.md`

## 8. Production browser acceptance

После deploy проверить `/local-editors` на аккаунте с remote profile/avatar images:

- local DOCX editor открывается;
- профили в sidebar показывают initials;
- Console не содержит CSP ошибок Supabase Storage shell images;
- Network не содержит shell image request к `*.supabase.co/storage/v1/*`;
- DOCX open → edit → local save работает;
- на обычных страницах ARCTor аватары снова отображаются картинками.

Production browser acceptance: PENDING

## 9. Следующая точка

После PASS перейти к Local XLSX Editor V1 на общей Local Editor Platform с локальным открытием/редактированием/сохранением workbook и без server document storage.
