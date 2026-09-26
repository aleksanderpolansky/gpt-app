# ARCTor — Activity Intake Routing Review UI V1

Date: 2026-09-26

## Purpose

Make the confirmation screen explain the semantic routing before facts are
written and let the user fill optional values that were not present in the
original activity text.

## Universal behavior

The feature is not specific to sleep.

Examples:

- duration -> total sleep / light / deep / REM;
- mass -> soup / potato / meat;
- mass -> body / fat / water / muscle.

A direct binding with `targetQualification.mode = explicit_qualifier` is shown
as an optional explicitly-qualified value when the qualifier was not present.
It remains available for manual completion but does not make required
completeness partial.

## Review UI

Before confirmation the screen shows:

1. **Will be written**
   - detected value;
   - parameter;
   - target Observation Object.

2. **Additional data not specified**
   - target Observation Object;
   - parameter and canonical unit;
   - optional badge for explicit-only targets;
   - input for a value the user knows but did not include originally.

If optional drafts are filled before confirmation, the controlled flow first
materializes the detected source facts and then uses the existing supplement
endpoint for each filled draft. Existing facts are not rewritten.

After materialization, remaining optional/missing values stay supplementable
through the existing per-row action.

## Safety

No database schema migration.
No new writer RPC.
Existing controlled confirmation and supplement writers remain the only write
paths.
