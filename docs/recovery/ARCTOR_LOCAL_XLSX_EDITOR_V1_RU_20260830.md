# ARCTor Local XLSX Editor V1

Дата: 2026-08-30
Baseline: `23663ffa95e859eafc7b2e126abe3573645e82bf`

## Исходное состояние

DOCX-ветка Local Editors закрыта production PASS. V1.8.1 исправил недоступный левый край документа на смартфоне; commit/push/remote verify завершились на baseline выше.

Раздел Spreadsheet на `/local-editors` уже существует как local-only карточка для `.xlsx`, но до этого релиза файл можно было только выбрать и сохранить обратно без табличного редактирования.

## Решение V1

Подключить первый локальный XLSX-редактор поверх уже существующего общего табличного слоя ARCTor (`ArctorTabulator` / Tabulator 6.5.2) и общего `LocalEditorStandaloneFrame`.

Пользовательский поток сохраняет текущую логику DOCX:

1. Пользователь выбирает локальный `.xlsx` на обычной странице `/local-editors`.
2. Редактор сначала открывается внутри обычной страницы ARCTor, а не сразу во весь экран.
3. По требованию пользователь нажимает «Развернуть редактор» и получает полноэкранное рабочее пространство.
4. «Завершить редактирование» или `Esc` возвращает обычную страницу с тем же workbook в памяти и без потери несохранённых изменений.
5. Изменённая книга сохраняется только локально через существующий `saveLocalEditorBlob`.

## Возможности V1

- чтение `.xlsx` полностью в браузере;
- несколько листов книги и переключение между ними;
- редактирование обычных текстовых, числовых и логических ячеек;
- формулы показываются, но защищены от редактирования в V1, чтобы не разрушать формульный слой;
- диапазонное Copy/Paste на desktop через существующий Tabulator range clipboard;
- одиночное редактирование на смартфоне через существующий touch editor;
- горизонтальная прокрутка таблицы на смартфоне;
- optional fullscreen, а не принудительный fullscreen;
- локальное сохранение новой `.xlsx`-копии;
- предупреждение о незаписанных изменениях перед закрытием/заменой книги;
- безопасный предел отображения очень больших листов; невидимые клетки не удаляются из workbook.

## XLSX engine

Используется SheetJS Community Edition `xlsx@0.20.3`, закреплённый точным URL:

`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`

Runtime остаётся client-side. Библиотека включается в web bundle; содержимое пользовательской книги не передаётся в SheetJS, ARCTor API или другие серверы.

## Privacy lock

Не меняется:

- serverUpload = false;
- serverStorage = false;
- browserPersistentStorage = false;
- documentNetworkConnections = false;
- cloudAutosave = false;
- contentAnalytics = false;
- contentAiCalls = false.

Новый XLSX-компонент не использует `fetch`, XMLHttpRequest, WebSocket, EventSource, sendBeacon, LocalStorage, SessionStorage или IndexedDB.

## Ограничения V1

Это первый рабочий табличный редактор, а не полная копия Microsoft Excel.

- формулы в V1 read-only;
- нет создания/удаления листов;
- нет структурного удаления/вставки строк и столбцов;
- нет отдельного UI форматирования;
- нет гарантии сохранения всех сложных Excel-объектов (макросов, ActiveX, внешних подключений, Pivot/Charts и других расширенных функций);
- `.csv` остаётся следующим небольшим расширением после production acceptance `.xlsx`.

## R2 — Windows self-test hotfix

Первый пакет V1 остановился ДО baseline/build/mutation на Windows при обязательном `VALIDATE... --self-test`. Причина была только в управляющем валидаторе: путь к собственной папке вычислялся через `new URL(import.meta.url).pathname`, что некорректно для Windows drive-letter путей вида `C:\...`. Продуктовый XLSX-патч не применялся, `main` не изменялся.

R2 заменяет это вычисление на стандартный `fileURLToPath(import.meta.url)`. Сам XLSX-компонент, UX-lock «обычная страница сначала → fullscreen только по требованию», privacy boundary и продуктовый scope V1 не меняются.

## R3 — dirty-set gate hotfix

R2 успешно прошёл package self-test, baseline build, baseline ESLint snapshot, создание scratch-worktree, применение XLSX-патча и установку `xlsx@0.20.3`, после чего остановился на `SCRATCH_DIRTY_SET` до validator/TypeScript/изменённого production build и до любых изменений `main`.

Причина была в runner: `gitOutput()` возвращал `stdout.trim()`, а `dirtyFiles()` затем пытался разбирать `git status --porcelain`. Если первой строкой была ` M package-lock.json`, начальный пробел статуса удалялся `trim()`, и `slice(3)` превращал путь в `ackage-lock.json`. Это ложный FAIL управляющего gate, а не дефект XLSX-кода.

R3 больше не разбирает porcelain для списка изменённых файлов. Dirty-set собирается из `git diff --name-only`, `git diff --cached --name-only` и `git ls-files --others --exclude-standard` с дедупликацией. Добавлен реальный временный Git self-test, где `package-lock.json` специально является первым изменённым tracked-файлом. Продуктовый XLSX-патч не менялся; `main` после R2 остался на baseline `23663ffa95e859eafc7b2e126abe3573645e82bf`.

## R4 — React ESLint hotfix

R3 успешно прошёл package self-test, baseline build, baseline ESLint snapshot, scratch-worktree, применение XLSX-патча, установку `xlsx@0.20.3`, dirty-set gate и validator. Первый содержательный gate нового компонента — changed-files ESLint — остановил релиз до TypeScript/build изменённого проекта и до любых изменений `main`.

Причины были в `local-spreadsheet-editor.tsx`:

- четыре синхронных сброса state выполнялись непосредственно в теле `useEffect`, что нарушало `react-hooks/set-state-in-effect`;
- JSX кнопки сохранения читал `workbookRef.current` во время render, что нарушало `react-hooks/refs`.

R4 не меняет пользовательский scope XLSX V1. Компонент и так remount-ится по `key={xlsx:${spreadsheetRevision}}` при открытии новой книги, поэтому начальные `loading/error/message/dirty` уже задаются initial state и parent open-flow; лишние синхронные сбросы из effect удалены. Для render-safe доступности сохранения добавлен state `workbookReady`, который становится `true` только после успешного асинхронного разбора книги с хотя бы одним листом. Ref по-прежнему используется только внутри callback/effect, а не при render.

Validator R4 дополнительно фиксирует эти два React-инварианта статическими checks, чтобы такой lint-regression не вернулся. `main` после R3 остался на baseline `23663ffa95e859eafc7b2e126abe3573645e82bf`.

## Acceptance

Обязательно проверить после публикации:

- desktop: открыть обычный `.xlsx`, изменить несколько ячеек и сохранить локальную копию;
- открыть сохранённую копию снова и подтвердить изменения;
- workbook с несколькими листами: переключение между листами работает;
- формульная ячейка не редактируется;
- desktop Copy/Paste диапазона из Excel/Google Sheets работает для обычных клеток;
- smartphone: файл сначала открывается в обычной странице, а не fullscreen;
- smartphone: кнопка «Развернуть редактор» переводит таблицу в fullscreen;
- smartphone: «Завершить редактирование» возвращает обычную страницу с тем же workbook;
- горизонтальная прокрутка и touch-editing работают;
- Console не получает новых runtime/CSP ошибок;
- Network не содержит передачи содержимого XLSX на ARCTor API.

## Следующая точка

После production acceptance V1: CSV + структурные операции строк/столбцов + более полное сохранение форматирования/типов + UX больших workbook. Затем использовать тот же standalone-контейнер для Mind Map.
