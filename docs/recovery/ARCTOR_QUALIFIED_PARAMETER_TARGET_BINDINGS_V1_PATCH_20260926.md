# ARCTor — Qualified Parameter Target Bindings V1 — Patch checkpoint

Date: 2026-09-26
Expected baseline: `f25cd9fd1a391bc2388aee1f5e8cd811aa57cabb`

## User requirement

Add a universal checkbox next to every selected Observation Object inside the
System Typical Activity constructor:

`Требует явного указания`

The same universal parameter can then serve several targets without copying a
bare value to all of them.

Primary acceptance examples:

1. Sleep:
   - `duration -> night sleep duration` default;
   - `duration -> light/deep/REM duration` explicit-only.
2. Soup:
   - `mass -> soup` default;
   - `mass -> potato` explicit-only;
   - `mass -> meat` explicit-only.
3. Body composition:
   - `mass -> body mass` default;
   - `mass -> fat/water/muscle` explicit-only.

## Implementation

- adds `targetQualification` to source bindings;
- first selected target is default;
- subsequently selected targets start as explicit-only;
- unchecking explicit-only automatically makes the selected row the sole
  default and switches sibling rows to explicit-only;
- aliases are derived from localized/English Observation Object titles;
- basic intake returns a verbatim `qualifier` for each measurement;
- repeated same-parameter measurements are preserved;
- E03 deterministically routes labelled measurements to explicit targets;
- one unqualified measurement can route only to the single default target;
- ambiguous matches fail closed;
- old profiles with no qualification metadata keep legacy fan-out semantics.

## Persistence

Uses existing profile metadata:
`activity_template_impact_profiles_v1.metadata_json.sourceValueBindingsV1`

No migration required.

## Safety / release boundary

Installer:
- DB_WRITES=0
- SQL_EXECUTED=0
- COMMIT=false
- PUSH=false
- DEPLOY=false

Runtime DB writes occur only later through existing explicit administrator
publication / controlled fact-confirmation actions.

## Validation

Required gates:
- `validate-qualified-parameter-target-bindings-v1.mjs`;
- source-from-snapshot validator;
- basic intake validator;
- targeted ESLint;
- TypeScript `--noEmit`;
- `git diff --check`;
- production build;
- exact tracked/untracked allowlists.

After PASS, commit/push is a separate gated step.
