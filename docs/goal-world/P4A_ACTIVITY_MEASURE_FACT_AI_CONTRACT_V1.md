# ARCTor.app — Goal World Constructor
## P4A Activity / Measure / Fact + AI Instruction Data Contract v1
### 9 Aug 2026

## 1. Purpose

P4A aligns the already-existing activity/fact pipeline with the Goal World
ontology and adds explicit provenance for inferred numbers plus versioned AI
instruction layers.

The current implementation is reused, not replaced:

- `activity_events` remains the event container;
- `activity_event_measures` remains the neutral quantity/value store;
- `activity_object_facts` remains the semantic fan-out from one measure to one
  or more leaf Value Objects;
- `activity_value_object_links` remains the non-measure/planned link store;
- `value_object_parameter_definitions` and assignments remain the parameter
  registry;
- `fact_capture_precision_policies` and preferences remain the precision policy
  layer;
- `activity_semantic_enrichment_runs_cux4` remains a processing-run anchor.

## 2. One neutral measure, many semantic facts

A physical quantity is stored once in `activity_event_measures`.

Example:

> "I spoke with my daughter in German for 18 minutes."

One duration measure of 18 minutes is stored once.

That measure may fan out into separate `activity_object_facts` for different leaf
Value Objects, for example:

- relationship / communication with daughter;
- German-language practice.

The 18 minutes are not physically duplicated.

## 3. Leaf-only observation facts

Raw object facts may point only to ontology leaves:

`value_objects.ontology_node_role_code = 'leaf'`.

Root and intermediate nodes receive aggregation/derived state later and do not
receive raw activity facts.

Planned activities remain allowed to target root, intermediate or leaf Value
Objects through `planned_target` links.

Non-measure `semantic_exposure` links are leaf-only.

## 4. Parameter definitions and assignments

The existing global parameter registry is preserved.

Parameter assignments move from the legacy guard:

`node_role_code = 'activity_leaf'`

to the ontology guard:

`ontology_node_role_code = 'leaf'`.

The existing 24 system parameter definitions remain unchanged.

## 5. Three independent quality axes

The old generic `confidence` fields are retained for compatibility but are not
the final P4 semantic contract. Existing `activity_value_object_links` are not
bulk-rewritten during P4A; the new semantic-match columns apply prospectively so
the stronger ontology-leaf trigger does not reinterpret legacy/current rows as a
side effect of schema installation.

P4 separates:

1. **Semantic match confidence**
   - how confident the system is that a fact/link belongs to a particular leaf
     Value Object.

2. **Value precision policy**
   - how precise the stored quantity is expected to be;
   - uses the existing `fact_capture_precision_policies`.

3. **Source reliability**
   - how reliable the origin of the number is.

These axes must never be collapsed into one AI confidence number.

## 6. Number origin and provenance

Each measure may have one provenance row.

`value_origin_code`:

- `user_explicit`
- `user_edit`
- `device_measurement`
- `document_extract`
- `identified_reference`
- `deterministic_calculation`
- `ai_estimate`
- `typical_reference`
- `system_default`

`source_reliability_code`:

- `authoritative`
- `identified_catalog`
- `device_reported`
- `user_reported`
- `deterministic`
- `inferred`
- `generic_reference`

For the strongest provenance categories P4A also enforces coherent pairs:
explicit user values use `user_reported`, device measurements use
`device_reported`, deterministic calculations use `deterministic`, AI estimates
use `inferred`, typical references use `generic_reference`, and identified
references use `authoritative` or `identified_catalog`.

The provenance row may retain:

- source reference / URL / product identifier;
- a source snapshot;
- identified product/entity metadata;
- the assumption shown to the user;
- the AI processing run that produced the estimate.

## 7. Explicit user-number rule

If the user explicitly states a number, that value is canonical input for the
current extraction.

AI may normalize unit/format but may not silently replace the user's value with
an inferred/reference value.

A later correction is a separate user-edit operation.

## 8. Product/reference fallback rule

If a concrete product is identified (barcode, receipt line, manufacturer SKU,
store catalogue, authoritative page), its source snapshot may be used.

If the concrete product cannot be identified, a regional/typical reference may
be used only as an explicit estimate.

The user-facing processing result must make the assumption visible, for example:

> Exact product not identified. A typical éclair reference for the selected
> market is used for this estimate.

The system must never label a regional/typical fallback as an exact product
measurement.

## 9. Time accounting

For one event:

`duration_minutes` is activity time for that activity.

For a selected bounded period:

- only events with an exact interval can be placed in that period;
- an exact interval crossing a period boundary is clipped to the requested
  range;
- if stored `duration_minutes` differs from elapsed interval length, the
  activity duration is deterministically prorated by the clipped fraction;
- duration-only events without an exact interval are not silently assigned to a
  bounded period.

For an unbounded all-time query, duration-only events are included and reported
separately as `unplacedActivityMinutes`.

The result exposes:

- `eventCount`;
- `activityMinutes`;
- `wallClockMinutes` = union of exact event intervals;
- `overlapActivityMinutes`;
- `maxConcurrentActivities`;
- `unplacedActivityMinutes`.

This deliberately allows `activityMinutes > wallClockMinutes`.

That is not an error. It is an observable multitasking characteristic.

## 10. AI instruction governance

ARCTor needs a general instruction layer in addition to the existing
calendar-specific user rules.

P4A creates versioned storage for:

### System/admin instructions

Examples:

- activity decomposition;
- fact extraction;
- number/source selection;
- product/reference identification;
- Value Object matching;
- uncertainty disclosure.

Each instruction-text edit creates an immutable revision automatically at the
database boundary. The current instruction row is mutable; runtime
`service_role` can only read the revision ledger and cannot insert, update or
delete revision rows directly. Revision rows are appended only by the controlled
SECURITY DEFINER trigger and are additionally protected by an immutable-history
trigger.

### Actor instructions

A user/actor may add personal processing rules, for example:

- "coffee" normally means double espresso without sugar;
- a usual product/portion;
- personal interpretation of recurring activity wording.

Actor rules personalize processing but cannot override database invariants,
security, closed relation registries or ontology guards. Each change to the
personal instruction text automatically increments its revision and appends an
immutable revision row.

## 11. Instruction precedence

Processing precedence is:

1. database/security invariants;
2. ARCTor system contract;
3. current admin instruction revisions;
4. current actor instruction;
5. current user message/source data.

## 12. Reproducibility

An AI processing run must be able to record:

- model/provider;
- system instruction bundle snapshot;
- actor instruction snapshot;
- external/reference source snapshot;
- inference assumptions;
- optional linked `ai_usage_events` row.

This makes later explanation possible without relying on whatever prompt happens
to be current months later. The provenance row is owner-aligned to the referenced
semantic-enrichment run; an optional AI-usage row must belong to the same user.
The processing-provenance snapshot is append-only/immutable at runtime.

## 13. Admin and user UI

The data contract is the prerequisite for two later P4B UI surfaces:

- `/admin/ai-instructions`
  - platform-admin-only;
  - shows current instruction sets and revision history;
  - allows controlled revision creation.

- `/settings/ai-processing`
  - actor/user-specific;
  - shows and edits personal processing instructions;
  - shows the active revision.

P4A intentionally creates the data contract first. P4B wires the UI after live
schema/runtime acceptance.

## 14. P4A non-goals

P4A does not:

- create Goal Worlds;
- assign relation weights;
- calculate causal effects;
- automatically scrape arbitrary websites;
- call an AI model from SQL;
- silently convert typical reference data into exact measured data.

## 15. Acceptance gate

P4A closes when live acceptance proves:

- legacy parameter assignment guard is replaced by ontology-leaf guard;
- raw facts reject root/intermediate targets;
- planned targets still accept non-leaf targets;
- one measure can fan out to multiple leaf facts without copying the measure;
- the three quality axes remain separate;
- explicit-user / identified-reference / typical-reference provenance can be
  distinguished;
- typical-reference provenance requires an assumption notice;
- instruction revisions are automatically appended, immutable/versioned and
  not directly writable by runtime `service_role`;
- actor instruction revisions are automatically appended, owner-scoped and not
  directly writable by runtime `service_role`;
- parameter assignment keeps the existing creator-ownership guard;
- processing provenance is owner-aligned to its semantic-enrichment run,
  runtime-immutable and stores exact instruction/source snapshots;
- deterministic time accounting validates actor ownership, rejects inverted
  time ranges, distinguishes wall clock from summed activity minutes and does
  not place undated duration-only events into bounded periods;
- all runtime fixtures roll back cleanly.
