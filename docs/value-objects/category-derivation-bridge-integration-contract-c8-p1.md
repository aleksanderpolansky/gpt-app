# P4.10.0-C8-P1 — Category Derivation Bridge Integration Contract

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / bridge category-link integration contract

## 1. Current confirmed state

C8-O is complete and verified.

Confirmed:
- debug route supports Category Derivation behind explicit feature flag
- C8-O2 runtime verification passed
- C8-O3 live DB verification passed
- eventId: 7bf83e7b-02f8-4882-8e7b-419c8843cee2
- derivationRunId: dd0db584-cad7-4925-9e2a-732a0676e174
- activity_category_derivations rows: 5
- extracted slugs: walking, work, commute-to-work, walking-to-work, duration-minutes

Because C8-O2 used categoryDerivationDryRun=true:
- all category_id values are null
- all resolutionStatus values are unresolved
- no contextual_categories rows were created
- value_object_category_links were not expected

## 2. Current bridge behavior from P0 inventory

The bridge already has a value_object_category_links upsert path.

Inventory confirmed:
- valueObjectBridge.ts contains value_object_category_links upsert
- result has valueObjectCategoryLinkId
- result has valueObjectCategoryLinkError
- current bridge extracts contextualCategoryId from mapping metadata
- category-link creation is additive and must not roll back VOI pipeline

Important rule:
- existing bridge creates category links only when mapping metadata contains a valid contextualCategoryId

## 3. Main design decision

C8-P must connect Category Derivation to value_object_category_links as an additive optional layer.

Default bridge behavior must remain unchanged.

If no additional Category Derivation category input is provided, the bridge must behave exactly as before.

## 4. Integration contract

C8-P should introduce optional category-link input:

- additionalCategoryLinks

Suggested item meaning:
- categoryId: resolved contextual_categories id
- categoryTable: contextual_categories
- categoryRole: semantic_component
- source: category_derivation if allowed by DB constraint
- confidence: candidate confidence
- derivationRunId: derivation run id
- activityCategoryDerivationId: optional derivation row id
- candidateSlug: candidate slug
- candidateTitle: candidate title
- semanticLayer: semantic layer
- categoryType: category type
- metadata: additional audit metadata

## 5. Candidate filtering rules

Allowed for value_object_category_links:
- categoryId is valid UUID
- resolutionStatus is resolved_existing, created_suggested, or created_active

Not allowed:
- categoryId is null
- resolutionStatus is unresolved
- categoryDerivationDryRun=true
- candidate is rejected
- candidate needs user review and has no confirmed categoryId

Therefore C8-O3 dryRun behavior must continue to create no value_object_category_links.

## 6. Target object rule

Initial C8-P scope:
- debug free-text route only
- attach resolved category candidates only to Value Objects produced by the same bridge execution
- use valueObjectId values returned by bridge result

Do not apply Category Derivation category links globally.
Do not retroactively update old Value Objects in C8-P.

## 7. Duplicate prevention

value_object_category_links already has a unique constraint.

C8-P must use idempotent upsert.

Expected uniqueness meaning:
- value_object_id
- category_table
- category_id
- category_role

If the same category is linked again to the same Value Object with the same role, update existing row instead of creating duplicate.

## 8. Category table and role

Initial values:
- category_table: contextual_categories
- category_role: semantic_component

Reason:
- Category Derivation candidates are semantic components of the derived Value Object
- role mapping by semanticLayer can be added later
- first integration should minimize constraint risk

## 9. Source and metadata

Preferred source:
- category_derivation

Before TypeScript changes, verify whether this source is allowed by the live DB constraint.

If not allowed:
- use an existing allowed source
- store category_derivation in metadata_json.sourceLayer

Required metadata_json fields:
- sourceLayer: category_derivation
- derivationRunId
- activityEventId
- candidateSlug
- candidateTitle
- semanticLayer
- categoryType
- resolutionStatus
- confidence
- p4Step: P4.10.0-C8-P

## 10. Error handling rule

Category-link creation must remain additive.

If Category Derivation category-link creation fails:
- do not roll back activity_event
- do not roll back value_object_instance
- do not roll back activity_event_value_object_link
- report warning/error in response
- write processing log if available

## 11. Debug route behavior after C8-P

No flag:
- old behavior remains unchanged
- no derivation extraction
- no derivation persistence
- no derivation category links

Flag + dryRun=true:
- extraction runs
- persistence creates derivation rows
- no Category Derivation value_object_category_links are created

Flag + dryRun=false:
- extraction runs
- resolver may reuse or create contextual_categories
- persistence stores category_id values
- bridge may create value_object_category_links only for resolved candidates

## 12. Verification plan

P2 — live schema constraint check:
- inspect category_role constraint
- inspect source constraint
- inspect unique constraint
- inspect metadata_json constraints

P3 — code integration:
- add optional category-link input
- no default behavior change

P4 — no-flag regression:
- old behavior works

P5 — dryRun regression:
- derivation rows created
- category_id null
- no Category Derivation category links

P6 — non-dryRun controlled test:
- contextual_categories reused or created
- activity_category_derivations contain category_id
- value_object_category_links created for resolved candidates
- repeated run does not create duplicates

## 13. Explicit non-goals for C8-P

C8-P must not:
- redesign value_object_category_links
- redesign mapper
- redesign Value Object Bridge
- make Category Derivation mandatory
- create links from unresolved candidates
- create links during dryRun
- infer parent/child hierarchy
- create multiple relation types beyond existing category link semantics

## 14. Conclusion

C8-P should be additive, optional, and debug-route-first.

Safe path:
1. inspect live value_object_category_links constraints
2. add optional additionalCategoryLinks contract
3. pass only resolved Category Derivation candidates
4. upsert links idempotently
5. keep old bridge behavior unchanged when optional input is absent
6. verify no-flag, dryRun, and non-dryRun cases separately

## 15. Next step

Proceed to P4.10.0-C8-P2:
- create live SQL inspection for value_object_category_links constraints
- verify allowed category_role values
- verify allowed source values
- verify unique constraint fields
- only then modify TypeScript code
