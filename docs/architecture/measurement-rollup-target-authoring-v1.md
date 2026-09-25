# ARCTor Measurement Rollup Target Authoring V1

Status: source implementation for manual rollup-target authoring
Date: 2026-09-25

## 1. Scope

This layer solves one narrow problem:

Users may report the same measurement at different levels of detail.

Example:

- only Night sleep duration;
- or only Light + Deep + REM durations;
- or both the total and all detailed stages.

The rollup contour reconciles those representations before analytics.

It is not a general analytics framework.

## 2. Core rule

Parameters remain universal.

Example:

`duration`

Semantic meaning comes from Observation Objects.

The rollup setting is stored only on the leaf that is the total:

`Night sleep duration + duration -> rollup_target`

Source leaves are not marked as component.

An ordinary leaf requires no stored rollup role.

Absence of `measurementRollupV1` means that the leaf behaves normally.

## 3. Stored metadata

The target leaf stores one metadata object under:

`metadata_json.measurementRollupV1`

V1 fields include:

- parameter definition id;
- universal parameter code;
- canonical unit;
- operator = SUM;
- source sibling leaf ids;
- all sources required;
- direct value preferred;
- missing values remain UNKNOWN;
- discrepancy is flagged;
- absolute tolerance;
- curator/admin provenance.

No schema migration is needed for V1.

## 4. Authoring restrictions

Only an active global system leaf can be a rollup target.

Only active sibling leaf Observation Objects under the same parent and root
can be selected as source leaves.

Only an active numeric system parameter can be selected.

At least two source leaves are required.

V1 intentionally fixes the calculation policies instead of exposing every
analytics option in the UI.

## 5. UI

The system leaf card shows an admin-only block:

`Detail rollup / Агрегация детализации`

The curator can:

- enable rollup_target;
- choose one universal parameter;
- choose detailed sibling leaf sources;
- set discrepancy tolerance;
- save;
- remove the rule and return the leaf to ordinary behavior.

There is no component selector and no independent selector.

## 6. Relation to existing generic resolver

The stored metadata can be converted to
`MeasurementRollupDefinitionV1`.

The existing resolver therefore remains the single runtime rule engine for:

- direct total only;
- detailed sources only;
- direct + detailed verification;
- missing-source UNKNOWN behavior;
- double-count protection;
- event/bundle isolation.

## 7. Deliberate boundary of this patch

This patch provides manual authoring and persistent storage of the rollup-target
configuration.

It does not yet make analytics consume the stored rule.

That next runtime step should:

1. read `measurementRollupV1` for a requested target leaf;
2. adapt it to `MeasurementRollupDefinitionV1`;
3. group facts by activity event / measurement bundle;
4. resolve effective values;
5. feed those effective values into analytics reports.

This separation keeps authoring/storage independently testable before changing
user-facing analytical calculations.
