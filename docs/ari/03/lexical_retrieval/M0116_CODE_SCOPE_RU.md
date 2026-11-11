# ARCTor M-0116 / ARI-03.04.06 — import of versioned locale-alias dictionary, schema validation and dry-run diff

## Code scope

Updates only `src/lib/ontology-research/localeAliasIndexV1.ts`, adds `scripts/tests/ari03-m0116-versioned-dictionary-dryrun.test.cjs`, a scope document and local acceptance report. All existing exported functions remain available and unchanged. Code is pure and offline, not wired into API or database.

## Contract

- `validateLocaleAliasDictionaryV1(unknown)` validates full, exact schema, semver version, all seven locales and source evidence SHA-256 for every binding, while prohibiting duplicate normalized (locale, phrase, UUID) rows.
- `previewLocaleAliasDictionaryImportV1(current, proposed)` returns ordered `added`, `updated`, `unchanged` and `omitted_requires_review` differences; it does not apply modifications, infer new alias identity or accept approval.
- Omission does **not** revoke an alias: revocation and incremental index update belong to M-0117. Translation collision reports all UUIDs and cannot auto-merge.
- All inputs must already pass authorization checks outside this module. Collision report is only about supplied rows, not the complete catalog.
- No automatic UUID selection, SQL, API mutations, billable calls, commit, push or deploy.

## Acceptance

- New 65 synthetic tests PASS; 523 tests from M-0104..M-0115 PASS; strict TS PASS.
- Before modifying files verify M-0115 receipt, private ledger SHA and code checksums.
- Return result ZIP with manifest, tape results, source and current checkpoint; on failure stop without ledger advancement and create diagnostics.
