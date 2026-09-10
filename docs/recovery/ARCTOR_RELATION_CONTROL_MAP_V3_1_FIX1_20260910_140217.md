# ARCTOR_RELATION_CONTROL_MAP_V3_1_FIX1 technical recovery checkpoint

- Timestamp: 2026-09-10T14:03:29.9011813+02:00
- Baseline: 00e76c38ea3a28e9b4082560cf002c02763eb249
- Previous failed attempt: ARCTOR_RELATION_CONTROL_MAP_V3_1.
- Failure cause: patcher required a text anchor to be unique, but the V3 source intentionally contains two identical if (detailLevel === "detailed") conditions: one for nodes and one for edges. The failed runner stopped on the temporary copy before source mutation.
- FIX1 strategy: no runtime source patching. The release carries one full replacement file gated by the exact baseline Git blob and exact payload SHA256/Git blob.
- Product scope:
  - one primary full working map;
  - remove Overview / Work / Detailed primary buttons;
  - preserve the colored aggregate counters;
  - semantic blocks use fixed geography and are not draggable;
  - the whole semantic block is clickable;
  - each relation row is directly clickable and does not bubble to the block;
  - drill-down remains Full map -> semantic block -> relation zone -> linked ON;
  - canvas pan/zoom remains available;
  - legacy detailed individual-zone graph is available only from the secondary three-dot menu.
- Database changes: none.
- API changes: none.
- Verification:
  - exact baseline HEAD/origin/main;
  - clean worktree;
  - exact current map blob;
  - exact replacement SHA256 and Git blob;
  - changed-file ESLint;
  - git diff --check;
  - production build;
  - staged diff check;
  - commit/push verification;
  - final clean worktree.
- Backup: C:\Users\Admin\Downloads\ARCTOR_RELATION_CONTROL_MAP_V3_1_FIX1_20260910_140217_BACKUP.zip
- Continuation:
  1. verify the three primary view buttons are gone;
  2. verify clicking a semantic block opens the block workspace;
  3. verify clicking a relation row opens that zone directly;
  4. verify the top colored status counters remain visible;
  5. verify the three-dot menu can still open the legacy detailed graph.