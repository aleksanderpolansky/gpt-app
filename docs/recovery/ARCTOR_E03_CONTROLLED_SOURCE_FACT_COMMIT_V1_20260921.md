# ARCTOR - E03 controlled source-fact commit V1

Date: 2026-09-21
Release: ARCTOR_E03_CONTROLLED_SOURCE_FACT_COMMIT_V1_20260921
Baseline: 1212d6565434a4f4f981b5210e6416223b72f3ed
Product commit: 6c322c9bff071c8ba3a17cf4934c729d98198fa2

## Purpose

This is the controlled acceptance gate for E03 before automatic source-fact runtime is enabled.
The user sees the automatically matched typical activity and extracted measurements first.
If the match is wrong, the existing Wrong match action remains available before commit.
If the match is correct, Confirm and write source facts performs the first real E03 COMMIT.

## Runtime contract

- Requires exactly one high-confidence system typical-activity candidate.
- Requires a completed Basic Intake V1 analysis with no user rejection.
- Reads the active parameter_registry_v2 profile.
- Reads profile parameter definitions and profile target leaf objects.
- Resolves each extracted parameter only when exactly one active SYSTEM parameter assignment exists among the profile targets.
- Zero routes fail closed; more than one route fails closed for this first writer.
- Parameters not enabled by the profile are ignored rather than invented.
- Reuses attach_global_observation_facts_gsr1_v1 for transactional measure/fact/link creation and idempotency.
- Past activities are written as confirmed; future activities as proposed.
- User-explicit values keep user_explicit/user_reported provenance.
- Approximation evidence is preserved in activity_measure_provenance.source_snapshot_json.
- Idempotency key is one stable E03 key per activity event; changed payload for the same event fails closed instead of duplicating facts.

## Important boundary

Automatic E03 commit remains OFF in this release.
The confirmation button is intentional for the first production acceptance because wrong-match correction of already materialized source facts is not yet enabled.
After the controlled stair pilot passes on /activity-facts, automatic runtime can be enabled as the next gate.

## Validation

- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS

## Acceptance

Use the fresh stair activity that already shows Duration=18 min, Count approx 11 and typical activity Stair ascent.
Click Confirm and write source facts.
Expected: factsWritten=2 and the Facts page shows two source facts for the same event:
- Stair ascent / Duration / 18 minute
- One-storey stair ascent / Count / 11 count
The Count approximation must remain present in provenance.
Repeat the commit or reload and commit again: no duplicate facts may be created.
