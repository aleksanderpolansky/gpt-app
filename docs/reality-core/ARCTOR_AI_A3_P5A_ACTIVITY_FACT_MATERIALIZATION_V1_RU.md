# ARCTor.app — AI-A3-P5A: материализация явных фактов при direct save

## Цель
После успешного полного Global Reality анализа и создания `activity_event` явные факты из выбранного GLOBAL leaf должны быть сохранены через уже существующий канонический writer `attach_global_observation_facts_gsr1_v1`.

Одна операция writer создаёт/связывает:

`activity_event -> activity_event_measures -> activity_object_facts -> value_object_id`

и одновременно:

`activity_event -> activity_value_object_links(link_type=semantic_exposure) -> тот же GLOBAL leaf`.

## Границы P5A
- записываются только явные факты, прошедшие серверный Global Reality parameter contract;
- rawFragment повторно проверяется против сохранённого `activity_events.input_text`;
- target повторно проверяется как active GLOBAL leaf;
- `confirmed` feedback делает факт `confirmed` + `is_user_confirmed=true`;
- `rejected` feedback исключает факт из записи;
- без пользовательского verdict факт сохраняется как `proposed`, а не молча подтверждается;
- `commented` не означает подтверждение;
- semantic projections P3 в P5A не материализуются;
- manual leaf links продолжают материализоваться отдельным P2 writer;
- writer вызывается только сервером service-role через существующий SECURITY DEFINER RPC;
- idempotency writer сохраняется, поэтому retry после частично завершённого direct-save не создаёт второй bundle.

## Следующий шаг P5B
Взаимное чтение связей в UI:
- Facts: факт -> activity + leaf;
- Value Object detail: leaf -> история фактов + активностей;
- Activity journal/calendar: activity -> связанные leaf + факты.
