# ARCTOR_RELATION_PREVIEW_REVIEW_STATUS_HOTFIX_V1 technical recovery checkpoint

- Timestamp: 2026-09-10T12:40:39.8674979+02:00
- Baseline: 00de6fdfe3727e6df0de49b80364a9aec31b7a2d
- Scope: restore curator review availability for global system observation objects.
- Root cause: the detail page passed canManageRelations={!isGlobalSystemObject}, which disabled relationship-coverage loading for global system ONs even for platform admins.
- Change:
  - global system ONs enable relation review only when requirePlatformAdmin() succeeds;
  - ordinary actor-owned ON behavior remains unchanged;
  - preview semantic/cross-plane zones can now receive coverage review state and display red/green/yellow/gray status markers before expansion.
- Database DDL: none.
- Verification: changed-file ESLint PASS; git diff --check PASS; production build PASS.
- Backup: C:\Users\Admin\Downloads\ARCTOR_RELATION_PREVIEW_REVIEW_STATUS_HOTFIX_V1_20260910_123821_BACKUP.zip
- Continuation: verify production preview shows red UNREVIEWED marker on unchecked semantic/cross-plane zones and embedded curator controls after zone expansion.