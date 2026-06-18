# GPT-APP / AI-NAVIGATOR - Step 61 / 76: ValueObjectTargetStandard guarded persistence contract

Generated: 2026-06-18 18:00:44 +02:00

## 1. Scope

This document defines the future guarded persistence contract for ValueObjectTargetStandard.

Current step status: contract and planning only.

This document does not enable persistence. It does not add a database table, does not execute a migration, does not enable a browser write path, and does not call any external model provider.

## 2. Baseline from Step 58-60

Step 58 introduced the TypeScript contract:

- ValueObjectTargetStandard
- ValueObjectTargetStandardDraft
- validation helpers
- summary/value formatting helpers

Step 59 introduced fixture standards for UI and analytics development.

Step 60 introduced read-only standards UI routes:

- /value-objects/standards
- /value-objects/[id]/standards

The Step 60 UI reads only fixture standards and must remain safe while persistence is being designed.

## 3. Future endpoint proposal

Recommended future no-write preview route first:

- GET /api/value-objects/[id]/standards/save-gate
- POST /api/value-objects/[id]/standards/save-gate

The first implementation of this route should be a no-write scaffold, similar to the existing Activity Facts save-gate route.

The route should accept the contract vocabulary but block actual persistence until a separate schema, security and write gate is completed.

## 4. Future request contract

Request body proposal, shown as plain text to avoid executable code blocks:

{
  "mode": "preview",
  "idempotencyKey": "value-object-standard:actor:value-object:metric:period",
  "standardDraft": {
    "valueObjectId": "value-object-id",
    "metricType": "duration",
    "targetValue": 60,
    "targetMin": null,
    "targetMax": null,
    "unit": "minutes",
    "period": "day",
    "ruleType": "desired_minimum",
    "priority": "normal",
    "source": "user_defined",
    "status": "draft",
    "label": "Daily family time",
    "description": "User-defined target for comparing family-time facts.",
    "safetyNote": "Standards are analytics targets and reference thresholds, not diagnosis or guaranteed truth."
  }
}

Allowed mode values:

- preview
- confirm_save

Current Step 61 behavior must treat confirm_save as contract vocabulary only. Actual persistence remains blocked until later gated implementation.

## 5. Future response contract

Preview response proposal, shown as plain text:

{
  "ok": true,
  "endpoint": "/api/value-objects/[id]/standards/save-gate",
  "routeStatus": "guarded_persistence_contract_only_no_write",
  "productionWriteEnabled": false,
  "validation": {
    "ok": true,
    "errors": [],
    "warnings": []
  },
  "plannedWrites": [
    {
      "table": "value_object_target_standards",
      "operation": "planned_create",
      "status": "not_executed"
    }
  ],
  "sideEffects": {
    "dbReadExecuted": false,
    "dbWriteExecuted": false,
    "sqlExecuted": false,
    "externalModelCallExecuted": false,
    "rowsActuallyWritten": 0
  }
}

## 6. Future table shape proposal

Future table name proposal:

- value_object_target_standards

Recommended fields:

| Field | Meaning |
| --- | --- |
| id | Standard ID |
| value_object_id | Linked Value Object |
| owner_actor_id | Actor who owns the standard when user-defined |
| created_by_actor_id | Actor who created the standard when applicable |
| organization_id | Optional organization scope for commercial standards |
| author_type | user, organization, or system |
| metric_type | duration, volume, count, distance, energy, money, score |
| target_value | Main numeric target |
| target_min | Optional range minimum |
| target_max | Optional range maximum |
| unit | minutes, hours, liters, steps, kcal, PLN, EUR, points, score, etc. |
| period | day, week, month, quarter, year, rolling_7_days, rolling_30_days |
| rule_type | desired_minimum, desired_maximum, desired_range, exact_target, frequency_minimum |
| priority | low, normal, high, critical |
| source | user_defined, system_default, professional_guideline, manual, imported |
| status | draft, active, archived |
| label | Human-readable label |
| description | Explanation shown to the user |
| safety_note | Safety / no-overclaim text |
| created_at | Creation timestamp |
| updated_at | Last update timestamp |

## 7. Ownership and visibility rules

A standard is not the same thing as a user fact.

Activity facts remain user-owned and private. A standard is a target or reference threshold used later by analytics.

Recommended ownership rules:

1. source = user_defined means the standard should be owned by the user actor.
2. source = system_default means the standard can be system-authored and shared as reference content.
3. source = professional_guideline requires careful source metadata and safety copy before production use.
4. A standard linked to a shared/system Value Object must not expose another user's facts.
5. A user-owned standard must not become globally visible by accident.
6. Commercial standards may require organization_id and organization access verification.

## 8. Validation rules

The future route should validate:

- valueObjectId is present and matches route param.
- metricType is one of the allowed metric types.
- targetValue is finite.
- targetValue is non-negative unless a later rule explicitly allows signed values.
- unit is compatible with metricType.
- period is allowed.
- ruleType is allowed.
- desired_range requires finite targetMin and targetMax.
- targetMin <= targetMax.
- priority is allowed.
- source is allowed.
- status is allowed.
- label, description, and safetyNote length limits are enforced.
- Unknown body keys are rejected or reported as warnings.
- Explicit write intent is blocked in no-write route versions.

## 9. Security and access rules

Before persistence is enabled, the future route must prove:

1. Server-side authentication is resolved.
2. app_users row is resolved from Auth0 subject.
3. persons row is resolved from app_users.
4. actor row is resolved from person.
5. value object access is checked.
6. commercial organization access is checked when applicable.
7. no direct browser database write is possible.
8. no service-role write is exposed to the client.
9. idempotency is handled.
10. audit fields are produced.

## 10. Schema and security gate sequence

Future schema work must be a separate explicit gate.

Recommended order:

1. table definition
2. indexes
3. row-level security
4. policies
5. explicit privileges/grants
6. read verification
7. blocked-write verification
8. controlled server-mediated write verification
9. rollback or correction plan
10. commit/push only after gate approval

## 11. API behavior by phase

### Phase A - no-write contract route

Allowed:

- validate request
- return planned writes
- return side-effects object
- block confirm_save

Not allowed:

- database mutation
- migration execution
- external model call
- silent standard creation

### Phase B - guarded preview route with database reads

Allowed:

- read current user context
- read Value Object access
- read existing standards
- detect duplicates

Still not allowed:

- write rows
- alter schema
- silently activate persistence

### Phase C - controlled write gate

Allowed only after separate approval:

- write one standard row server-side
- verify row ownership
- verify row visibility
- write audit metadata
- return created standard

## 12. Idempotency proposal

Suggested idempotency key components:

- actor ID
- value object ID
- metric type
- period
- rule type
- source
- normalized label

The final key should avoid duplicate standards for the same user and Value Object while still allowing multiple distinct standards when they measure different metrics or periods.

## 13. Correction and lifecycle

Standards should support:

- draft
- active
- archived

Deleting standards should not be the first implementation. Archiving is safer for auditability.

Editing standards should create an audit trail later, especially when analytics decisions were based on a previous value.

## 14. Analytics integration

Later analytics can compare:

- user-owned activity_object_facts
- related measures
- current effective Value Object hierarchy
- active standards for that Value Object

Analytics must avoid chronological double counting. One 30-minute activity can influence several Value Objects, but the user's chronological time remains 30 minutes.

## 15. Step 61 acceptance target

Step 61 is complete when the project has:

- a no-write guarded persistence contract document
- a no-write save-gate route scaffold or equivalent contract preview
- validation helpers for standard drafts
- safety scans showing no persistence was enabled accidentally
- a commit/push gate for the no-write contract artifacts

Persistence itself belongs to a later explicit implementation gate.
