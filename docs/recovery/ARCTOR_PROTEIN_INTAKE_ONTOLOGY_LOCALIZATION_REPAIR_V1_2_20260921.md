# ARCTOR — Protein Intake Ontology Localization Repair V1.2

Date: 2026-09-21
Release: ARCTOR_PROTEIN_INTAKE_ONTOLOGY_LOCALIZATION_REPAIR_V1_2_20260921
Baseline: 1a6590be84446994825d8cae9f26b8601d607894

## What happened in V1.1

The live DB verification report proved that the ontology localization repair is correct:

- objectCount = 8
- massAssignmentCount = 2
- sameSubjectRelationCount = 1
- localizationReady = true
- Current protein supplement serving RU title =
  `Текущая порция протеиновой добавки`

V1.1 nevertheless stopped because the runner itself contained a typo in the
Base64-encoded expected Russian title. It decoded to:

`Текущая порция хротеиновой добавки`

instead of:

`Текущая порция протеиновой добавки`

This was a runner-verification defect only. No DB rollback is needed.

## V1.2 correction

- Correct the expected UTF-8/Base64 verification string.
- Re-run the existing materializer idempotently to collect fresh live DB evidence.
- Do not change ontology structure, IDs, assignments or relations.
- Create the missing recovery checkpoint.
- Push the already-existing product localization repair commit plus the new recovery commit.

## Expected state

- 8/8 protein pilot ONs
- 2/2 Mass assignments
- 1/1 same_subject_as relation
- all 8 RU/EN runtime localizations PASS
- Current protein supplement serving RU title:
  `Текущая порция протеиновой добавки`

## Next point

After PASS:
1. open `/activity-facts/snapshot?locale=ru`;
2. search `проте`;
3. select `Текущая порция протеиновой добавки · Масса`;
4. save `35 gram`;
5. verify it under `Факты → Состояния`.

## Actual execution evidence

- Existing product localization repair commit: `1a6590be84446994825d8cae9f26b8601d607894`
- node --check: PASS
- scoped ESLint: PASS
- production build: PASS
- live DB verification: PASS
- Observation Objects: 8/8
- Mass assignments: 2/2
- same_subject_as relation: 1/1
- localizationReady: True
- Current protein serving RU title: `Текущая порция протеиновой добавки`

### Idempotency evidence

- material_objects_substances: node=reused; localization=already_correct
- dietary_supplements: node=reused; localization=already_correct
- protein_supplement: node=reused; localization=already_correct
- consumption_states: node=reused; localization=already_correct
- current_protein_serving: node=reused; localization=already_correct
- nutrition_consumption: node=reused; localization=already_correct
- dietary_supplement_intake: node=reused; localization=already_correct
- protein_supplement_intake: node=reused; localization=already_correct
