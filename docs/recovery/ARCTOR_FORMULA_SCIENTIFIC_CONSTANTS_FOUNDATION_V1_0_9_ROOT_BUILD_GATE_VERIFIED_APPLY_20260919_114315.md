# ARCTOR_FORMULA_SCIENTIFIC_CONSTANTS_FOUNDATION_V1_0_9_ROOT_BUILD_GATE_VERIFIED_APPLY

Дата: 2026-09-19T09:47:02.267Z

## Цель

Подготовить существующий Formula Builder к первой физически объяснимой
формуле лестничного пилота.

## Реализовано

- FormulaExpressionNodeV1.constantKey
- FormulaInputSelectorV1.label
- FormulaScientificConstantV1
- проверка научных констант на сервере
- scientificConstants сохраняются в metadata версии формулы
- неизвестные и неиспользуемые scientific constants запрещены
- literal value обязан совпадать с declared constant value
- scientific constants входят в configuration fingerprint
- unit algebra:
  kilogram × meter_per_second_squared → newton
  mass × acceleration → force
- Formula Builder получает отдельный JSON-редактор Scientific constants

## Safety

DB writes: 0
Formula rows created: 0
Facts written: 0
Formula Executor changed: NO
Analytics changed: NO
Agents changed: NO

## Validation

Environment: detached clean worktree at origin/main before main-worktree patch.

ROOT_BASELINE_ESLINT_TARGETS=PASS
ROOT_BASELINE_TYPECHECK=PASS
ROOT_BASELINE_BUILD=PASS
ROOT_BASELINE_DIFF_CHECK=PASS
CLEAN_WORKTREE_ESLINT_TARGETS=PASS
CLEAN_WORKTREE_TYPECHECK=PASS
CLEAN_WORKTREE_DIFF_CHECK=PASS
ROOT_GIT_APPLY_CHECK=PASS
ROOT_TESTED_DIFF_MATCH=PASS
ROOT_POSTPATCH_ESLINT_TARGETS=PASS
ROOT_POSTPATCH_TYPECHECK=PASS
ROOT_POSTPATCH_BUILD=PASS
ROOT_POSTPATCH_DIFF_CHECK=PASS

## Implementation commit

25d0d065d17ab86284ed2bc3f168af56ceb5e4a0

Baseline:

c2ab43861867dc5e8a44016a4e501be1a8c67dee

## Следующая точка

После Vercel READY создать первую реальную физическую формулу:

Actual body mass + Mass
× standard_gravity
× stair_ascent_knee_contact_factor
→ Mechanical load on the knee joint + Force

Аналитический блок пока не затрагивается.
