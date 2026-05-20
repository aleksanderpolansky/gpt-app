# P4.10.0-C8-P3-B5-B3-fix2 — Route activityEventId Variable Fix

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / debug route runtime safety fix

## 1. Problem

B5-B3-fix1 completed the route passthrough and the smoke check passed, but route preview showed a likely runtime problem:

- activityEventId: event.id

The bridge call in the same route uses:

- eventId: createdEvent.id

Therefore event.id could be out of scope or undefined at runtime.

## 2. Fix

Replaced:

- activityEventId: event.id

with:

- activityEventId: createdEvent.id

## 3. Verification

The smoke check was strengthened to verify that the route bridge-prep block uses createdEvent.id and does not use event.id.

## 4. Next step

After this fix passes, proceed to browser regressions:

- no-flag regression
- Category Derivation dryRun=true
- Category Derivation dryRun=false
