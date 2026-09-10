# ARCTOR_RELATION_CONTROL_MAP_V3_1_INTERACTION_HOTFIX_V1 technical recovery checkpoint

- Timestamp: 2026-09-10T14:16:21.1500691+02:00
- Baseline: 5c626f8aef768492bfb8852ead2a7554804b0a00
- Symptom: the V3.1 full map rendered correctly but semantic blocks and relation rows did not react to mouse clicks.
- Root cause:
  - normal full-map block nodes are explicitly non-draggable;
  - React Flow also had elementsSelectable=false;
  - with no ReactFlow-level onNodeClick handler, the library can disable pointer events on the node wrapper;
  - nested custom buttons and the block root therefore appeared interactive but could not receive mouse clicks.
- Fix:
  - add a harmless ReactFlow onNodeClick handler;
  - this keeps pointer events enabled on node wrappers;
  - existing BlockNode onClick opens the block;
  - relation-row buttons keep stopPropagation() and open the specific zone directly;
  - nodes remain non-draggable in the full working map;
  - canvas pan/zoom remains unchanged.
- Database changes: none.
- API changes: none.
- UI structure changes: none.
- Verification:
  - exact baseline and map blob;
  - patch first applied to temporary copy;
  - changed-file ESLint PASS;
  - git diff --check PASS;
  - production build PASS;
  - staged diff check PASS.
- Backup: C:\Users\Admin\Downloads\ARCTOR_RELATION_CONTROL_MAP_V3_1_INTERACTION_HOTFIX_V1_20260910_141457_BACKUP.zip
- Continuation:
  1. click empty area of a semantic block -> block workspace must open;
  2. click a relation row -> that exact relation zone must open directly;
  3. verify canvas still pans/zooms and full-map blocks do not drag.