# ARCTor — T2_3_2 Standalone Table Workspace V1

Дата: 2026-08-28
Базовый commit: `6fd99c47044ab13b85c0d1f0a6456bf4b30bc650`

## Причина
После успешного T2_3_1 release production-проверка показала, что Ctrl+C диапазона внутри встроенной таблицы всё ещё не записывает данные в clipboard. Вместо дальнейшего усложнения обычной страницы принято решение выделить полноценное табличное рабочее пространство в отдельный route/new tab.

## Реализация
- `/value-objects` сохраняет встроенные Tree/Cards/Map/Table.
- Добавлена явная локализованная кнопка `Open table workspace ↗`, открывающая `/value-objects/table` в новой вкладке с `noopener noreferrer`.
- `/value-objects/table` является plain page без GlobalSidebar/GlobalTopBar/AI Navigator и использует ширину до 1920 px.
- Каталог на этом route стартует в Table + Edit mode.
- Существующие write contracts, read-only gates, Undo/Redo, mobile horizontal scroll, pinch zoom и paste compensation остаются прежними.

## Clipboard bug
T2_3_1 проверял `document.getSelection()` и прекращал range-copy при любом non-collapsed selection. Drag-range Tabulator может создавать DOM selection внутри самой таблицы. Теперь такое selection разрешает range copy, если anchor/focus находятся внутри table host и selection не принадлежит input/textarea/contenteditable/expanded editor. Выделение текста вне таблицы и внутри редактора не перехватывается.

## Safety
Нет SQL/schema migrations, DB/Storage/OpenAI writes из release-runner. Любые product writes продолжают идти через существующие API/contracts. Fail до commit откатывает worktree к exact baseline; push fail после commit оставляет clean local commit и resume hint.

## Проверки
Runner обязан выполнить short detached scratch preflight до mutation: предыдущие T2_3/T2_3_1 regression validators, новый workspace validator, changed-files ESLint, full project TypeScript и git diff --check. На main до commit проверки повторяются плюс full Next production build и full-ESLint no-regression.

## Будущее
Standalone workspace является фундаментом для T2_4 Add row/Create object, multi-cell operations, XLSX/CSV import/export и отдельного Guest/Local Spreadsheet mode без обязательной регистрации/cloud storage.


## Pre-mutation failures and hardening, 2026-08-29
- V1 остановился до mutation в собственном clipboard runtime fixture: runner сгенерировал `test.cjs` с реальными tab/newline внутри JS string literal. Исправлено через `String.raw`; production repo не менялся (`ROLLBACK=NOT_NEEDED_PREMUTATION`).
- V1_1 прошёл clipboard runtime test, но остановился до mutation на `PATCH_ANCHOR_MISSING:workspace-labels`. Причина: patcher искал LF-only многострочный anchor, тогда как Windows worktree может содержать CRLF при том же Git blob. Production repo снова не менялся (`ROLLBACK=NOT_NEEDED_PREMUTATION`).
- V1_2 делает multi-line anchors newline-agnostic (LF/CRLF), сохраняет исходный newline style заменяемого фрагмента и добавляет LF/CRLF self-tests.
- V1_2 также выполняет отдельный read-only worktree-bytes replay: реальные файлы текущего production checkout копируются во временный каталог, patcher и workspace-validator проходят на этих байтах до создания scratch-worktree и до mutation main.
- Baseline guards усилены: дополнительно фиксируются Git blob SHA `src/app/value-objects/page.tsx` и `src/components/app-shell/global-app-shell.tsx`.
