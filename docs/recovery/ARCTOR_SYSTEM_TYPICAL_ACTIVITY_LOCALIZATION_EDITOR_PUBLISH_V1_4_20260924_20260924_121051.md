# ARCTor System Typical Activity Localization Editor - Publish V1.4

Date: 2026-09-24 12:12:45
Baseline: a3d64642729ed038d57d3c999dbf939437e3083b
Source patch: ARCTOR_SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_EDITOR_PATCH_V1_4_20260924
Patch checkpoint: docs/recovery/ARCTOR_SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_EDITOR_PATCH_V1_4_20260924_20260924_105047.md

Scope:
- manual admin editing of System Typical Activity localization for the selected locale;
- English fallback when selected locale is missing;
- no automatic AI translation;
- localization-only DB write in activity_templates.default_metadata_json;
- canonical title/description changed only when locale=en;
- no profile, parameter, routing or OpenAI mutation;
- ARCTor corporate visual style.

Verification before commit:
- target SHA256 exact;
- validator PASS_16_16;
- ESLint via node + local eslint.js;
- TypeScript via node + local tsc.js;
- git diff --check;
- Next production build via node + local next binary (mandatory).

Publish:
- exact scoped staging;
- commit to local main;
- push origin main;
- remote SHA verification.