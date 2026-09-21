# ARCTOR - E03 fact details canonical assignment V1

Date: 2026-09-21
Release: ARCTOR_E03_FACT_DETAILS_CANONICAL_ASSIGNMENT_V1_1_20260921
Baseline: a2b7d54041168a8801072b78f16a0323371c3ced
Product commit: fb64fe946ced7a0d44763b4a988d7a626de485d5

## Root cause

The activity-facts detail page always rendered the legacy semantic tagging panel.
New E03 source facts therefore appeared with the compatibility legacy bridge even though their observation-object route had already been resolved by the active system profile.

## Fix

- The facts API recognizes durable E03 source facts from raw_activity_signals.basicIntakeAnalysisV1.sourceFactMaterializationV1.factIds.
- Canonical E03 facts receive read-only canonicalAssignment metadata.
- The detail UI renders a read-only system-profile assignment block for canonical E03 facts.
- The legacy semantic-review/manual-search/save workflow remains available only for legacy or unresolved facts.
- The tagging PUT endpoint rejects manual retagging of canonical E03 system-profile facts with HTTP 409.
- Canonical E03 source display now states user-reported / system-extracted instead of presenting AI extraction as the primary origin.
- Value-object titles on the facts page use the existing read-localization resolver for the requested locale.
- Approximation evidence and raw fragment are read from the durable Basic Intake analysis; the materialization flag confirms precision evidence was written to provenance.

## No schema migration

No SQL migration or new persistence table is introduced.
The compatibility effective-link view is left intact for old facts; only the new read model and write guard distinguish canonical E03 facts.

## Validation

- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS

## Acceptance

Open the existing Count=11 E03 fact with locale=ru.
Expected:
- no legacy bridge badge;
- no Additional semantic review / Manual search / Save final links controls;
- localized observation-object title;
- read-only canonical system-profile assignment;
- source shown as user reported / system extracted;
- precision shown as approximate with the original raw fragment;
- correction link goes back to the source activity.

Open an older unresolved fact.
Expected: legacy/manual semantic tagging remains available.
