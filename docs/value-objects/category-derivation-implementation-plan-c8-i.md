# P4.10.0-C8-I — Implementation Plan for Category Derivation Extractor v1

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / rule-based extractor / resolver integration

## 1. Current confirmed state

- C8-G live SQL migration was applied in Supabase SQL Editor.
- C8-G2 verification confirmed missing_columns = [] and missing_tables = [].
- C8-H1.2 documented that global lint currently has pre-existing lint debt.
- C8-H2 targeted runtime regression passed.
- Existing C7 free-text route still creates activity_event, Value Object projection rows, state delta, aggregate, snapshot, usage aggregate and processing logs.
- valueObjectCategoryLinkId is still null, which is expected before runtime Category Derivation implementation.

## 2. Main goal of C8-I+

Implement a general Category Derivation Layer v1 instead of one-off category seeding.

Target runtime path:

free text / app action
-> raw activity_event
-> category_derivation_run
-> rule-based extractor
-> categoryCandidates[]
-> resolver slug to category_id
-> activity_category_derivations
-> Value Object Bridge
-> value_object_category_links
-> activity_event_value_object_links / aggregates / snapshots / logs

## 3. Do not do in this block

- Do not fix all global lint debt inside Category Derivation implementation.
- Do not make AI the owner of ontology.
- Do not introduce typed relation edges now.
- Do not redesign commercial core, purchase confirmations, points or certificates.
- Do not break the C7 debug route.
- Do not make walking-to-work a special one-off solution.

## 4. Proposed implementation files

Likely new files:

- lib/activity/categoryDerivation/types.ts
- lib/activity/categoryDerivation/ruleExtractor.ts
- lib/activity/categoryDerivation/resolver.ts
- lib/activity/categoryDerivation/persistDerivations.ts
- lib/activity/categoryDerivation/index.ts

Likely existing files to inspect or modify:

- lib/activity/rubricatorValueObjectMapper.ts
- lib/activity/valueObjectBridge.ts
- src/app/api/activity/debug/free-text-value-object-test/route.ts
- Supabase server/client helper files used by existing activity pipeline

## 5. Core contracts

CategoryCandidate fields:

- slug
- title
- semanticLayer
- categoryType
- confidence
- source
- isRequired
- isConfirmed
- needsUserReview
- metadata

ResolvedCategoryCandidate adds:

- categoryId
- resolutionStatus

Allowed resolutionStatus values:

- resolved_existing
- created_suggested
- created_active
- unresolved

## 6. Rule extractor v1 target cases

Initial deterministic rules:

1. walked to work for 15 minutes
2. гулял с собакой 20 минут
3. учил математику с ребёнком 30 минут
4. ребёнок учил математику рядом со мной 30 минут
5. смотрел фильм с ребёнком
6. смотрел английский мультфильм с ребёнком и обсуждал слова
7. писал коммерческое предложение клиенту

Mandatory semantic example:

учил математику с ребёнком 30 минут must produce not only math + child + learning + family, but also role/care/responsibility categories such as childcare, parental care or caregiving.

## 7. Resolver policy

Resolver must:

- normalize slugs
- search contextual_categories by slug and semantic_layer where possible
- reuse existing categories
- create missing rule-derived categories only under controlled policy
- mark uncertain categories as suggested or needs_review
- preserve source, confidence and evidence metadata

## 8. Persistence policy

For each processed event:

- create one category_derivation_runs row
- store extractor input/output JSON
- create activity_category_derivations rows for all candidates
- store resolved category_id when available
- preserve unresolved candidates for review
- do not delete raw activity_event data

## 9. Bridge integration policy

Bridge must eventually receive resolved categories from Category Derivation.

For each created or reused Value Object, bridge should create value_object_category_links when resolved category ids exist.

Do not remove existing contextualCategoryId logic before replacement is proven.

## 10. Implementation sequence

C8-J: exact code inventory of mapper, bridge and debug route.
C8-K: add Category Derivation types only.
C8-L: add ruleExtractor.ts with pure deterministic function and unit-like debug script/check.
C8-M: add resolver.ts with Supabase lookup/create policy.
C8-N: add persistDerivations.ts for category_derivation_runs and activity_category_derivations.
C8-O: integrate derivation into debug free-text route behind explicit feature flag.
C8-P: extend bridge/link logic to create value_object_category_links from resolved candidates.
C8-Q: runtime verification for walked-to-work.
C8-R: runtime verification for child/math/care-role examples.
C8-S: document final C8 implementation state.

## 11. Definition of Done for first working runtime layer

A free-text debug event should produce:

- activity_event
- category_derivation_runs row
- activity_category_derivations rows
- resolved contextual_categories
- Value Object projection rows
- activity_event_value_object_links
- value_object_category_links
- processing logs
- existing aggregates/snapshots still working

## 12. Next immediate step

Proceed to C8-J: exact code inventory of mapper, bridge, debug route and Supabase helper surface before changing runtime code.
