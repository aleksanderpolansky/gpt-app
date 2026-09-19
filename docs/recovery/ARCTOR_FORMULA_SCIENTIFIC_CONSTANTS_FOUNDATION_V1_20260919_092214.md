# ARCTOR_FORMULA_SCIENTIFIC_CONSTANTS_FOUNDATION_V1

Дата: 2026-09-19 09:23:46 +02:00

## Цель

Подготовить Formula Builder к первой физически объяснимой
формуле лестничного пилота.

Никакая формула этим этапом не создаётся.

Production facts и Formula Executor не затрагиваются.

## Почему понадобилось изменение

Старый Formula Builder поддерживал literal number:

3.16

но не хранил:

- понятное имя коэффициента;
- размерность;
- единицу;
- научный источник;
- область применимости;
- версию.

Кроме того, unit algebra считал все numeric literal
безразмерными.

Поэтому:

mass × 9.80665 × 3.16

оставался dimension=mass и не мог корректно подтвердить
target dimension=force.

## Новый контракт

FormulaExpressionNodeV1 поддерживает:

constantKey

Пример:

{
  "op": "literal",
  "value": 9.80665,
  "constantKey": "standard_gravity"
}

Scientific constant хранится отдельно в metadata версии и содержит:

- key;
- kind;
- label;
- value;
- dimensionCode;
- unitCode;
- sourceTitle;
- sourceReference;
- sourceYear;
- applicability;
- version.

## Governance

Scientific constants входят в configuration fingerprint
только для версий, которые реально имеют этот блок.

Изменение значения или научного provenance после теста
делает evidence устаревшим и требует повторной проверки.

Старые formula versions без scientificConstants сохраняют
старую структуру fingerprint.

## Unit algebra

Добавлено контролируемое производное правило:

kilogram × meter_per_second_squared
→ newton

то есть:

mass × acceleration
→ force

Dimensionless study coefficient остаётся scalar.

## Formula UI

Добавлено:

- поле Scientific constants;
- display label у FormulaInputSelector;
- читаемое представление формулы.

Это позволяет показывать человеку не:

m × g × k

а, например:

Фактическая масса тела · Масса
× Стандартное ускорение свободного падения
× Коэффициент пиковой контактной силы при подъёме по лестнице

## Следующая формула

После deployment создаём draft:

source trigger:
One-storey stair ascent + Count

condition:
Count >= 1

snapshot input:
Actual body mass + Mass
latest in rolling_30_days

expression:
Actual body mass / Mass
× standard_gravity
× stair_ascent_knee_contact_factor

target:
Mechanical load on the knee joint + Force

result unit:
newton

missing input:
insufficient_data

## Planned constants

standard_gravity

- kind: physical_constant
- value: 9.80665
- dimension: acceleration
- unit: meter_per_second_squared
- source: NIST/BIPM SI reference

stair_ascent_knee_contact_factor

- kind: study_coefficient
- value: 3.16
- dimension: dimensionless
- unit: one
- source: Kutzner et al., Journal of Biomechanics, 2010
- reference: PMID 20537336; DOI 10.1016/j.jbiomech.2010.03.046
- applicability: approximate average peak resultant contact force during
  stair ascent from five subjects with instrumented knee implants;
  not a personalized clinical threshold.

## Scope lock

Не затрагиваются:

- аналитика;
- дневные/недельные агрегаты;
- рекомендации;
- заболевания;
- восстановление;
- агенты;
- Formula Executor;
- production facts.

## Validation

ESLINT_TARGETS=PASS
TYPECHECK=PASS
BUILD=PASS
DIFF_CHECK=PASS

## Implementation commit

182eed12eb96c2cd0b99dcd281b9b0e390445225