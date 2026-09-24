# ARCTor A02c - Missing Value Supplement - Publish V1.2

Date: 2026-09-24 14:15:13
Baseline: 505a2517ce1ad35a7dcd1a35160e4bbf2d8dc047
Source patch: ARCTOR_A02C_MISSING_VALUE_SUPPLEMENT_PATCH_V1_20260924
Patch checkpoint: docs/recovery/ARCTOR_A02C_MISSING_VALUE_SUPPLEMENT_PATCH_V1_20260924_20260924_130521.md

Scope:
- allow a user to enter a value only for a currently missing declared bundle pair after known source facts already exist;
- append one source fact through attach_global_observation_facts_gsr1_v1;
- preserve existing facts;
- pair-scoped idempotency;
- no zero substitution;
- server-side revalidation of profile pair, routing, system assignment and active leaf target;
- corporate ARCTor UI and seven localized copies.

Verification before commit:
- exact working patch regenerated from baseline using the original A02c patcher and matched byte-for-byte for all five code files;
- validator PASS_16_16;
- ESLint PASS;
- TypeScript PASS;
- git diff --check PASS;
- text hygiene PASS;
- mandatory Next production build PASS.

Publish:
- exact scoped staging only;
- commit to local main;
- push origin main;
- remote SHA verification;
- browser/runtime acceptance remains pending after deployment.