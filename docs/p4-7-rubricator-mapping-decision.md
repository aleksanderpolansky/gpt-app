# P4.7.2-R Rubricator -> Value Object Mapping Decision

Date: 2026-05-15  
Status: decision document created after P4.7.1-R rubricator inventory.

## 1. Why this decision exists

P4.7 originally created the Value Object State Foundation:

- value_object_instances
- activity_event_value_object_instance_links
- value_object_state_deltas
- value_object_state_snapshots
- value_object_daily_aggregates
- lib/activity/valueObjectBridge.ts

After integrating General Plan v4.1-R, the pipeline must not be interpreted as direct Activity Event -> Value Object only.

The correct architecture is:

Activity Event -> Object-Action Rubricator -> Value Object / VOI -> State Delta / Aggregates.

Therefore, valueObjectBridge.ts remains a low-level bridge helper, but a higher-level mapping helper must convert Object-Action classification into ValueObjectBridgeMapping[].

## 2. Inventory result used for decision

Existing rubricator backbone in Supabase:

- object_classes
- object_types
- action_types
- contexts
- object_action_affordances
- contextual_categories
- entity_classifications
- object_action_suggestion_requests

Missing but not blocking:

- object_action_aliases
- object_action_translations
- object_action_suggestion_items

Missing tables are treated as future localization / alias / moderation expansion backlog.

## 3. Canonical separation of layers

### 3.1 Activity Event

Activity Event is factual source of truth.

It stores:

- who acted
- when it happened
- source
- status
- duration
- title / description
- template/type compatibility fields

Activity Event must not directly own value semantics.

### 3.2 Object-Action Rubricator

Rubricator classifies meaning.

Canonical formula:

Object Type + Action Type + Context -> Contextual Category / Entity Classification

Rubricator is not a tag system.

Rubricator is not a Value Object.

Rubricator is the classification backbone that decides what semantic interpretation can be attached to an entity.

### 3.3 Value Object

Value Object is the unit of value/function/state.

It may be:

- personal goal
- skill
- process
- service
- product
- right
- certificate-like promise
- household process
- health process
- commercial enterprise object

Value Object is not an Offer.

Value Object is not a category.

Category/classification helps identify or create the correct Value Object candidate.

### 3.4 Value Object Instance

Value Object Instance is the concrete execution of a Value Object in an event, purchase, booking, task or service.

One Activity Event can create or link multiple VOI records.

### 3.5 State Delta / Aggregates / Snapshots

State Delta and aggregates are derived data.

They are created after:

- event is completed/confirmed;
- classification is available;
- mapping to Value Object is known.

No VOI/state_delta should be created for imported_pending events before confirm.

## 4. Mapping decision

### 4.1 Current MVP decision

For P4.7-R MVP, do not add new category_profile_json column yet.

Reason:

- value_objects currently exists and is already used by offers;
- offers.value_object_id already exists;
- P4.7.4 additive VO/state migration has already been applied;
- adding more schema now is unnecessary before controlled mapping is proven.

Therefore, for MVP:

- entity_classifications / contextual_categories remain canonical classification records;
- value_objects remains canonical value/state object table;
- mapping from classification to Value Object happens in helper logic;
- created VOI/state rows may store compact mapping metadata in metadata_json;
- no direct rewrite of commercial core.

### 4.2 Future optional decision

Later, value_objects may receive additive fields:

- category_profile_json
- root_domain
- parent_value_object_id
- visibility
- state_profile_schema_json

But this is not required for P4.7.2-R.

### 4.3 No duplicate mapping layer rule

Do not create an independent table or hardcoded system that competes with Object-Action Rubricator.

Allowed:

- helper reads rubricator classification and produces ValueObjectBridgeMapping[];
- controlled test mapping for one template/classification;
- metadata_json stores source/confidence/debug context;
- safe no-op if no classification or no valueObjectId mapping is found.

Not allowed:

- direct global Activity Template -> Value Object bridge that ignores rubricator;
- AI-created public categories without moderation;
- automatic VOI/state generation before imported_pending confirmation;
- commercial core rewrite.

## 5. Planned helper architecture

### 5.1 Existing low-level helper

File:

lib/activity/valueObjectBridge.ts

Responsibility:

- create value_object_instances;
- create activity_event_value_object_instance_links;
- create value_object_state_deltas;
- upsert value_object_daily_aggregates;
- upsert value_object_state_snapshots.

Input:

ValueObjectBridgeMapping[]

This helper does not decide classification.

### 5.2 New higher-level helper

Planned file:

lib/activity/rubricatorValueObjectMapper.ts

Responsibility:

- read event/template/type context;
- read existing entity_classifications/contextual_categories if available;
- resolve controlled Object-Action classification;
- map it to one or more ValueObjectBridgeMapping objects;
- return safe skipped reason if no mapping is available.

Planned output type:

RubricatorValueObjectMappingResult

Fields:

- ok
- skipped
- skipReason
- eventId
- classificationSummary
- mappings

### 5.3 Initial controlled mapping

Controlled mapping target:

German marketing handwriting practice

Expected classification idea:

- object: German language / business German / writing practice
- action: practice / learn / write
- context: learning / career / B2B communication
- Value Object: business German writing practice
- metric: duration_minutes
- unit: minutes
- delta: event duration

This must be implemented as a narrow controlled rule first, not as a global ontology.

## 6. Runtime pipeline after this decision

### Confirmed imported event path

Raw signal
-> imported_pending Activity Event
-> review/edit/audit
-> confirm
-> completed Activity Event
-> existing ImpactProcessor compatibility layer
-> RubricatorValueObjectMapper
-> ValueObjectBridgeMapping[]
-> processValueObjectBridgeForActivityEvent
-> VOI / link / state_delta / aggregate / snapshot

### Direct completed manual event path

Manual completed Activity Event
-> existing Activity Impact Layer
-> future controlled rubricator mapper
-> VOI/state bridge if mapping is available

## 7. Safety rules

- No VOI/state_delta for imported_pending.
- No automatic public category creation.
- No AI-first classification.
- No commercial core rewrite.
- No balance/points ledger mutation.
- No full UX in this step.
- No status architecture refactor as blocker.
- If mapping is missing, helper returns safe no-op with skipReason.

## 8. Decision table

| Question | Decision |
|---|---|
| Is Object-Action Rubricator canonical for classification? | Yes |
| Is Value Object canonical for value/state? | Yes |
| Is category equal to Value Object? | No |
| Is tag equal to category? | No |
| Can Activity Event directly create state without classification? | No for production path |
| Can low-level debug/test use direct valueObjectId? | Only temporarily, but prefer controlled rubricator mapping |
| Should category_profile_json be added now? | No, defer |
| What is the next helper? | lib/activity/rubricatorValueObjectMapper.ts |
| What should it output? | ValueObjectBridgeMapping[] |
| What happens if mapping is missing? | Safe no-op with skipReason |

## 9. Next step

P4.7.3-R / P4.7.6-R preparation:

Create rubricatorValueObjectMapper helper.

The first version should not connect to confirm route yet.

It should expose a controlled function that can later be called by a debug endpoint or confirm route:

resolveValueObjectMappingsFromRubricatorForActivityEvent(...)

Then perform controlled smoke on one known completed event.

