# ARCTOR_FORMULA_SCIENTIFIC_CONSTANTS_FOUNDATION_V1_0_1_SOURCE_COMMIT_REPAIR

Дата: 2026-09-19 09:44:58 +02:00

## Причина repair

Предыдущий запуск ARCTOR_FORMULA_SCIENTIFIC_CONSTANTS_FOUNDATION_V1
выдал RESULT=PASS ошибочно.

Evidence:

head_before:
182eed12eb96c2cd0b99dcd281b9b0e390445225

reported implementation commit:
182eed12eb96c2cd0b99dcd281b9b0e390445225

То есть implementation commit не существовал.

Также SHA256 файлов AFTER совпадали с BEFORE-копиями.

В GitHub/Vercel был опубликован только recovery commit 5271c364...

## Исправление

В существующий Formula Builder реально добавлены:

- FormulaExpressionNodeV1.constantKey;
- FormulaScientificConstantV1;
- server validation научных констант;
- сохранение scientificConstants в metadata версии;
- проверка совпадения literal value и declared constant value;
- запрет неиспользуемых констант;
- unit algebra kilogram × meter_per_second_squared → newton;
- dimension mass × acceleration → force;
- scientific constants в configuration fingerprint;
- поле Scientific constants в Formula Builder UI.

## Source commit

5271c3644bab8129103a3b6ea2d25d21eba17ed6

Этот hash ОБЯЗАТЕЛЬНО отличается от baseline:

5271c3644bab8129103a3b6ea2d25d21eba17ed6

## Safety

DB writes: 0

Formula rows created: 0

Fact writes: 0

Formula Executor: unchanged

Analytics: unchanged

Agents: unchanged

## Validation

ESLINT_TARGETS=PASS
TYPECHECK=PASS
BUILD=PASS
DIFF_CHECK=PASS

## Следующая точка

После Vercel READY:

создать реальный Stair ascent formula draft:

trigger/source:
One-storey stair ascent + Count

snapshot:
Actual body mass + Mass

constants:
standard_gravity
stair_ascent_knee_contact_factor

target:
Mechanical load on the knee joint + Force

Результат:
newton

До этого formula row не создавать.