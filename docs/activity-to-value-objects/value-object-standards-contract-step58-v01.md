# GPT-APP / AI-NAVIGATOR — Step 58 / 76: ValueObjectTargetStandard contract

Дата: 2026-06-18
Блок: `VALUE_OBJECT_STANDARDS_CONTRACT_STEP58`
Фаза генерального плана: 9 / 12
Микрошаг: 58 / 76

## Цель

Создать первый канонический контракт `ValueObjectTargetStandard`, чтобы аналитика могла сравнивать user-owned facts с целями, нормами, лимитами или reference thresholds конкретного Value Object.

## Созданный файл

- `src/types/value-object-standards.ts`

## Документируемый контракт

`ValueObjectTargetStandard` описывает не сам факт активности, а стандарт/цель для сравнения с фактами.

Минимальные поля:

- `standardId?: string`
- `valueObjectId: string`
- `metricType: ValueObjectStandardMetricType`
- `targetValue: number`
- `targetMin?: number`
- `targetMax?: number`
- `unit: ValueObjectStandardUnit`
- `period: ValueObjectStandardPeriod`
- `ruleType: ValueObjectStandardRuleType`
- `priority: ValueObjectStandardPriority`
- `source: ValueObjectStandardSource`
- `status: ValueObjectStandardStatus`
- `label?: string`
- `description?: string`
- `safetyNote?: string`

## Metric types

- `duration`
- `volume`
- `count`
- `distance`
- `energy`
- `money`
- `score`

## Units

- `minutes`
- `hours`
- `liters`
- `milliliters`
- `steps`
- `repetitions`
- `kilometers`
- `kcal`
- `PLN`
- `EUR`
- `points`
- `score`

## Periods

- `day`
- `week`
- `month`
- `quarter`
- `year`
- `rolling_7_days`
- `rolling_30_days`

## Rule types

- `desired_minimum`
- `desired_maximum`
- `desired_range`
- `exact_target`
- `frequency_minimum`

## Safety note

Standards are analytics targets and reference thresholds. They are not medical diagnosis, legal advice, or guaranteed productivity truth.

## Scope of Step 58B

This step includes:

- type contract only;
- label/display helpers;
- local validation helpers;
- documentation.

This step does not include:

- UI patch;
- API patch;
- persistence;
- database writes;
- SQL execution;
- OpenAI calls;
- fixtures;
- commit;
- push.

## Next expected step

Step 59 should add fixture standards for a small set of Value Objects, for example:

- sleep duration standard;
- water volume standard;
- walking distance or steps standard;
- work/focus duration standard.

Fixtures must remain separate from this Step 58 contract.
