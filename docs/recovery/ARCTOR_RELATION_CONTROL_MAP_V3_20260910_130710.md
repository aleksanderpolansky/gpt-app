# ARCTOR_RELATION_CONTROL_MAP_V3 technical recovery checkpoint

- Timestamp: 2026-09-10T13:08:22.3073860+02:00
- Baseline: 2be80270791cc60ca31ef820182d1a788503df56
- Scope: curator/operator multi-level relationship control map for observation objects.
- Product decisions implemented:
  - default level is Full map / Overview;
  - the operator sees every semantic block at once;
  - red/yellow/green/gray review status remains visible before opening a zone;
  - semantic zones are grouped into Structure, Correspondence and subject, Dependency and support, Influence and conflict, and Other primary branches;
  - three detail levels: Overview, Work, Detailed;
  - Overview and Work use stable block geography around the current ON;
  - opening a semantic block shows all relation zones inside it;
  - opening a relation zone reuses the existing curator review editor;
  - URL deep link for a block uses relationsBlock; existing relationsZone deep links are preserved;
  - global summary counters show unreviewed/model-gap, stale, reviewed and not-applicable zones;
  - detailed mode preserves the previous individual-zone map.
- Database changes: none.
- API changes: none.
- Existing relation/review persistence contract is reused.
- Verification: changed-file ESLint PASS; git diff --check PASS; production build PASS.
- Backup: C:\Users\Admin\Downloads\ARCTOR_RELATION_CONTROL_MAP_V3_20260910_130710_BACKUP.zip
- Continuation:
  1. verify default Overview shows all blocks and all red/yellow alerts;
  2. verify Work level shows per-zone status labels;
  3. verify Detailed restores individual relation zones;
  4. open a block, then a zone, change review status and confirm aggregate counters and block status refresh;
  5. next release may add enterprise assignments/work queues and internal persistent work tabs.