# ARCTor FEED F1.2 — prepared migration, not yet applied

Date: 2026-10-13. Starting main HEAD: `2a7ce625777ef45187340e07e6cb380f488c7b17`.
F1.1 source lock: 7 checked files. F1.1 database read-only report confirms three Lidl Valencia facts, no direct relations, a public source publication, and the current executor definitions.

## Why

Use `message_object_relations` for **direct confirmed commercial fact leaf links**, using `relation_code = 'commercial_fact_leaf'`. Keep numerical values in `activity_object_facts`. Provenance: `factRefs[]` with fact/event/parameter IDs and representative semantics; never treat public claims as independently checked prices.

## Boundaries

No TS runtime changes, no personal executor changes, no schema/table of free-text tags, no auto-fact enable, no commit/push/deploy by installer. SQL trigger updates are transactional and scoped to public commercial facts with trusted provenance. Data is not fully filterable until F3.

## Gates

1. Run `01_SUPABASE_F1_2_PRECHECK.sql`, require `PASS` and `autoEnabled=false`.
2. Run `02_SUPABASE_F1_2_APPLY.sql`. This installs 3 triggers plus DB sync function and fixes unguarded auto writer privileges.
3. Run `03_SUPABASE_F1_2_BACKFILL_LIDL_VALENCIA.sql` to link 3 previously confirmed facts, no repeated fact writes.
4. Run `04_SUPABASE_F1_2_POSTCHECK.sql`, require `PASS`.
5. Repeat postcheck and record outputs. Commit/push only after separate approval and validation.

## Rollback

Use `05_SUPABASE_F1_2_ROLLBACK.sql`; drops the new triggers/functions and deletes only relations marked `ARCTOR_FEED_FACT_LEAF_LINK_F12_V1`. Original facts/measures and other relation codes remain. Keep direct authenticated access to `arctor_write_commercial_auto_facts_v1` REVOKED for safety.

## F2 / F3 limitations

No dynamic feed filters or UI yet. Range filters must join actual recorded facts (not metadata copies) and constrain multi-item/multi-event matching to the same logical offer. A technical store representative is **not** a verified physical offer address. Future manual/auto writers not using current provenance contracts will not generate derived links until deliberately incorporated.
