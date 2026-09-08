# ARCTOR_UI_CREATE_ACTION_GRID_HOTFIX_V1

Дата: 2026-09-08
Статус: code release + recovery checkpoint

## Контекст

Live-проверка после contextual-action alignment V1 выявила два оставшихся несоответствия.

1. На /value-objects зелёная кнопка «Добавить ОН» ведёт на /value-objects/new. Этот маршрут открывает старый selector «частный / коммерческий ценный объект». Для каталога объектов наблюдения коммерческий маршрут не нужен.
2. На /certificates зелёная кнопка «Добавить суперпредложение» уже перенесена наверх, но находится в одной горизонтальной строке с ArctorSegmentedSwitch. На странице ОН action-row и scope-row разделены переносом строки; этот grid pattern принят как общий.

## Решение

1. На /value-objects остаётся одна зелёная contextual-action «Добавить ОН».
2. Эта кнопка ведёт напрямую на /value-objects/new/root — ordinary observation-object creation flow.
3. Отдельная белая кнопка «Создать корневой объект наблюдения» удаляется из верхней action-row, чтобы не было двух CTA одного назначения.
4. На /certificates первая строка содержит только «Добавить суперпредложение» справа.
5. Следующей отдельной строкой слева расположен ArctorSegmentedSwitch «Мои сертификаты / Все сертификаты».
6. Вертикальная структура совпадает с /value-objects: contextual create action row → scope/navigation row → heading/data.
7. docs/ui/ARCTOR_UI_DESIGN_STANDARD_V1_RU_20260907.md дополняется правилом разделения action-row и scope-row.
8. API, БД, RLS, SQL, OpenAI runtime и семантическая модель не меняются.

## Проверки релиза

Runner требует точный baseline и blob SHA изменяемых файлов, clean worktree, dry-run transform на копиях реальных файлов, TypeScript до/после, exact per-file ESLint baseline/no-regression, full-project ESLint no-regression, git diff --check, production build, отдельные code/recovery commits, push, remote verification и финальный clean worktree.

## Точка продолжения

После deployment проверить desktop:

- /value-objects?locale=ru: одна зелёная кнопка «Добавить ОН», переход напрямую на /value-objects/new/root; selector «Частный / Коммерческий ценный объект» при этом не открывается;
- /certificates?scope=all&locale=ru: первая строка — «Добавить суперпредложение» справа, вторая строка — scope switch слева.

## Фактический code commit

Code commit: `fdbbc969358c17bbe876b13baef85b9e45d46f9c`.
