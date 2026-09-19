# ARCTOR_KNEE_MECHANICAL_LOAD_ONTOLOGY_V1_0_2_LOCAL_REPAIR

Дата: 2026-09-18 19:47:40 +02:00

## Причина

Локальный migration оставался версией V1.0.1.

Его SHA256:

30c7ae677b6ccf6d55d2d788da91e41d66e5861b8e2dd97340c232b2c921dd22

V1.0.1 содержал защиту:

ARCTOR_KNEE_LOAD_RELATION_FAMILY_NOT_UNAMBIGUOUS

После production inventory было установлено, что relation registry
намеренно содержит две семьи:

- structural_crosslink
- analytics

Поэтому проверка "все типы должны иметь одну семью" была неправильной.

## Исправление

classified_as закреплён за:

- relation_family_code = structural_crosslink
- directionality_code = directed
- canonical_relation_type_code = classified_as
- canonical_orientation_code = same
- contract_version = 2
- canonical_write_policy_code = enabled
- ai_write_policy_code = proposal_only
- evidence_policy_code = optional
- world_evaluation_policy_code = contextual_only
- source role = leaf
- target role = leaf

## Результат

Final SQL SHA256:

0330e7ba6dbbc5788a086e96e96df1332d7d81c86bf0bee97675aa6866652ab5

Expected:

0330e7ba6dbbc5788a086e96e96df1332d7d81c86bf0bee97675aa6866652ab5

SQL скопирован в буфер только после совпадения SHA256.

## DB

Этим PowerShell БД НЕ изменялась.

## Следующее действие

Открыть НОВУЮ вкладку Supabase SQL Editor.

Ctrl+V.

Run один раз.

При ошибке повторно не запускать.

## Status

PASS / V1.0.2 READY FOR SQL EDITOR
