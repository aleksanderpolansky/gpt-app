# ARCTor - E02 UTF-8 Runtime Repair V3

Date: 2026-09-17

Baseline:

5b83e9630bc5dfe334a3a7de39ec49991385abcc

## Why V3 was required

The V2 ZIP proved that the UTF-8 conversion itself was correct.

However, the V2 release runner produced false PASS results.

Evidence inside that package showed:

- TypeScript:
  route.ts(1294,9) TS1434 Unexpected keyword or identifier.

- ESLint:
  CuratorSystemTemplateMaterialization was imported but never rendered.

- GitHub:
  HEAD did not move beyond 5b83e9630bc5dfe334a3a7de39ec49991385abcc.

Therefore V2 was not a valid source release even though its report said PASS.

## V3 corrections

1. Preserve real UTF-8 Cyrillic source.
2. Render CuratorSystemTemplateMaterialization in the allMapped branch.
3. Fix request.json TypeScript assertion in E02 POST route.
4. Use native process LASTEXITCODE for validation.
5. ESLint uses --max-warnings=0.
6. TypeScript output is additionally scanned for TS errors.
7. Production build output is additionally scanned for failure markers.
8. Release must create a NEW commit SHA; same HEAD is considered failure.

## Data safety

Supabase writes: NONE.

E01 mappings changed: NO.

E02 database migration changed: NO.

Observation objects changed: NO.

Activity templates changed by this hotfix: NO.

## Expected runtime after deployment

Existing mappings remain:

Duration -> Stair ascent
Count -> One-storey stair ascent

After allMapped the page must render:

CuratorSystemTemplateMaterialization.

The curator then reviews the proposed RU/EN system typical activity card.

Publication must NOT happen until that card is reviewed.

E03 remains blocked until E02 runtime materialization evidence is complete.