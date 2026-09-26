# ARCTor Dashboard Fact Runtime Fix V1

Date: 2026-09-26

## Baseline

- branch: `main`
- expected HEAD: `8ae5678ee388d0dc9362416cd1a22dc819edf618`
- previous feature commit: `feat(dashboard): add observation fact analytics`

## Production symptom

The Dashboard wizard successfully created an observation-fact block, but the
new block returned `500` from `/api/dashboard/analytics-data`.

## Read-only runtime diagnosis

The block contract is valid and the selected global leaf has one active numeric
parameter assignment. Production contains a confirmed physical fact for
`One-storey stair ascent / count` with value `11`.

The failing dependency is the observation-series query against
`activity_fact_analytics_inputs_v1`: production returns PostgreSQL `42703`
because `activity_event_id` does not exist in that view.

`activity_fact_value_object_links_effective_v1` succeeds for the same facts.

## Fix

Only the new observation-fact series path changes.

It now:

1. reads exact owned confirmed physical facts for the selected
   `parameter_definition_id`;
2. keeps stored `value_numeric` and `unit`;
3. expands semantic targets through
   `activity_fact_value_object_links_effective_v1`;
4. keeps direct `value_object_id` as a fallback projection;
5. deduplicates `(fact_id, value_object_id)`;
6. feeds those projections into the existing `measurementRollupV1` resolver;
7. preserves UNKNOWN/null behavior and direct-value double-count protection.

No database migration is required.

## Safety

- DB writes by installer: 0
- SQL executed by installer: 0
- commit: false
- push: false
- deploy: false
- existing root-duration/donut analytics path is not changed by this patch

## Acceptance

For the existing `One-storey stair ascent / count / 7 days` block,
`/api/dashboard/analytics-data` should return `200` and include value `11` on
the fact date instead of returning `500`.

Commit/push remains a separate gated step after local validation.
