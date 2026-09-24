# ARCTor A02b explicit sourceValueBindingsV1 - local patch checkpoint

- Date: 2026-09-24 16:09:19
- Baseline: 5d36945e7124d5646ae28dac8d6451028bf0f667
- Scope: curator/system typical-activity materialization.
- Change: persist exact parameterDefinitionId -> valueObjectId pairs into active profile metadata_json.sourceValueBindingsV1.
- Direct admin authoring remains compatible and may enrich the same pair records with sourceResolution.
- Existing sourceValueBindingsV1 is preserved when its core pair set matches.
- Conflicting or malformed existing bindings fail closed.
- Curator idempotent replay backfills missing explicit bindings.
- Runtime continues to prefer sourceValueBindingsV1; legacy unique-assignment fallback remains for old profiles.
- Commit/push/deploy: not performed.