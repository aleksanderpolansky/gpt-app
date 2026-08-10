# P5 Instruction & Methodology Platform v1 — Current vs Target Contract

Contract version: `p5a_v1`
Baseline commit: `92bb443b00fd234dc1a448a55ac4883b278d3d34`

## 1. Scope lock

P5 does not replace P4A/P4B. It turns the existing instruction lifecycle into one layer of a broader
versioned methodology stack.

The production stack is:

1. **Core protocol — Git/code**
   - non-negotiable analytical invariants;
   - versioned and code-reviewed;
   - not editable from the prompt-admin page.
2. **Structured schemas — Git/JSON Schema**
   - exact model output shapes;
   - versioned and testable;
   - schema validity does not imply factual truth.
3. **Registries and deterministic rules — Git source + Supabase projection**
   - existing relation/facet/kind/parameter/impact/calendar and later question/aggregation registries;
   - AI may select allowed rules; deterministic code executes formulas.
4. **Knowledge base — versioned source packages**
   - research, reference catalogues, expert material and explanations;
   - evidence/candidate support only; never sole source of a critical production rule.
5. **Runtime context — server assembler**
   - effective P4B instructions, actor preferences, Goal World context, timezone, permissions,
     relevant deterministic rules and source packages;
   - only the minimum relevant context for the call.

## 2. Current state found by the P5 intake

- P4A/P4B already provide versioned administrator instructions:
  `ai_processing_instruction_sets` + immutable revisions.
- P4A/P4B already provide actor-scoped personal instructions:
  `actor_ai_processing_preferences` + immutable revisions.
- Calendar-specific personal rules already have their own revision lifecycle.
- `activity_ai_processing_provenance` already stores instruction/source/assumption snapshots,
  but currently has no protocol/schema/rule-version trace.
- `impact_rules`, ontology registries and calendar rule stores already exist and must be reused.
- There is no formal Git protocol registry with version/hash projection in Supabase.
- There is no formal JSON Schema repository for the current model outputs.
- There is no runtime methodology binding saying which protocol/schema belongs to a runtime.
- There is no versioned knowledge/model-package registry yet.
- The current activity preview still asks for a JSON shape inside the prompt and uses JSON-object mode;
  P5B will migrate it to the formal schema after runtime acceptance.

## 3. P5A — this slice

P5A creates the immutable methodology foundation only:

- `ARCTOR_AI_RUNTIME_CORE_PROTOCOL_V1.md`
- formal JSON Schemas:
  - `navigator_chat_output@1`
  - `activity_semantic_preview_model_output@1`
  - `ai_methodology_trace@1`
- machine-readable Git registry and runtime bindings;
- read-only Supabase projection tables;
- current binding pointers for the two existing runtimes;
- ten methodology acceptance examples.

P5A deliberately does **not** modify the existing AI calls yet.

## 4. Runtime bindings v1

### navigator_chat

- protocol: `arctor_ai_runtime_core@1`
- output schema: `navigator_chat_output@1`
- trace schema: `ai_methodology_trace@1`
- editable instruction store: `ai_processing_instruction_sets`
- personal context store: `actor_ai_processing_preferences`
- deterministic registries currently consumed: none
- knowledge packages currently consumed: none

### activity_semantic_preview

- protocol: `arctor_ai_runtime_core@1`
- output schema: `activity_semantic_preview_model_output@1`
- trace schema: `ai_methodology_trace@1`
- editable instruction store: `ai_processing_instruction_sets`
- personal context store: `actor_ai_processing_preferences`
- deterministic registries currently consumed: `calendar_ai_rule_preferences`
- knowledge packages currently consumed: none

The binding lists only registries actually used by the runtime today. It must not pretend that `impact_rules`,
external catalogues or a knowledge base are active when they are not yet supplied to that call.

## 5. Source hashes

- core protocol SHA256: `CA86813D3493DF764AEC0C95070B282F3964303EA59AB600BDBA0A26F83B5163`
- navigator schema SHA256: `AE0DD9E042FF3F2617785F45556BC553EB239FB53B9FE620ADE7C440EAED10EF`
- activity preview schema SHA256: `427F9CE0B52BF526FB876F327B70A4BAC7638EE6F44F753A499CE1C6F454435F`
- methodology trace schema SHA256: `CE3650CF86B3879E2B68CD139C4C736D277AFEC82FB42A1F5B7C7DB5BAF35328`

The database projection stores these hashes, not editable copies of the critical protocol/schema content.

## 6. Governance / access matrix

| Layer | Source of truth | Runtime | Administrator | User |
|---|---|---|---|---|
| Core protocol | Git/code | read active binding | view version/hash/diff; change only by release | see human explanation |
| JSON Schema | Git | enforce output contract | view version/hash/tests | indirect via result card |
| Deterministic registries | Git + Supabase projection | read relevant subset | governed activation/versioning | see rule explanation |
| Editable system instructions | existing P4B DB lifecycle | read effective locale/global version | edit + revision history | no system edit |
| Personal rules | existing P4B actor lifecycle | read actor/locale/global fallback | privacy diagnostics only | edit own actor rules |
| Knowledge packages | later P5 slice | relevant retrieval only | manage source packages | see citations/explanation |
| Runtime context | server assembler | minimum required data | privacy diagnostics | own data/corrections |

`service_role` gets SELECT-only access to the new P5A projection tables. Browser roles receive no direct table access.

## 7. Version lifecycle

- A protocol/schema meaning change creates a **new version**, never an in-place rewrite.
- Git is authoritative for protocol/schema bytes.
- Supabase stores code/version/path/SHA metadata and runtime binding projection.
- Runtime current pointers identify which binding version is active.
- Old versions remain addressable for replay and explanation.
- Editable P4B instructions keep their existing independent revision numbers.
- Deterministic rule versions are referenced from their own registries; P5 does not create duplicate rule stores.

## 8. What P5B must do next

1. Build a server-side methodology/context assembler that combines:
   core binding + formal schema + effective P4B system instructions + actor rule + relevant deterministic rules.
2. Add a public-safe `methodologyTrace` to both existing AI results.
3. Extend existing processing provenance instead of inventing a second activity provenance store.
4. Switch model-backed activity preview from prompt-described JSON shape to the formal schema/validator.
5. Persist protocol/schema/rule references for stored analyses.
6. Add runtime acceptance proving that changing an editable instruction does not change protocol/schema identity.

## 9. What remains after P5B

- versioned knowledge/model-package registry and retrieval policy;
- admin read-only methodology/version viewer and user-visible explanation;
- final P5 access/runtime/replay acceptance.

P5 is closed only when a material AI result can identify the protocol/schema/instruction/rule/source versions
that produced it and critical behavior does not depend on retrieved prose.
