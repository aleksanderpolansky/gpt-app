# ARCTor AI-A3-P5B — взаимные связи Activity ↔ Facts ↔ leaf Value Objects

Дата: 2026-08-13

## Цель

После материализации P5A пользователь должен видеть одну и ту же реальность с трёх сторон:

- активность показывает связанные листовые ЦО и нейтральные факты/измерения;
- факт показывает исходную активность и все листовые ЦО, использующие то же measure;
- листовой ЦО показывает историю связанных активностей и фактов;
- календарь для activity_event показывает те же связанные leaf ЦО и факты, если activity_event участвует в календарном представлении.

## Нейтральный факт

`31 minute` не является «фактом ходьбы». Это одно нейтральное measure. Несколько `activity_object_facts` могут ссылаться на один `measure_id` и проецировать его на разные листовые ЦО. UI группирует такие проекции в одну строку факта и перечисляет связанные leaf ЦО.

## Название активности

Название activity_event сохраняет пользовательскую формулировку. Семантическая классификация не добавляется к title автоматически. Например:

- пользователь: `сегодня гулял 31 минуту`;
- title: `сегодня гулял 31 минуту`;
- linked leaf: `Ходьба`.

## Границы P5B

P5B является read/display слоем. Он не создаёт новых фактов, не меняет Data Capital и не вызывает OpenAI. Канонические записи остаются в существующих таблицах `activity_event_measures`, `activity_object_facts`, `activity_value_object_links`, `activity_events`, `value_objects`.

## P5A production acceptance

P5A подтверждён live postcheck 12/12: одна activity, один neutral measure=31 minute, confirmed Walking projection на тот же measure_id, semantic_exposure, writer ledger и ownership согласованы. Hotfix writer V3 принят 8/8 и должен быть отражён в source/recovery.
