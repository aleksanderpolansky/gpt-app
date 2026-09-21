# ARCTOR - E04 User State Snapshot Capture V1.2

Date: 2026-09-21
Release: ARCTOR_E04_USER_STATE_SNAPSHOT_CAPTURE_V1_2_20260921
Baseline: 1560e61bbbf49518b314e208435e2f42c7797282
Product commit: 3f0acbfd420660c3fa48da86642ed8de2c25322b

## Previous stops

V1 stopped before commit/push because scoped ESLint rejected setState inside an effect on the new snapshot page.
V1.1 fixed that lint issue and reached production build, which then stopped because the new Route Handler incorrectly declared "use server" while also exporting route segment constants.
No product commit or push occurred in V1 or V1.1.

## V1.2 fix

- Removed the "use server" directive from src/app/api/activity/facts/snapshots/route.ts.
- The file remains a normal Next.js Route Handler and may export dynamic/runtime constants plus async GET/POST handlers.
- Snapshot UI/API behavior is otherwise unchanged from V1.1.

## Snapshot contract

- /activity-facts/snapshot provides controlled user snapshot entry.
- GET/POST /api/activity/facts/snapshots resolves active SYSTEM parameter assignments.
- Snapshot writes use existing activity_object_facts with fact_role_code=snapshot.
- effective_at and previous_snapshot_fact_id are preserved.
- user_explicit / user_reported provenance is stored in metadata.
- browser retry idempotency uses a client request UUID.

## Validation

- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS

## Acceptance

Open Facts -> Add state snapshot.
Record Actual body mass / Mass = 96 kilogram.
Choose effective_at not later than the stair activity if this snapshot is to feed that activity.
Confirm that one snapshot fact is visible on the Facts page.
