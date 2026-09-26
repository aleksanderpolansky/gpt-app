# ARCTor Dashboard Observation Fact Analytics V3

Date: 2026-09-25

## Purpose

Add a first executable Dashboard path from confirmed Reality Core facts to ordinary line, bar, and metric analytics blocks without introducing a new database schema.

The enabled V3 combination is:

- visualization: `line | bar | metric`
- source: `facts`
- metric: `numeric_value`
- aggregation: `sum`
- grouping: `day`
- period: `7 | 14 | 30` days

The selected observation object and parameter are stored in the existing `dashboard_analytics_blocks.config_json` field.

## Stored config contract

For an observation-fact series, `config_json` contains:

- `contract = dashboard-analytics-v3`
- `valueObjectId`
- `parameterDefinitionId`
- `parameterCode`
- `canonicalUnitCode`
- display-only `valueObjectTitle`
- display-only `parameterTitle`
- existing `layoutWidth`

The server never trusts display text as identity. The observation object UUID, parameter definition UUID, parameter code, assignment, scope, and canonical unit are revalidated before a block is stored and again before data is executed.

## Builder flow

For line, bar, and metric views the second wizard step now offers two sources:

1. Activities — existing duration/count behavior.
2. Facts by observation object — new V3 behavior.

The observation-object search reuses the existing read-only `/api/value-objects/selector` endpoint with `includeGlobal=1`, `level=leaf`, and locale-aware search. Only active search results are offered for analytics creation.

After an object is selected, `/api/dashboard/analytics-observation-options` returns the active numeric parameters that are actually assigned to that leaf in the correct scope:

- global leaf -> active system assignment;
- actor-owned leaf -> active actor assignment owned by the active user/actor.

No new SQL table, migration, or write API is introduced.

## Data execution

`/api/dashboard/analytics-data` keeps the existing activity, certificate-map, and fact-root distribution paths and adds an observation-fact series path.

The resolver:

1. authenticates the current user/actor;
2. revalidates the selected leaf and parameter assignment;
3. reads owned confirmed `activity_object_facts` for the selected parameter definition, including the physical numeric value and stored unit;
4. expands each confirmed fact through `activity_fact_value_object_links_effective_v1`, while retaining the fact's direct `value_object_id` as a fallback semantic projection;
5. keeps only the selected target leaf and, when configured, its `measurementRollupV1` source leaves;
6. resolves rollup values per activity event through the existing deterministic `resolveMeasurementRollupV1` contract;
7. groups effective values by user-local calendar day.

The observation-series path intentionally does not depend on the legacy
`activity_fact_analytics_inputs_v1` column layout. Runtime diagnostics on
2026-09-26 showed that the production view no longer exposes
`activity_event_id`, while the confirmed fact row plus effective-link view
already provides the required event, object, numeric value, unit, and date
contract without a database migration.

Days without a resolvable value are returned as `valueNumber: null`, not zero.

## Rollup semantics

When the selected target leaf contains compatible `metadata_json.measurementRollupV1`, Dashboard analytics uses that exact stored rule.

Example acceptance target: `Продолжительность ночного сна / duration / minute`.

If the configured sources are:

- light sleep = 351 min
- deep sleep = 30 min
- REM sleep = 115 min

then a component-only event resolves to `496 min`.

If a direct target fact of `496 min` exists in the same event together with those components, the effective analytics value remains `496 min`; the direct and derived values are not added together.

If a required component is absent and no direct target value exists, the event is unresolved and contributes no numeric value. This implements the configured `missingValuePolicy = unknown` rather than silently treating the missing component as zero.

A direct target value remains preferred according to the existing rollup contract. A direct-vs-derived discrepancy is surfaced in response telemetry while the deterministic rollup resolver controls the effective value.

## V3 boundary

V3 intentionally enables only daily `sum` for generic numeric fact series. Parameters whose correct daily semantics are `average`, `latest`, `min`, `max`, or another aggregation require a later contract expansion before those aggregation modes are offered by the builder.

This keeps the first production acceptance narrow and deterministic while proving the complete path:

`Dashboard wizard -> leaf UUID -> assigned parameter -> config_json -> canonical fact values -> measurementRollupV1 -> day series`.

## Safety / non-goals

This patch:

- creates no migration;
- performs no installer DB writes;
- does not change fact-writing logic;
- does not change the rollup authoring contract;
- does not invent missing values;
- does not change existing Dashboard block combinations;
- does not commit, push, or deploy by itself.

## First production acceptance scenario

Create:

`Изменение во времени -> Факты по объектам наблюдения -> Продолжительность ночного сна -> duration -> По дням -> 30 дней`.

Verify separately:

1. direct target fact only;
2. all configured sleep-stage source facts only;
3. direct target plus all sources, with no double count;
4. one required source missing and no direct target, producing UNKNOWN/no point instead of a partial sum.
