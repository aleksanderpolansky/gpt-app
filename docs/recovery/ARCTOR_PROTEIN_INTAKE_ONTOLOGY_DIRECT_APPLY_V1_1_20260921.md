# ARCTOR — Protein Intake Ontology Direct Apply V1.1

Date: 2026-09-21
Release: ARCTOR_PROTEIN_INTAKE_ONTOLOGY_DIRECT_APPLY_V1_1_20260921
Baseline: 5f05c0c9f4396a3d396ad604db8c25157f955cfe

## Recovery reason

The first direct-apply run stopped safely before creating any Observation Object.

Observed database error:

`value_objects_privacy_level_v3_check`

The failed materializer used:

`privacy_level = public_ontology`

That value belongs to `privacy_class_code`, not to the legacy/core `privacy_level`
column. The live database constraint allows only:

- private
- shared
- public

## Correction

This release changes only the conflicting field:

- `privacy_level = public`
- `privacy_class_code = public_ontology` remains unchanged

The ontology design, deterministic IDs, canonical keys, RU/EN definitions,
parent/root assignments, Mass assignments, and `same_subject_as` relation are unchanged.

## Previous run evidence

Previous product commit:
`5f05c0c9f4396a3d396ad604db8c25157f955cfe`

Previous gates:
- git diff --check: PASS
- node --check: PASS
- scoped ESLint: PASS
- production build: PASS
- DB apply: FAIL on the first ON insert
- DB verification: not run
- push: not attempted
- recovery commit: not created

Because the first INSERT failed on a CHECK constraint, the first ON row was not created.

## Expected successful materialization

- Observation Objects: 8
- Mass parameter assignments: 2
- same_subject_as relation: 1

Explicitly not created:
- activities
- activity facts
- typical activities
- formulas

The runner appends real execution evidence below after a successful apply.

## Actual execution evidence

- Previous product commit: `5f05c0c9f4396a3d396ad604db8c25157f955cfe`
- Corrective commit: `326d13433700498130e3d4effb5dfeb6b6a329ac`
- DB apply: PASS
- DB post-write verification: PASS
- Observation Objects: 8/8
- Mass assignments: 2/2
- same_subject_as relation: 1/1
- Activity events written: 0
- Activity facts written: 0
- Typical activities written: 0
- Formulas written: 0

### Node materialization

- material_objects_substances: created (`cdbcf20b-944a-5d96-b4dc-bd2b279710ea`)
- dietary_supplements: created (`bc553950-8ccf-576b-bff2-156955435f6c`)
- protein_supplement: created (`9776f0a8-b0c1-5caf-8844-9658f81b19cd`)
- consumption_states: created (`7495e90b-8b56-5a4c-9ccc-0ed0bda70e2e`)
- current_protein_serving: created (`2446f05a-bee3-5844-91ba-ab63afa9f5a3`)
- nutrition_consumption: created (`cdfc2985-d327-5ac2-ab60-dee697634162`)
- dietary_supplement_intake: created (`9a2f93bb-ba2b-5711-8906-972571654023`)
- protein_supplement_intake: created (`b6ae376a-89a9-5c7c-82b3-d72019e57dac`)

### Validation

- git diff --check: PASS
- node --check: PASS
- scoped ESLint: PASS
- production build: PASS

### Exact next point

Open the snapshot form and create Current protein supplement serving / Mass = 35 gram. Then verify it appears under States on the facts page. After that, create the typical activity and formula manually.
