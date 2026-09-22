# ARCTOR — Direct System Typical Activity Creation V1

Date: 2026-09-22
Release: ARCTOR_SYSTEM_TYPICAL_ACTIVITY_DIRECT_CREATE_V1_20260922
Baseline: 20c3c7ee8af230e1de1f2e979949262876451532

## Purpose

Add a direct administrator creation path to the existing
`Системные типовые активности` catalog.

This stage intentionally does ONLY system typical activity creation.
Formula-source support and snapshot->source execution are separate later stages.

## User-visible change

On `/activity-templates?scope=system` the administrator now has:

`+ Добавить системную типовую активность`

The form contains:
- localized title;
- canonical English title;
- localized description;
- canonical English description;
- one or more active SYSTEM parameters;
- for every selected parameter, one or more active SYSTEM leaf Observation Objects
  to which that parameter is already assigned;
- one final publish action.

After successful publish the catalog refreshes and selects the newly created activity.

## Canonical persistence

No second profile engine is introduced.

Direct creation reuses:
- `materializeCuratorSystemTypicalActivityV1`;
- DB RPC `save_curator_system_typical_activity_v1`;
- canonical V2 profile authoring;
- `parameter_registry_v2`;
- existing SYSTEM parameter assignments.

Therefore direct creation and curator-from-signal creation converge on the same
`activity_templates` + `activity_template_impact_profiles_v1` model.

## Compatibility bridge

The existing canonical DB wrapper requires a UUID argument named
`p_source_signal_id`.

For DIRECT authoring the UI creates a UUID `requestId`. This UUID is passed as the
legacy journey key to the existing wrapper so that materialization stays atomic and
idempotent.

Important:
- no `raw_activity_signals` row is created;
- no `activity_events` row is created;
- no activity fact is created;
- no formula is created.

The server checks that the request UUID does not collide with an existing raw signal.

After materialization the template and active profile receive
`directSystemAuthoringV1` metadata with:
- `creationMode = direct_admin`;
- `requestId`;
- direct fingerprint;
- administrator/actor provenance;
- `rawSignalCreated = false`;
- `activityEventCreated = false`.

The legacy `curatorSystemMaterializationV1.sourceSignalId` field remains as a
compatibility journey key for the existing DB wrapper. It must not be interpreted as
evidence that a raw signal exists.

## UI mapping guard

The creation API exposes only:
- active SYSTEM parameter definitions;
- active SYSTEM parameter assignments;
- active GLOBAL / system_model / leaf Observation Objects.

The user therefore cannot select an arbitrary parameter-to-ON pair that the canonical
materializer would later reject.

## Protein pilot acceptance

Create manually:

RU:
`Употребление протеиновой добавки`

EN:
`Protein supplement intake`

Parameter:
`Mass`

Target leaf:
`Употребление протеиновой добавки`

Expected:
- SYSTEM typical activity appears in the shared catalog;
- active profile version = 1;
- routing contract = `parameter_registry_v2`;
- parameter count = 1;
- object count = 1;
- no raw activity is created.

## Next stage

After the protein activity is successfully published, implement Stage 2:
Formula Builder support for a formula whose output fact role is `source`.

Do not mix that change into this release.

## Actual execution evidence

- Product commit: `790a085f4f98cbb1a10dfba5809fc6d5cd896f89`
- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS
- DB migration: NOT REQUIRED
- Raw-signal write by installer: 0
- Activity-event write by installer: 0
- Formula write by installer: 0
