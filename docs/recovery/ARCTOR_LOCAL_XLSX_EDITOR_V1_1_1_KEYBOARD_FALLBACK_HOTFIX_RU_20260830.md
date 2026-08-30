# ARCTor Local XLSX Editor V1.1.1 — Keyboard fallback hotfix

Дата: 2026-08-30
Baseline: `f2035df203c587a3eded2348ed0def3e80b42b96`

## Исходное состояние

XLSX V1.1 завершил production runner с `RESULT=PASS`, commit/push/remote verify на baseline выше. Мобильная автопрокрутка после открытия XLSX подтверждена пользователем как исправленная.

Осталась одна UX-проблема во встроенном браузере Messenger на Android: expanded editor ячейки всё ещё может оказаться под виртуальной клавиатурой. Скриншоты показывают, что после открытия клавиатуры сама таблица остаётся видимой, а фиксированный shell поля ввода исчезает под клавиатурой. Это означает, что в данном WebView ни `visualViewport`, ни `window.innerHeight`, ни `navigator.virtualKeyboard.boundingRect` не гарантируют фактическую границу клавиатуры.

## Решение V1.1.1

Сохраняется существующий приоритет точной геометрии:

1. `navigator.virtualKeyboard.boundingRect`, если браузер его реально заполняет;
2. уменьшение `window.visualViewport.height`;
3. уменьшение layout viewport (`window.innerHeight` / `documentElement.clientHeight`).

Добавляется только fallback для компактного touch-окружения. После focus через короткую задержку 140 ms, если ни один из трёх источников не сообщил заметное уменьшение доступной области, редактор считается работающим в keyboard-overlay WebView. Тогда нижняя безопасная граница принудительно ограничивается долей исходного viewport:

- portrait: 52% высоты;
- landscape: 42% высоты.

Поле + Cancel/Save размещаются выше этой границы. Это намеренно консервативная зона: лучше поднять editor немного выше клавиатуры, чем позволить ему снова оказаться под ней.

Если браузер всё-таки сообщает реальную геометрию клавиатуры, fallback не применяется и сохраняется точное позиционирование непосредственно над клавиатурой.

## Scope lock

Не меняется:

- мобильная автопрокрутка XLSX после выбора файла;
- обычный режим при открытии XLSX;
- fullscreen только по кнопке пользователя;
- возврат из fullscreen к той же книге в памяти;
- локальное сохранение XLSX;
- формульные ячейки V1 read-only;
- `xlsx@0.20.3`;
- serverUpload = false;
- serverStorage = false;
- browserPersistentStorage = false;
- contentAiCalls = false;
- SQL = 0;
- migrations = 0.

## Изменённые файлы

- `src/components/tables/arctor-tabulator.tsx`
- `docs/recovery/ARCTOR_LOCAL_XLSX_EDITOR_V1_1_1_KEYBOARD_FALLBACK_HOTFIX_RU_20260830.md`

## Acceptance

1. На смартфоне открыть XLSX — автопрокрутка V1.1 должна сохраниться.
2. Нажать редактируемую ячейку во встроенном браузере Messenger.
3. После появления клавиатуры поле ввода и Cancel/Save должны быть полностью видимы над клавиатурой.
4. Повторить для нескольких строк, в обычном и fullscreen режиме.
5. Закрыть клавиатуру, сохранить/отменить значение и проверить отсутствие регрессии таблицы.
6. На desktop expanded editor должен остаться без изменений.
7. Console/Network: без новых ошибок и без передачи содержимого XLSX на сервер.

## Следующая точка

После acceptance закрыть мобильный UX XLSX V1.1 и перейти к структурным операциям строк/столбцов + Undo/Redo.
