# ARCTor — Relation Review UI V2 recovery checkpoint

Generated: 2026-09-10T12:20:27.9875261+02:00

## Baseline
- baseline commit: 633bb3c8b6f4ce5b443842c96d0de71038ac8a10
- branch: main
- origin/main: 633bb3c8b6f4ce5b443842c96d0de71038ac8a10
- worktree before mutation: clean
- source hashes matched the intake from 2026-09-10

## Product decisions
The relationship map is now the curator's direct completeness-review interface.

A zone has two independent dimensions:
1. relation-type pastel color;
2. review-status accent.

Review status:
- red = not reviewed;
- green = reviewed;
- yellow = requires re-review;
- gray = not applicable;
- stronger red = model gap.

Adding or removing an ON never marks a zone reviewed.
If a previously reviewed relation set is changed, the relevant saved review is invalidated to stale/yellow.
The curator must explicitly confirm completeness again.

Opening a semantic or cross-plane zone gives the curator:
- existing linked ON objects;
- add/remove relation controls;
- Finish review;
- Reviewed — no links required;
- Model gap for an empty cross-plane zone;
- Not applicable;
- Leave for review.

The two other primary model branches are exposed as explicit cross-plane zones when coverage data is available.

## Changed source
- src/app/api/value-objects/[id]/relationship-coverage/route.ts
- src/components/workspace/value-objects/value-object-relationship-coverage-review.tsx
- src/components/workspace/value-objects/value-object-relationship-map.tsx

## Database
No DDL is executed by this release runner.
Before mutation the runner verified through Supabase REST that both required tables are readable:
- system_value_object_relations
- value_object_relation_zone_reviews

## Evidence before commit
- exact baseline/hash gates: PASS
- DB readiness gate: PASS
- changed-files ESLint: PASS
- git diff --check: PASS
- production build: PASS
- external backup: C:\Users\Admin\Downloads\ARCTOR_RELATION_REVIEW_UI_V2_FIX3_20260910_121802_BACKUP.zip

## Continuation
After production deployment:
1. open a global system ON;
2. verify red accents on unreviewed zones;
3. open a zone and add an ON — unreviewed remains red;
4. finish review — zone becomes green;
5. modify a previously reviewed zone — it becomes yellow/stale;
6. verify deliberate zero can be green;
7. verify Not applicable is gray;
8. verify Model gap is stronger red;
9. verify the two parallel primary branches appear as explicit zones.
