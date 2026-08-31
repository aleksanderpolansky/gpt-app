# ARCTor Local XLSX Editor V1.3.3 R4 — ручной мост редактирования ячеек

Дата: 2026-08-31
Baseline: 6b5a8191f4a325750dd09fe271d23b16beb99486
Release: ARCTOR_LOCAL_XLSX_EDITOR_V1_3_3_MANUAL_EXPANDED_EDIT_BRIDGE_R4

## Причина

После V1.3.2 ошибки SelectRange исчезли, но production Console оставил один сбой Tabulator Edit: Cannot read properties of undefined (reading 'add') внутри Edit.edit при попытке открыть редактор.

## Решение

- Специальные ARCTor expanded editors больше не запускаются через Tabulator Edit.edit.
- Desktop открывает их через cellDblClick, smartphone/compact touch — через cellClick.
- Значение записывается штатным CellComponent.setValue(), поэтому существующий cellEdited pipeline, история XLSX и сохранение сохраняются.
- Формульные ячейки остаются read-only через существующий editable predicate.
- SelectRange и range clipboard не отключаются.
- Обычные Tabulator editors, если они есть в других таблицах, не меняются.

## Границы

- SQL: 0
- migrations: 0
- document/server spreadsheet storage: 0
- XLSX остаётся локальным

## Acceptance

1. Пустая XLSX: C5 выбирается одним кликом.
2. Desktop: двойной клик C5 открывает expanded editor без Console error.
3. Ввод TEST + Enter записывает TEST в C5.
4. Вставка строки выше переносит TEST в C6; Undo возвращает C5.
5. Вставка столбца слева переносит TEST в D5; Undo возвращает C5.
6. Smartphone: один tap открывает expanded editor.
7. Range copy/paste остаётся работоспособным.
