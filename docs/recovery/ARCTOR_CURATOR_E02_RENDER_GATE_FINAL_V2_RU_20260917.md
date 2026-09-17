# ARCTor - E02 Render Gate Final V2

Date: 2026-09-17

Baseline:

9916f32be3ecdde986bd356ba7208ad4014c8c11

## State before this fix

E01 mappings are complete:

- Duration -> Stair ascent
- Count -> One-storey stair ascent

E02 database migration is already applied.

E02 API and system materialization RPC exist.

Russian UTF-8 source is valid.

The remaining defect was only UI wiring:

CuratorSystemTemplateMaterialization was imported but not rendered
after allMapped.

## Root cause of previous failed patch

The previous patch searched for the complete JSX branch through an exact
multiline string comparison.

The semantic block existed, but the literal comparison was too sensitive
to line endings / whitespace formatting.

Nothing was written by that failed attempt.

## V2 fix

The allMapped block is identified structurally with a regex tolerant of:

- LF;
- CRLF;
- whitespace differences.

Exactly one source match is required.

Exactly one CuratorSystemTemplateMaterialization render is required
after replacement.

The existing allMapped completion notice is preserved.

## Validation gates

- clean committed baseline;
- valid UTF-8;
- mojibake markers absent;
- E02 render before = 0;
- allMapped structural match = 1;
- E02 render after = 1;
- git diff --check;
- ESLint --max-warnings=0;
- TypeScript --noEmit;
- production build;
- exact staged file set;
- commit must change HEAD;
- origin/main must equal new HEAD.

## Data safety

Supabase writes: NONE.

SQL writes: NONE.

E01 mappings changed: NO.

E02 migration changed: NO.

Observation objects changed: NO.

Activity templates changed: NO.

## Next runtime point

After deployment:

1. reload the existing Reality Curator signal;
2. verify Duration remains confirmed;
3. verify Count remains confirmed;
4. verify normal Russian copy;
5. verify E02 publication card appears below allMapped;
6. review RU/EN name and descriptions;
7. do not publish before review;
8. E03 remains blocked.