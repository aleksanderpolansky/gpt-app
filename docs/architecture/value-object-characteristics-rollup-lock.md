# Value Object Characteristics / Relations / Measures / Rollup Lock

Project: GPT-APP / AI-NAVIGATOR
Status: architecture lock / no runtime execution / no SQL / no DB writes
Date: 2026-06-13
Scope: Value Object characteristics, activity event measures, relations, impact rules and analytics rollups.

## 1. Core decision

Value Object remains one universal observable and value-bearing entity.

The platform must not create many technical subtypes of Value Object such as exercise object, product object, service object, muscle object, goal object, family-duty object, health object, and so on.

Private and commercial are usage scopes / characteristics of the same universal Value Object, not separate entity architectures.

## 2. Why this lock exists

The system needs to describe physical objects, actions, exercises, skills, goals, body parts, muscles, products, services, certificates, family duties, health-related observations, learning activities and abstract categories.

It would be wrong to add hundreds or thousands of nullable columns directly to value_objects.

Do not model Value Object like this:

- value_objects.length
- value_objects.weight
- value_objects.duration
- value_objects.repetitions
- value_objects.price
- value_objects.body_part
- value_objects.muscle_group
- value_objects.material
- value_objects.color

Most Value Objects do not need most of those fields.

## 3. Canonical separation of layers

The platform must separate four semantic layers:

1. Value Object
2. Object characteristics
3. Activity event measures
4. Relations / impact rules / analytics rollups

## 4. Value Object

The Value Object is the stable observable or value-bearing entity.

Examples:

- Podem na noski / Подъём на носки
- Голень
- Икроножная мышца
- Изучение немецкого
- Массаж
- Сертификат на массаж
- Одноразовая тарелка
- Семейная обязанность

Value Object stores identity and governance fields, not all possible measurements.

Expected fields:

- id
- title
- description
- usage_scope
- created_by_actor_id
- organization_id
- status
- visibility
- source
- created_at
- updated_at

## 5. Object characteristics

Object characteristics describe relatively stable properties of the Value Object.

Example for exercise:

- Value Object: Подъём на носки
- observation_profile = exercise
- movement_pattern = ankle_plantar_flexion
- default_equipment = bodyweight
- primary_domain = physical_activity

Example for product:

- Value Object: Одноразовая тарелка
- product_material = paper
- diameter = 22 cm
- package_quantity = 50 pcs

A Value Object only has characteristics that make sense for this object.

If an object has no length, it simply has no length characteristic.

## 6. Activity event measures

Activity event measures describe a concrete performed or observed event.

Example:

- Activity Event: Подъём на носки
- duration = 2 min
- repetitions = 45
- body_weight_at_event = 95 kg
- external_load = 0 kg
- perceived_intensity = medium

Duration, repetitions and current body weight are not stable object characteristics of the exercise itself. They belong to the concrete event.

## 7. Relations and impact rules

Relations describe how one Value Object is connected to another Value Object.

Examples:

- Подъём на носки -> affects -> Икроножная мышца
- Подъём на носки -> affects -> Камбаловидная мышца
- Икроножная мышца -> part_of -> Голень
- Камбаловидная мышца -> part_of -> Голень
- Голень -> part_of -> Нога
- Нога -> part_of -> Тело

Relations may have metadata:

- relation_type
- weight
- confidence
- source
- status
- created_by_actor_id
- is_user_confirmed

## 8. Analytics rollups

Analytics rollups are derived aggregates.

One event is stored once, but analytics may attribute its effect to multiple connected objects.

Example:

- Event: Подъём на носки, 45 reps, 2 min, body weight 95 kg
- Direct impact: Икроножная мышца, Камбаловидная мышца
- Rollup: Голень, Нога, Тело, Физическое развитие

The system must not duplicate the original event for each parent object.

It should calculate rollups from relations and impact rules.

## 9. Required future entities

Target implementation should introduce these entities or equivalent modules:

- value_objects
- characteristic_definitions
- value_object_characteristics
- activity_event_measures
- value_object_relations
- impact_rules
- analytics_rollups

Implementation order must start with read-only fixtures and UI preview before SQL or DB write gates.

## 10. Candidate-first rule

AI extraction must create candidates first.

Example user input:

сделал подъём на носки 2 минуты, 45 повторений, мой вес 95 кг

Expected candidate package:

- candidate_value_object.title = Подъём на носки
- candidate_value_object.usage_scope = private
- candidate_value_object.observation_profile = exercise
- candidate_event_measure.duration = 2 min
- candidate_event_measure.repetitions = 45
- candidate_event_measure.body_weight_at_event = 95 kg
- candidate_relation: Подъём на носки -> affects -> Икроножная мышца
- candidate_relation: Подъём на носки -> affects -> Камбаловидная мышца
- candidate_relation: Икроножная мышца -> part_of -> Голень
- candidate_relation: Голень -> part_of -> Нога

The user or a gated backend process must confirm before persistence.

## 11. No hidden writes

Preview, local parser, candidate detection, relation suggestion, impact estimate and analytics preview must not write to DB unless an explicit write gate is opened.

## 12. SQL gate

No SQL migrations are allowed in the first implementation steps.

Before SQL, the project must have:

- architecture lock
- TypeScript draft contracts
- read-only fixtures
- UI preview
- no-write proof
- acceptance checklist
- explicit SQL gate approval

## 13. Naming decision

Recommended naming:

- characteristic = relatively stable object attribute
- measure = concrete event observation value
- relation = graph edge between Value Objects
- impact_rule = weighted influence rule
- rollup = derived parent-level analytics aggregate

Do not use characteristic for everything.

## 14. Acceptance criteria

This architecture is accepted only if:

- Value Object remains one universal entity.
- Private/commercial remains usage_scope/characteristic, not separate architecture.
- Object characteristics are optional and sparse.
- Event measures are separated from object characteristics.
- Relations are modeled separately from characteristics.
- Rollups are derived, not copied events.
- AI creates candidates first.
- Preview does not write to DB.
- SQL is not introduced before explicit gate.
- UI does not force every object to have the same fields.

## 15. Implementation sequence after this lock

1. Add TypeScript contracts.
2. Add read-only fixtures for exercise example.
3. Add no-write preview utilities.
4. Add UI preview section.
5. Add analytics rollup preview.
6. Add tests / static audit.
7. Only then prepare SQL proposal under a separate explicit gate.
