# P4.10.0-C8-D — Category Derivation Layer v1 Design

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Value Objects / Category Derivation / Semantic Capital
Status: design checkpoint before schema/code implementation

## 1. Current confirmed state

The free-text runtime pipeline is already verified.

Confirmed test phrase: walked to work for 15 minutes.

Confirmed result: completed activity_event without template, Value Object Walking to work, Value Object instance, event link, usage aggregate, state delta, daily aggregate, snapshot and processing log.

Last confirmed commit before this design checkpoint: c8e004d Document free-text value object runtime verification.

## 2. Diagnosed gap

The free-text runtime pipeline creates the event and Value Object projection rows, but it does not create value_object_category_links.

Reason: mapping.metadata.classification is null, valueObjectBridge requires a resolved contextual category id, contextual_categories.slug = walking-to-work does not exist, and free-text fallback does not yet pass resolved category candidates into the bridge.

This is not a one-category problem. It is an architectural gap.

## 3. Decision

Do not fix this by seeding only one category such as walking-to-work.

Implement a general Category Derivation Layer v1.

Pipeline: free text / app action -> raw Activity Event -> Category Derivation Run -> rule-based extractor -> optional structured AI classifier -> categoryCandidates[] -> resolver slug to category_id -> activity_category_derivations -> Value Object Bridge -> value_object_category_links -> activity_event_value_object_links -> aggregates / snapshots.

## 4. Core principle

Activity Event is the source of truth.

Rules and AI outputs do not replace the raw event. They create versioned semantic interpretations.

The system must preserve raw input text, actor context, time and duration, derivation run version, rule version, optional model and prompt version, category candidates, resolved categories, final accepted semantic interpretation, user corrections and confirmations.

## 5. Required semantic layers

Category derivation must not be limited to action/object/context.

Required v1 layers: action, object/domain, participant, relationship_context, role, duty/responsibility, care_function, purpose/activity_meaning, metric.

Examples: walk, teach, help, mathematics, film, dog, child, client, family, work, parent, caregiver, family duty, work duty, childcare, parental care, helping child learn, passive rest, duration_minutes, distance_km.

## 6. Mandatory example: studying mathematics with a child

The phrase "учил математику с ребёнком 30 минут" must not be reduced to math + child + learning + family.

Required semantic bundle: action teach/help, knowledge_domain mathematics, participant child, relationship_context family, role parent/caregiver, care_function childcare/parental care, responsibility caregiving, activity_meaning helping-child-learn, metric duration_minutes.

Reason: learning + math + child does not explain the user role. The platform must understand that the user is performing a care/responsibility function.

## 7. Rule-based extractor v1 target cases

Target cases: walked to work for 15 minutes; walking dog; studied mathematics; studied mathematics with child; child studied nearby; watched film with child; watched English cartoon with child and discussed words; wrote commercial proposal to client.

The rule engine should return structured categoryCandidates[], not only a title for a Value Object.

## 8. categoryCandidates[] contract

Initial fields: slug, title, semanticLayer, categoryType, confidence, source, isRequired, isConfirmed, needsUserReview, metadata.

The bridge must eventually receive either resolved categoryId or enough candidate data for a resolver to create or resolve the category before bridge execution.

## 9. Resolver responsibility

The resolver must receive category candidates, normalize slugs and aliases, search contextual_categories, reuse existing categories, create missing categories only under controlled policy, mark new categories as suggested or needs_review where appropriate, return resolved category ids, and preserve confidence/source/run metadata.

## 10. New derivation rows

Implementation should add or confirm additive schema for category_derivation_runs, activity_category_derivations, optional activity_semantic_interpretations, and semantic fields on contextual_categories if missing: semantic_layer, category_type, aliases, status, source_type.

## 11. Bridge responsibility

After category candidates are resolved, the bridge must create Value Objects, Value Object instances, activity_event_value_object_links, value_object_category_links, usage aggregates, daily aggregates, snapshots and processing logs.

For free-text events, value_object_category_links must no longer remain empty when semantic category candidates are available.

## 12. AI policy

AI is not the source of truth. AI may be used as a controlled structured classifier only when rule confidence is low, the phrase is ambiguous, the system needs candidate categories, and feature flag allows it.

AI must return strict JSON. AI must not freely invent uncontrolled ontology.

## 13. Confidence policy

Confidence >= 0.85: apply automatically as derived category.
Confidence 0.55-0.84: apply cautiously or mark for review.
Confidence < 0.55: store as candidate/possible meaning, do not make canonical automatically.

Care/responsibility categories require special caution when not obvious.

## 14. Verification suite after implementation

Runtime verification must check: walked to work for 15 minutes; гулял с собакой 20 минут; учил математику с ребёнком 30 минут; ребёнок учил математику рядом со мной 30 минут; смотрел фильм с ребёнком; смотрел английский мультфильм с ребёнком и обсуждал слова; писал коммерческое предложение клиенту.

Expected rows: activity_event, category_derivation_run, activity_category_derivations, value_objects, value_object_category_links, activity_event_value_object_links, usage aggregates, daily aggregates, snapshots and processing logs.

## 15. Anti-errors

Do not seed only walking-to-work as the whole solution.
Do not start UI/UX before backend/data structure checkpoint.
Do not introduce typed relation edges now.
Do not make AI the owner of ontology.
Do not delete commercial currency fields before D4 RPC check.
Do not break the verified C7 free-text pipeline.
Do not repeat rollback for Learning -> Business German writing practice.
Do not insert SQL into PowerShell.

## 16. Next step after this document

Proceed to P4.10.0-C8-E — exact inventory of current schema and implementation surface.

Inventory targets: contextual_categories, entity_classifications, value_object_category_links, activity_event_value_object_links, processing logs, mapper contracts, bridge contracts, free-text fallback metadata, existing migrations touching contextual categories and VO links.

Definition of Done for C8-E: clear list of existing tables/fields, clear list of missing additive schema, no runtime code changed yet, implementation plan ready for C8-F.
