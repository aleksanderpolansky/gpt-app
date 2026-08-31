# ARCTor Local XLSX Editor V1.3.2 R3 — изоляция range selection от редактирования

Дата: 2026-08-31
Baseline: 32db7367853638b438ff85cd1c69ee67f306a856
Release: ARCTOR_LOCAL_XLSX_EDITOR_V1_3_2_RANGE_EDIT_ISOLATION_R3

## Причина hotfix

Production Console показала цепочку ошибок Tabulator 6.5.2 внутри SelectRangeModule: r.getRow is not a function, No bounds defined on range, activeRange.occupies is not a function и затем сбой запуска cell editor. ARCTor читал getRanges()/getBounds().start прямо из rangeAdded/rangeChanged/rangeRemoved, когда Tabulator ещё не гарантировал готовые bounds. Дополнительно обычный frozen-столбец номеров строк использовался вместе с selectableRange, что сам Tabulator помечал как непредсказуемую конфигурацию.

## Решение

- Удалён внешний мост onRangeSelectionChange и подписки ARCTor на rangeAdded/rangeChanged/rangeRemoved.
- Координата активной ячейки XLSX определяется обычным cellClick.
- Range clipboard сохранён; bounds читаются только непосредственно во время copy/paste.
- Copy/paste защищены от незавершённых bounds.
- Служебный столбец номеров строк больше не frozen.
- Desktop сохраняет dblclick для редактирования; compact touch/mobile сохраняет click.
- Формулы, structural guards, Undo/Redo, локальное сохранение и privacy boundary не меняются.

## Исправление release runner R3

R1 и R2 выявили две ошибки управляющего сценария, а не функционального патча: повреждение первого porcelain-пути из-за trim()/slice и ненадёжное восстановление основной рабочей копии. R3 вообще не изменяет main до завершения всех проверок и создания проверенного commit в отдельном detached worktree. Текущий main может быть чистым baseline либо содержать только точный известный остаток R1/R2 в двух исходных файлах; такие файлы сравниваются с baseline и эталонным результатом patcher по нормализованному SHA256. Push выполняется только после повторной проверки origin/main и неизменности локального состояния. После подтверждённого push локальная main безопасно переводится на уже опубликованный commit.

## Границы

- SQL: 0
- migrations: 0
- document/server spreadsheet storage: 0
- содержимое XLSX не отправляется на сервер ARCTor

## Acceptance

1. Новая пустая XLSX: один клик по C5 выбирает C5.
2. Двойной клик по C5 открывает editor; ввод сохраняется.
3. Строки/столбцы сдвигают введённое значение относительно выбранной ячейки.
4. Undo/Redo восстанавливают значение и структуру.
5. Range copy/paste на desktop работает без ошибок Console.
6. В Console отсутствуют ошибки r.getRow / No bounds / activeRange.occupies и warning frozen columns + selectRange из XLSX-конфигурации.
7. На смартфоне один tap продолжает открывать expanded editor.

## Точка продолжения

После production acceptance V1.3.2 закрыть дефект range/edit и перейти к V1.4 форматирования XLSX.
