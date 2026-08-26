# ARCTor.app — Hierarchy Filter Alignment Hotfix V1

Дата: 2026-08-26
Release: `ARCTOR_VALUE_OBJECT_HIERARCHY_FILTER_ALIGNMENT_HOTFIX_V1`

## Точка восстановления

Baseline перед hotfix:

`main @ c5b2210edc786aa12ee1d3c1489f756539de4d53`

Предыдущий релиз каскадного фильтра полностью прошёл ESLint, TypeScript, Next build, diff checks, commit/push и remote verify.

## Причина изменения

Production-проверка показала, что видимые подписи `Root object / Корневой объект` и аналогичные подписи над последующими каскадными select-полями визуально избыточны: назначение полей уже понятно из placeholder/выбранного значения.

Кроме того, видимая подпись делала select выше блока `Tree / Cards / Map` и нарушала вертикальное выравнивание toolbar.

## Решение

- видимые заголовки над всеми каскадными select-полями удалены;
- доступные имена сохранены через `aria-label` и `title`;
- select получил фиксированную высоту `h-11` (44 px), соответствующую общей высоте segmented control `Tree / Cards / Map`;
- desktop toolbar выравнивается по центру через `lg:items-center`;
- desktop-позиция фильтра справа от `Map` сохранена;
- mobile-позиция под `Tree / Cards / Map` сохранена;
- каскад, subtree filtering, reset и breadcrumb не меняются.

## Граница hotfix

Presentation-only. SQL, DB schema, DB writes, Storage writes и data contracts не изменяются.

## Следующая точка

После PASS проверить production на desktop и smartphone: отсутствие заголовков, одинаковую высоту control-ов и корректное появление второго/третьего select после выбора родителя.
