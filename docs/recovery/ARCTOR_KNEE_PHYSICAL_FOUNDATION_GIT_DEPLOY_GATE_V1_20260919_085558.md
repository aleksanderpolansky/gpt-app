# ARCTOR_KNEE_PHYSICAL_FOUNDATION_GIT_DEPLOY_GATE_V1

Дата: 2026-09-19 08:57:42 +02:00

## Закрываемый этап

Детерминированная foundation-часть лестничного пилота до Formula Builder.

Аналитика, рекомендации и агентный контур этим этапом не затрагиваются.

## Production evidence

Миграция Actual body mass / Mass / Force выполнена в production.

Финальный SQL result:

- result = PASS
- Anthropometric states = intermediate
- Body mass = intermediate
- Actual body mass = leaf
- expected system parameters = 2
- expected system assignments = 2

## Зафиксированная структура ON

States and Needs
→ States
→ Anthropometric states
→ Body mass
→ Actual body mass

Actual body mass является leaf.

Body mass и Anthropometric states являются intermediate.

## Параметры

Mass / Масса:

- generic parameter;
- dimension = mass;
- numeric;
- canonical unit = kilogram;
- allowed units = gram, kilogram;
- Mass → Actual body mass.

Force / Сила:

- generic parameter;
- dimension = force;
- numeric;
- canonical unit = newton;
- Force → Mechanical load on the knee joint.

Смысл actual/mechanical subject находится в leaf ON,
а не кодируется специализированным parameter_code.

## Knee ontology

Knee joint является intermediate.

Mechanical load on the knee joint является leaf.

Существуют смысловые связи:

One-storey stair ascent
→ influences
→ Mechanical load on the knee joint

Mechanical load on the knee joint
→ classified_as
→ Mechanical load

## Исключённая старая модель

Не создавать и не возвращать:

- mechanical_load_index;
- Score как основной физический результат;
- условную предметную модель 18/12/96 → 60 point.

Старый score-fixture может рассматриваться только как исторический
технический тест Formula Engine, но не как физическая модель.

## Source validation

ESLINT_TARGETS=PASS
TYPECHECK=PASS
BUILD=PASS

## Implementation commit

ac1491883c3085863457ea1b6eb2580760e28897

Commit message:

feat(arctor): establish knee physical load foundation

## Dirty files intentionally left untouched

?? docs/recovery/ARCTOR_RELATION_FAMILY_INVENTORY_V1_20260918_190909.md
?? docs/recovery/ARCTOR_STAIR_KNEE_SCIENTIFIC_MODEL_FOUNDATION_INTAKE_V1_20260919_075800.md
?? docs/recovery/ARCTOR_SYSTEM_ON_STRUCTURE_DB_INVENTORY_V2_20260918_180109.md
?? docs/recovery/ARCTOR_SYSTEM_ON_STRUCTURE_INTAKE_V1_20260918_172644.md

Они не включены автоматически в этот этап.

## Следующая точка

Следующий содержательный этап:

Formula Builder preparation.

Требуемый читаемый контракт первой физической формулы:

Actual body mass + Mass
× named gravitational coefficient
× named stair-ascent knee-contact coefficient
→ Mechanical load on the knee joint + Force

У коэффициентов должны быть:

- понятное название;
- числовое значение;
- источник;
- область применимости;
- версия.

На этом этапе не начинать:

- дневное/недельное агрегирование;
- аналитику;
- рекомендации нагрузка/отдых;
- заболевания;
- восстановление;
- E06-E14.