# Value Object analytics resolver v0 — Step 62

Status: pure local resolver contract.
Write boundary: no database writes, no SQL execution, no external model calls.
Route boundary: no production API route is added in this step.
Change Log: not updated by user request.

## Goal

Step 62 introduces the first analytics resolver for target standards.

The resolver compares accepted user-owned fact summaries with a structured `ValueObjectTargetStandard` and returns a user-visible progress signal.

## Canonical example

Family Time:

- actual fact value: 30 minutes
- target standard: 60 minutes per day
- result: 30 / 60
- delta: -30
- status: below_target
- copy: suggests 30 more minutes of attention for the period

## Input

The resolver accepts:

1. `ValueObjectTargetStandard`
2. accepted or edited activity fact summaries
3. value object id
4. optional period window

## Output

The resolver returns:

1. `valueObjectId`
2. `metricType`
3. `actualValue`
4. `targetValue`, `targetMin`, `targetMax`
5. `unit`
6. `period`
7. `progressPercent`
8. `delta`
9. `status`
10. `recommendationCopy`
11. `sourceFactIds`
12. `sourceActivityIds`

## Safety rules

- The resolver does not read from the database.
- The resolver does not write to the database.
- The resolver does not execute SQL.
- The resolver does not call external model providers.
- The resolver does not diagnose health or personality.
- Recommendation wording must stay in the language of signals, progress, remaining attention and suggested attention.

## Step 62B acceptance target

Demo scenario:

`Family Time 30/60, delta = -30`

The demo scenario is implemented in:

`src/lib/value-objects/value-object-analytics-resolver.ts`

via:

`resolveDemoFamilyTimeAnalytics()`
