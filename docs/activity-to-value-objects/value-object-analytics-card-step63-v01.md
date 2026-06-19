# Value Object analytics card — Step 63

Status: local component.
Change Log: not updated by user request.

## General Plan mapping

Step 63: Create analytics card.

Required content:

- progress
- remaining/recommended attention
- source facts

Artifact:

- Analytics component

Acceptance:

- clear user-facing result

## Component

Created file:

`src/components/workspace/analytics-dashboard/value-object-analytics-card.tsx`

The component accepts a `ValueObjectAnalyticsResolverResult` from Step 62 and renders:

1. actual value
2. target value
3. delta
4. progress percent
5. status
6. recommended attention copy
7. source fact IDs

## Safety boundary

This step does not read from the database.
This step does not write to the database.
This step does not execute SQL.
This step does not call external model providers.
This step does not commit or push.

## Next approved plan step

Step 64: Wire to `/analytics`.
