# ARCTOR_UI_CONTEXTUAL_CREATE_ACTION_ALIGNMENT_V1

Дата: 2026-09-08
Статус: code release + recovery checkpoint

## Контекст

После успешной нормализации UI V1.0.3 live-проверка показала два смысловых несоответствия действий:

1. на странице каталога объектов наблюдения зелёная contextual-action кнопка ошибочно называлась «Добавить суперпредложение» и вела в коммерческий маршрут /offers/new;
2. на странице сертификатов «Добавить суперпредложение» находилось под заголовком, тогда как утверждённый паттерн каталога размещает contextual create action в верхней строке действий справа.

## Решение

1. На /value-objects зелёное действие становится «Добавить ОН» (с локализованными полными вариантами на других языках) и ведёт на существующий универсальный маршрут /value-objects/new.
2. Прямое вторичное действие «Создать корневой объект наблюдения» остаётся без изменения и ведёт на /value-objects/new/root.
3. На странице сертификатов «Добавить суперпредложение» переносится в верхнюю строку справа от ArctorSegmentedSwitch; прежняя копия под заголовком удаляется.
4. Визуальный стиль зелёного contextual-action не меняется: используется уже зафиксированный positive pattern ARCTor.
5. В docs/ui/ARCTOR_UI_DESIGN_STANDARD_V1_RU_20260907.md фиксируется правило: действие создания основной сущности раздела располагается в верхней action-row справа, а его подпись и маршрут обязаны соответствовать сущности текущего раздела.
6. API, БД, RLS, SQL, OpenAI runtime и семантическая модель не меняются.

## Проверки релиза

Runner требует точный baseline и blob SHA изменяемых файлов, clean worktree, TypeScript до/после, exact per-file ESLint baseline/no-regression, full-project ESLint no-regression, git diff --check, production build, отдельные code/recovery commits, push, remote verification и финальный clean worktree.

## Точка продолжения

После deployment проверить desktop:

- /value-objects?locale=ru: зелёная кнопка «Добавить ОН», переход на /value-objects/new; белая кнопка создания корня остаётся рядом;
- /certificates?scope=all&locale=ru: «Добавить суперпредложение» находится в верхней строке справа, под заголовком второй копии нет.

## Фактический code commit

Code commit: `97aaed4273c842adf85d124cb486a7d016187812`.
