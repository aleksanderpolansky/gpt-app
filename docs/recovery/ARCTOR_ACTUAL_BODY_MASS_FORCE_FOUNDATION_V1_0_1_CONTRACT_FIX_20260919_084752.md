# ARCTOR_ACTUAL_BODY_MASS_FORCE_FOUNDATION_V1_0_1_CONTRACT_FIX

Дата: 2026-09-19 08:49:26 +02:00

## Причина корректировки

V1 package успешно прошёл compile/build, но перед production APPLY
проведена дополнительная сверка с текущим ручным Curator contract.

Обнаружено:

- force отсутствовал в реальном DIMENSION_CODES административного API;
- requestHash Body mass не совпадал с алгоритмом createSystemObject;
- localizedContent.sourceRevision ошибочно был равен requestHash;
- pending metadata должен начинаться с того же runtime marker,
  который пишет ручной object-bootstrap.

Production DB к этому моменту не изменялась.

## Исправлено

API принимает dimension=force.

Для трёх новых ON детерминированно проверены:

- canonical_key;
- stable UUID;
- parent;
- root;
- role;
- generic_state / STATE;
- requestHash;
- localizedContent.sourceRevision;
- pending localization contract.

## ON path

States and Needs
→ States
→ Anthropometric states
→ Body mass
→ Actual body mass

## Parameters

Mass
→ Actual body mass

Force
→ Mechanical load on the knee joint

## Scope lock

Не затрагиваются:

- analytics;
- recommendations;
- daily/weekly aggregation;
- agents;
- Formula Executor;
- facts;
- formulas.

## Validation

ESLINT_PARAMETER_FOUNDATION=PASS
TYPECHECK=PASS
BUILD=PASS

## Migration

supabase\migrations\20260919083646_actual_body_mass_force_foundation_v1.sql

SHA256=6165f8401cc4d17eb62687757720ba934bc9803938f4adb826fea2d7189754fb

## Следующая точка

Только после RESULT=PASS этого corrective package:

1. открыть новую вкладку Supabase SQL Editor;
2. вставить migration из буфера;
3. Run;
4. ожидать финальную строку:

PASS
intermediate
intermediate
leaf
2
2

5. после production PASS проверить дерево ON и каталог параметров;
6. затем перейти к подготовке Formula Builder.

Аналитический блок не начинать.