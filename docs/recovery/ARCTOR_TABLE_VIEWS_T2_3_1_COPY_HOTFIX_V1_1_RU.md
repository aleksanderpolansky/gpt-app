# ARCTOR_TABLE_VIEWS_T2_3_1_COPY_HOTFIX_V1_1 — recovery checkpoint

Дата: 2026-08-28

## 1. Исходная точка

Подтверждённый baseline:

`main @ 21da8ca46802559e2c8a6f114ee4b89db21c7d1b`

Commit baseline:

`table-views-t2-3-range-clipboard-v1`

T2_3 release прошёл validator 136/136, changed-files ESLint, full project TypeScript, full Next production build, git diff --check, commit/push/remote verify и clean worktree.

## 2. Production defect

Production runtime показал: desktop range визуально выделяется, но `Ctrl+C` не переносит выбранные значения в clipboard.

Диагностика Chrome Console при реальном `copy` event:

- `defaultPrevented: false`;
- `types: []`;
- `textLength: 0`.

То есть браузерный copy event возникает, но встроенная Tabulator clipboard-copy ветка не записывает выбранный range. Причина — clipboard keybinding Tabulator зависит от keyboard focus таблицы; multi-cell drag range не гарантировал нужный focus.


## 2A. Попытка V1 и причина остановки

Первый пакет `ARCTOR_TABLE_VIEWS_T2_3_1_COPY_HOTFIX_V1` остановился в detached scratch-worktree **до изменения main**.

Фактический отчёт V1:

- старый T2_3 regression validator: `136/136 PASS`;
- новый hotfix validator дошёл до `FAIL 034 legacy clipboardCopied subscription retained as fallback`;
- при этом patch V1 заменял саму legacy subscription новым document-level copy bridge, то есть validator одновременно требовал то, что patch намеренно удалял;
- это был противоречивый validator contract, а не ошибка production source;
- `ROLLBACK=NOT_NEEDED_PREMUTATION`;
- `RESULT=FAIL`;
- `main` остался на `21da8ca46802559e2c8a6f114ee4b89db21c7d1b`.

V1_1 устраняет противоречие без ослабления проверки: document-level capture остаётся **authoritative** для записи clipboard, а прежняя `clipboardCopied` fallback subscription сохраняется как безвредный feedback/fallback path.

## 3. Решение T2_3_1 V1_1

ARCTor больше не полагается на Tabulator keyboard-focus для multi-cell copy.

В desktop/fine-pointer Edit table mode:

1. `rangeAdded`, `rangeChanged`, `rangeRemoved` отслеживают наличие активного range;
2. ARCTor ставит document-level capture listener на `copy`;
3. если range активен и пользователь после выбора не кликнул вне таблицы, берётся последний `Range Component`;
4. `getStructuredCells()` даёт двумерную структуру Cell Components;
5. значения сериализуются в TSV с CRLF, экранированием табов, переводов строк и двойных кавычек;
6. TSV записывается через `event.clipboardData.setData("text/plain", ...)`;
7. только после успешной записи вызываются `preventDefault()` и `stopPropagation()`;
8. UI получает существующий `onRangeCopied` callback и показывает feedback.
9. Прежняя Tabulator `clipboardCopied` subscription остаётся fallback subscription / feedback path, но фактические clipboard bytes определяет document-level capture listener.

`selectableRangeInitializeDefault:false` исключает скрытое первоначальное выделение при загрузке таблицы.

## 4. Safety / UX boundaries

- Обычное copy внутри input/textarea/expanded editor не перехватывается.
- Наличие обычного DOM text selection имеет приоритет над range clipboard и не перехватывается.
- Pointer click вне таблицы разоружает range-copy, чтобы ARCTor не забирал последующий Ctrl+C у другого элемента страницы.
- Read-only cells можно копировать; запрет касается только записи.
- Paste architecture T2_3 не меняется: только title/description через существующие safe PATCH contracts, prevalidation, cap 100, best-effort compensation rollback.
- Smartphone multi-cell drag-range остаётся выключен, поэтому horizontal swipe, pinch zoom и single-tap editing не затрагиваются.
- Global/system/unsupported write restrictions не меняются.
- Parent/Role/counters/Status/create/delete не расширяются.

## 5. Release boundaries

Release runner не выполняет SQL/schema/DB/Storage/OpenAI writes:

- `DB_WRITES=0`;
- `STORAGE_WRITES=0`;
- `OPENAI_CALLS=0`;
- `SQL_EXECUTED=0`;
- `SCHEMA_MIGRATIONS=0`.

Перед mutation main используется short detached scratch worktree `_arctor_t231_preflight` с exact baseline, linked production node_modules, старым T2_3 validator, новым hotfix validator, changed-files ESLint, full project TypeScript и git diff --check.

После mutation main все критические gates повторяются, добавляется full Next production build и full ESLint no-regression до commit.

## 6. Следующая точка

После PASS release production postcheck:

- выделить 2x2 или больший range;
- `Ctrl+C`;
- вставить в Excel / Google Sheets / Блокнот;
- убедиться, что строки/колонки и multiline values сохранены;
- обычное выделение текста вне таблицы продолжает копироваться обычно;
- `Ctrl+V`, Undo/Redo и smartphone gestures остаются без регрессии.

После runtime PASS T2_3_1 закрыть T2_3 и перейти к T2_4 creation from table.

Guest/Local Documents / Spreadsheets / Mind Maps направление сохраняется без изменений.
