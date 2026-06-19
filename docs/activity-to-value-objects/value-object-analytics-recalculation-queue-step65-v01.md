# Value Object analytics recalculation queue — Step 65

Status: no-write queue contract.
Change Log: not updated by user request.

## General Plan mapping

Step 65: Use recalculation queue.

## What this step adds

This step adds a pure TypeScript contract for analytics recalculation jobs.

The queue contract describes:

1. why analytics should be recalculated;
2. which Value Object scope is affected;
3. whether direct analytics, daily aggregates, current snapshots, or parent rollups are invalidated;
4. how a later background worker can consume the job;
5. which safety boundaries are still active.

## Files

- `src/types/value-object-analytics-queue.ts`
- `src/lib/value-objects/value-object-analytics-recalculation-queue.ts`

## Safety boundary

This step does not read from the database.
This step does not write to the database.
This step does not execute SQL.
This step does not call external model providers.
This step does not start a real background worker.
This step does not commit or push.

## Why this is still useful

The approved architecture allows a short natural delay between activity save and report viewing. This queue contract prepares the later background/queued recalculation layer without forcing immediate parent rollups at write time.

## Next step

Step 65C should run local validation and prepare the commit gate if ESLint, build, and diff checks are clean.