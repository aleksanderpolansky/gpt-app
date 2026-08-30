# ARCTor Local XLSX Editor V1.1 — Mobile UX Hotfix

Дата: 2026-08-30
Baseline: `83a7602c7a53e732c6f4bbbe274e5d790734feb9`

## Исходное состояние

XLSX Editor V1 завершил production runner с `RESULT=PASS`, commit/push/remote verify на baseline выше. Desktop acceptance по основному сценарию подтверждён пользователем: книга открывается, редактируется и сохраняется локально без заметных недостатков.

На смартфоне обнаружены две UX-проблемы:

1. После выбора XLSX редактор появляется выше карточек Local Editors, но текущая позиция прокрутки остаётся возле карточки выбора файла. Пользователь видит в основном только малозаметную строку с именем выбранного файла и не сразу понимает, что рабочий редактор уже готов выше.
2. Touch-editor ячейки использует расширенное поле ввода поверх таблицы. При появлении виртуальной клавиатуры в некоторых Chromium/WebView/Messenger окружениях геометрия видимой области обновляется не сразу или разными API, поэтому поле может оказаться частично перекрытым клавиатурой.

## Решение V1.1

### 1. Мобильная автопрокрутка после выбора XLSX

После выбора XLSX ставится одноразовый mobile reveal request. После отрисовки редактора на компактном/touch viewport выполняются два `requestAnimationFrame`, затем контейнер XLSX редактора вызывается через `scrollIntoView({ behavior: "smooth", block: "start" })`.

Это выполняется только на смартфонном/грубом touch viewport. Desktop позиция страницы не меняется автоматически.

Цель: после выбора XLSX пользователь сразу видит заголовок редактора, кнопки «Развернуть редактор» / локального сохранения и саму таблицу, а не остаётся на карточке выбора файла ниже.

### 2. Поле редактирования непосредственно над виртуальной клавиатурой

Общий `ArctorTabulator` touch editor сохраняет существующий expanded-editor UX, но расчёт нижней границы видимой области становится keyboard-aware:

- используется `window.visualViewport`, когда он корректно сообщает уменьшенную область;
- дополнительно учитывается фактический `window.innerHeight` / `documentElement.clientHeight`;
- если браузер предоставляет `navigator.virtualKeyboard.boundingRect`, верх клавиатуры становится дополнительной жёсткой нижней границей редактора;
- подписка на `virtualKeyboard.geometrychange` обновляет позицию при изменении геометрии клавиатуры;
- после `focus()` выполняется серия коротких повторных позиционирований (`0/80/180/320/520 ms`), потому что Android WebView и встроенные браузеры могут менять viewport уже после события focus;
- все таймеры и listeners снимаются при закрытии editor overlay.

В mobile mode весь shell поля (поле + Cancel/Save) размещается непосредственно над клавиатурой и остаётся в видимой части экрана.

## Scope lock

Не меняется:

- XLSX сначала открывается внутри обычной страницы `/local-editors`;
- fullscreen включается только по требованию пользователя;
- «Завершить редактирование» возвращает к обычному виду с той же книгой в памяти;
- SheetJS остаётся `xlsx@0.20.3`;
- формульные ячейки V1 остаются read-only;
- serverUpload = false;
- serverStorage = false;
- browserPersistentStorage = false;
- contentAiCalls = false;
- SQL = 0;
- migrations = 0.

## Изменённые файлы

- `src/components/local-editors/local-editor-platform.tsx`
- `src/components/tables/arctor-tabulator.tsx`
- `docs/recovery/ARCTOR_LOCAL_XLSX_EDITOR_V1_1_MOBILE_UX_HOTFIX_RU_20260830.md`

## Риски и guardrails

`ArctorTabulator` является общим табличным слоем ARCTor, поэтому keyboard-aware placement применяется не только XLSX, но и другим таблицам, использующим `arctor-expanded-input` / `arctor-expanded-textarea`. Изменение ограничено только compact/touch placement; desktop positioning остаётся прежним.

Никакой серверной передачи содержимого XLSX, API route, storage или schema change не добавляется.

## Acceptance

После публикации:

1. Smartphone: находясь возле карточки «Электронная таблица», выбрать XLSX.
2. После выбора страница должна плавно прокрутиться к появившемуся XLSX-редактору, чтобы пользователь сразу видел, что файл открыт и готов к редактированию.
3. Desktop: выбор XLSX не должен самовольно менять позицию страницы.
4. Smartphone: выбрать редактируемую ячейку, дождаться виртуальной клавиатуры.
5. Поле ввода и кнопки Cancel/Save должны быть полностью видимы непосредственно над клавиатурой.
6. Проверить те же действия в обычном режиме и после «Развернуть редактор».
7. Проверить сохранение значения, отмену редактирования, горизонтальную прокрутку и локальное сохранение XLSX.
8. Проверить обычную таблицу ОН: expanded cell editor также остаётся рабочим и не уходит под клавиатуру.
9. Console/Network: нет новых ошибок и нет передачи содержимого XLSX на сервер.

## Следующая точка

После acceptance V1.1: структурные операции строк/столбцов + Undo/Redo, затем CSV и дальнейшая совместимость XLSX.

## R1 — validator CRLF false FAIL на Windows

Первый запуск V1.1 на Windows прошёл package self-test, baseline clean/fetch/build, dependency gate, создание scratch-worktree, применение продуктового патча и установку зависимостей. Затем repository validator остановил релиз на единственной проверке `tabulator_geometrychange_listener`. Остальные 37 из 38 проверок были PASS; `main` не изменялся, scratch-worktree был удалён.

Причина: продуктовый patcher корректно сохраняет исходный стиль переводов строк файла. В Windows checkout `arctor-tabulator.tsx` имеет CRLF, а repository validator искал многострочный фрагмент listener через строку с LF. Поэтому реально добавленный `virtualKeyboard.addEventListener("geometrychange", ...)` и cleanup listener не распознавались только из-за `\r\n` между строками. Self-test валидатора использовал LF fixture и не воспроизводил эту платформенную разницу.

## R2 — EOL-normalized repository validation

R2 не меняет продуктовый UX-патч V1.1. Validator теперь нормализует CRLF в LF только в памяти перед статическими проверками. Добавлен отдельный `VALIDATOR_CRLF_SELFTEST`, который после успешного patcher-fixture переводит platform/tabulator/spreadsheet/recovery в CRLF и повторно требует все 38 PASS. Это фиксирует именно ошибку R1 без ослабления проверки `geometrychange`: отрицательный тест по-прежнему обязан блокировать релиз, если listener действительно удалить/переименовать.

## R2 — staged diff false FAIL из-за пустой строки в конце recovery

R2 успешно прошёл package self-test, baseline build, dependency gate, scratch patch, repository validator 38/38, changed-files ESLint и TypeScript. Затем `git diff --cached --check` остановил релиз до production build изменённого проекта и до любых изменений `main`. Единственная причина: payload recovery-файла заканчивался двумя переводами строки, поэтому Git сообщил `new blank line at EOF`. Продуктовый код V1.1 при этом прошёл validator, ESLint и TypeScript; scratch-worktree после FAIL удалён.

## R3 — recovery EOF gate

R3 не меняет продуктовый UX-патч V1.1. Recovery payload теперь заканчивается ровно одним переводом строки. Validator дополнительно проверяет отсутствие пустой строки в конце recovery-файла, а self-test содержит отрицательный случай, который обязан блокировать повторное появление этой ошибки.
