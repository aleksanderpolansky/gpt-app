# ARCTor System Typical Activity Localization Editor Patch V1.3

- Date: 2026-09-24 10:53:48
- Baseline: $ExpectedHead
- Purpose: manual per-locale editing of System Typical Activity title/description by platform owner/admin.
- Fallback: missing localization shows canonical English text.
- Automatic AI translation: not added.
- Data safety: localization edit updates ctivity_templates.default_metadata_json.curatorSystemMaterializationV1.localizations; EN edit also updates canonical title/description. Active profile, parameters, object links and routing are not mutated by the endpoint.
- Visual contract: existing ARCTor corporate palette and the supplied high-fidelity dashboard style (#f5f6fb, #1a1d2e, #3b6ef8, #eef3ff, subtle borders, 16-22px rounded cards, restrained shadows).
- Authorization: equirePlatformAdmin() default owner/admin roles.
- Validation: custom validator, ESLint, TypeScript, git diff check, production build.
- Commit/push/deploy: NOT performed.
- Next browser acceptance: open System Typical Activities in PL/ES, add localization, save, verify locale-specific text; switch back to RU/EN and verify they are unchanged.