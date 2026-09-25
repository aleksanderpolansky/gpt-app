# ARCTor Measurement Rollup Contract V1

Status: source-contract foundation / no DB writes / no automatic fact materialization
Date: 2026-09-24

## 1. Decision

ARCTor keeps parameters universal.

Examples:

- `duration`
- `count`
- `mass`
- `distance`

Semantic specificity belongs to Observation Objects (ON), not to thousands of semantic parameter variants.

Therefore ARCTor must support mappings such as:

- `duration -> Night sleep duration`
- `duration -> Light sleep duration`
- `duration -> Deep sleep duration`
- `duration -> REM sleep duration`

without creating separate parameter definitions for each semantic context.

## 2. Rollup target is not a new ontology node type

An ON remains `root`, `intermediate`, or `leaf`.

`rollup_target` is an analytics role in a separate rollup contract.

This prevents ontology structure from being polluted by calculation mechanics.

## 3. Why this is required

Users can report the same phenomenon at different levels of detail.

Example A:

- Night sleep duration = 496 min
- stage detail unknown

Example B:

- Light = 351 min
- Deep = 30 min
- REM = 115 min
- total not reported

Example C:

- total = 496 min
- Light = 351 min
- Deep = 30 min
- REM = 115 min

All three inputs describe compatible levels of the same measurement family.

ARCTor must not treat missing detail as zero and must not double-count direct total plus components.

## 4. V1 resolution rules

For one activity event and one measurement bundle:

1. If a direct target value exists, use it as the effective value.
2. If there is no direct target and every required component exists, derive target with `SUM`.
3. If direct target and every component exist, compare direct and derived values.
4. If difference is within the configured tolerance, mark `direct_verified`.
5. If difference is larger, mark `discrepancy`; preserve the direct value and the derived value separately.
6. If some required components are missing and there is no direct value, result is `insufficient_data`.
7. Missing means UNKNOWN. It is never replaced by zero.
8. Explicit zero is a real observed value.
9. Facts from different activity events are never mixed.
10. Facts from different measurement bundles are never mixed silently.
11. A direct target and its components are never summed together.

## 5. Night sleep candidate contract

Measurement family:

`sleep_duration`

Universal parameter:

`duration`

Canonical unit:

`minute`

Rollup target:

- Night sleep duration
- `84d2f41f-4068-518a-b9d9-047b0d0e0762`

Components:

- Light sleep duration
- `607c0db7-d29d-5b5f-89a4-8317bb37fc62`

- Deep sleep duration
- `45d472b0-88fe-5642-b7d0-cbe2502c4ca9`

- REM sleep duration
- `a620cf08-9cdb-5c7a-b428-721f356e2d8e`

Formula:

`Night sleep duration = Light + Deep + REM`

Completeness:

all three component values are required to derive the target.

Direct-value policy:

`prefer_direct`

Missing-value policy:

`unknown`

Discrepancy policy:

`flag`

Tolerance:

1 minute in V1.

## 6. Measurement bundles

A measurement bundle groups values obtained from one coherent intake/source instance.

Future example:

`photo of one Garmin sleep report -> one measurement bundle`

This prevents accidental calculation from:

- Light from today's Garmin photo,
- Deep from yesterday,
- REM from another device.

The original source label and source method should remain in provenance when photo/device intake is implemented.

## 7. Relation to formulas

This contract is a generic aggregation/reconciliation layer, not a replacement for the formula-rule registry.

Formula rules remain appropriate for domain calculations and downstream derived facts.

The rollup contract answers a narrower question:

> Which fact should analytics use when the same measurable family is available at different semantic granularities?

## 8. Current patch boundary

This patch introduces:

- typed V1 contract;
- pure deterministic evaluator;
- Night sleep V1 fixture;
- self-tests and static validator;
- architecture documentation.

This patch does NOT:

- modify Supabase schema;
- modify existing ON records;
- create or publish formula rules;
- materialize derived facts into DB;
- connect photo intake;
- change current analytics pages.

Those runtime integrations require a separate write/storage decision after this contract passes source validation.
