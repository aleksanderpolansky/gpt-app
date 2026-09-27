# ARCTOR_EXPLICIT_SINGULAR_COUNT_V1 — 2026-09-27

## Live acceptance that triggered the patch

Input:

`Выпил чашку кофе с сахаром`

Observed after successful snapshot fallback:

- typical activity `Употребление чашки кофе с сахаром` matched;
- `Масса -> Употребление добавленного сахара = 5 g` was correctly calculated
  from the current state snapshot;
- `Количество -> Употребление кофе` remained missing and the UI requested a
  manual value.

## Decision

A grammatical singular countable item is treated as an explicit primitive count
when singularity is directly encoded in the source phrase.

Examples:

- `выпил чашку кофе` -> `count = 1`;
- `drank a cup of coffee` -> `count = 1`;
- `выпил кофе` -> no implicit count;
- several distinct singular countable items in one activity -> no unqualified
  deterministic count is synthesized.

This remains inside the existing Basic Intake rule that measurements must be
supported by verbatim source evidence.

## Implementation

`src/lib/activity/activity-basic-intake-analysis.server.ts`:

1. Adds a conservative multilingual detector for common singular countable
   units/items.
2. Emits deterministic:
   - `parameterCode = count`;
   - `measureType = count`;
   - `unit = count`;
   - `valueNumeric = 1`;
   - `qualifier = null`;
   - `rawFragment` copied from source text.
3. The detector returns a value only when exactly one supported singular marker
   is present. This avoids silently collapsing `one coffee + one water` into one
   unqualified count.
4. Adds an AI prompt rule for general grammatical singulars beyond the small
   deterministic lexicon. The model is explicitly forbidden to infer `1` from
   bare substances such as `выпил кофе`.

## Why qualifier=null

The current profile authoring contract marks the first/only count target as the
default recipient for an unqualified count. For the simple activity
`Выпил чашку кофе с сахаром`, this routes `count=1` to `Употребление кофе`.

Qualified multi-target count cases continue to use the existing explicit
qualification logic and are not broadened by this patch.

## No schema change

- DB migrations: 0
- SQL: 0
- API contract changes: 0
- fact schema changes: 0

## Acceptance after deploy

Re-run Basic AI analysis for a fresh activity:

`Выпил чашку кофе с сахаром`

Expected preflight:

- `Количество -> Употребление кофе = 1 шт.`;
- `Масса -> Употребление добавленного сахара = 5 g`
  (from the confirmed current sugar-per-cup snapshot);
- no manual `Количество` prompt.

Negative control:

`Выпил кофе с сахаром`

must NOT manufacture `Количество = 1`.
