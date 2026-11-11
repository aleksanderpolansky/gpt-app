# M-0191 / ARI-04.06.05 — Evidence absence ≠ relation falsity

## Scope: local pure CODE, NOT live integration

Task from the 615-step master plan: «Не объявлять отношение ложным только из-за отсутствия подтверждения».

New module `src/lib/ontology/relationEvidenceAbsenceGuardV1.ts` performs an immutable bounded assessment of evidence/review metadata. It is **not** an alternative relation table, an approval engine, a source-verification service, or a negative-fact generator.

`assessRelationEvidenceAbsenceV1` always keeps `claimTruth=UNDETERMINED`, `negativeInferenceAllowed=false`, `canAssertFalse=false`, `approvesRelation=false`, `verifiesSource=false`, `writesPerformed=0`. Even when the caller reports a verified source or a completed search, the module **does not itself verify the source or truth**.

Distinctions:
- Zero results in a completed scoped lookup are only a scoped absence of rows.
- Missing confirmation/citation is not disproof.
- A traceable citation does not prove a source is valid.
- A rejected proposal is a review decision, not a formal negation.
- `recheck_due` indicates reassessment, not cancellation.
- Explicit denial is a separate claim requiring evidence.
- Counterevidence or `sourceReviewStatus=failed/disputed` needs human review and does not automatically make the relation false.
- `verified`/`active` status is not an epistemic proof.

Inputs must be bounded and internally consistent; invalid inputs yield `BLOCKED_INVALID_INPUT` without any relation writes. The contract does not attempt to change existing relation status enumerations or API routing. Do not invent globally closed-world assumptions. Source validation and later inference need separate approved steps.

## Tests and deployment boundary

Synthetic offline fixtures: 72; independent invariants: 40; regressions M-0187–M-0190. No Supabase, network, Git writes, runtime API wiring, real source validation, or production deployment. `SEC-06=OPEN_BLOCKER`, dynamic runtime negative tests `NOT_EXECUTED`, release `BLOCKED` remain unchanged.

The local installer only proposes three new files: this document, a TS module, and a test; `--dry-run` is read-only; `--apply --owner-approve` requires explicit owner decision. Formal acceptance is a separate action and is not included in this package.
