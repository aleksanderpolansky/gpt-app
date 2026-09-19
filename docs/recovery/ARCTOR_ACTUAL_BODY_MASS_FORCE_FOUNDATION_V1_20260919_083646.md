# ARCTOR_ACTUAL_BODY_MASS_FORCE_FOUNDATION_V1

Дата: 2026-09-19 08:39:22 +02:00

## Область этапа

Продолжается только детерминированный лестничный пилот.

Аналитика, рекомендации, E06-E14 и другие будущие блоки
этим этапом не затрагиваются.

## Последняя семантическая поправка

Общий Body mass не используется как конечный лист фактического состояния.

Подготовлена структура:

States and Needs
→ States
→ Anthropometric states
→ Body mass
→ Actual body mass

Actual body mass является leaf.

Body mass является intermediate.

Это позволяет позднее, только при реальной необходимости, добавить
Desired body mass, Critical body mass и другие семантически отдельные
листья без изменения смысла уже сохранённых фактов.

## Параметры

Используется текущая production-архитектура открытого каталога параметров.

### Mass

Generic parameter.

- code: mass
- dimension: mass
- numeric
- kilogram
- allowed: gram, kilogram
- aggregation: latest
- default window: event
- negative: false

Assignment:

Mass
→ Actual body mass

### Force

Generic parameter.

- code: force
- dimension: force
- numeric
- newton
- allowed: newton
- aggregation: none
- default window: event
- negative: false

Assignment:

Force
→ Mechanical load on the knee joint

## Почему потребовалось изменение source contract

Текущий catalog/API уже поддерживает открытую систему параметров,
но размерности force в нём ещё не было.

Поэтому добавлены только недостающие элементы существующего механизма:

- UI dimension force;
- localized dimension label;
- generic Mass/Force presentation;
- newton unit presentation;
- API acceptance of force;
- DB dimension CHECK support for force.

Второй реестр параметров не создаётся.

## Полный контракт новых ОН

Migration создаёт каждый новый intermediate/leaf с тем же набором
системных полей, который материализует текущий ручной Curator flow:

- stable deterministic ID;
- server-compatible canonical key;
- parent;
- root;
- hierarchy relation;
- STATE facet compatibility;
- generic_state object kind compatibility;
- ontology role;
- global/system_model scope;
- visibility/privacy;
- definition_version;
- identity_attributes_json;
- RU/EN localizations;
- localization envelope;
- curator provenance;
- creation comment;
- audit evidence;
- definition snapshot/version.

## Не создаётся

- mechanical_load_index;
- Score;
- formula rule;
- facts;
- semantic relations;
- Formula Executor;
- analytics.

## Проверки локального кода

ESLINT_PARAMETER_FOUNDATION=PASS
TYPECHECK=PASS
BUILD=PASS

## Migration

supabase\migrations\20260919083646_actual_body_mass_force_foundation_v1.sql

Migration создана, но production DB ещё НЕ изменена.

## Точка продолжения

1. Выполнить подготовленную migration в Supabase SQL Editor.
2. Ожидаемый финальный SELECT:
   result = PASS
   anthropometric_states_role = intermediate
   body_mass_role = intermediate
   actual_body_mass_role = leaf
   expected_parameters = 2
   expected_assignments = 2
3. После PASS проверить UI каталога параметров и дерево ОН.
4. Затем перейти только к Formula Builder preparation:
   Actual body mass + Mass
   × scientific named constants
   → Mechanical load on the knee joint + Force.

Аналитический слой пока не начинать.