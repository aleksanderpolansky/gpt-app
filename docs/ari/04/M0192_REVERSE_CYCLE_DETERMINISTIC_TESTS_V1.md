# M-0192 / ARI-04.06.06 — deterministic regression for reverse orientations and cycles

**Master task:** «Написать deterministic tests для обратных направлений и циклов».

## Scope of accepted CODE

This step adds an **offline test suite**, a frozen 72-case gold corpus, and this document. It does **not** change the code or behavior of the previously accepted M-0187–M-0191 modules; no API, Supabase or production integration.

### Cases

1. `DIRECT_REVERSE_NOT_DUPLICATE` (12): `A→B` is not automatically the same as `B→A` for directed types, including `depends_on`, `supports`, `influences`, `classified_as`.
2. `REVERSE_ALIAS_CANONICAL` (12): registry-declared alias `prerequisite_for(A,B)` maps to canonical `depends_on(B,A)`; no inferred aliases.
3. `SYMMETRIC_REVERSE_DUPLICATE` (12): reverse duplicates are detected only for explicitly symmetric registered types.
4. `TWO_EDGE_CYCLE` (12): strict `BLOCK` only for a declared acyclic type when the closing path is established, not merely proposed.
5. `THREE_EDGE_CYCLE` (12): deterministic witness path A→B→C→A, with same reviewed vs blocking distinction.
6. `GUARD_NO_FALSE_BLOCK` (12): incomplete path, mismatching context, rejected/inactive/denied edge, no temporal overlap, partial temporal interval, pairwise overlap without shared interval, missing policy, proposed-only edges.

Additionally, **40 independent invariants** exercise deterministic output order, bounded cycle paths, absence of false strictness for proposed edges, non-cycle directed types, and `writesPerformed=0`, `approvesRelation=false`, `verifiesSource=false`.

## Non-claims

- A test PASS is not proof of correctness for all production data.
- A cycle under missing context or uncertain time is a review signal, **not** an automatically verified contradiction.
- An orientation normalized to the same edge is a candidate duplicate, **not** proof that the source is true.
- These tests do not carry out approval, promote, live DB writes, runtime negative tests or deploy.

## Local run

`node scripts/ari/ontologyReverseDirectionCycleDeterministicV1.test.mjs`

Separate installer checks frozen evidence, accepted source SHA-256, private checkpoint, M-0191 predecessor and SEC-06. Installation creates **three new files only**, with no overwrite and no ledger update. Formal acceptance requires an independent next package.

## Security gate

`SEC-06 = OPEN_BLOCKER`, dynamic negative runtime `NOT_EXECUTED`, release gate `BLOCKED`.
