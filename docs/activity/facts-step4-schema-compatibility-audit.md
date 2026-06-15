# GPT-APP / AI-NAVIGATOR — FACTS STEP 4/12

## Schema Compatibility Audit

Version: FACTS_STEP4_SCHEMA_COMPATIBILITY_AUDIT_V1_20260615  
Status: read-only audit document  
Scope: compatibility between FACTS STEP 3 SQL draft and existing project schema/source  
Non-scope: SQL execution, Supabase write, OpenAI call, commit, push

---

## 1. Purpose

This audit exists because the Step 3 SQL draft must not be converted into a real migration until the existing project schema is checked.

The project already contains an ctivity_events layer, activity APIs, semantic persistence routes, Value Object routes and a recently implemented parent_value_object_id hierarchy. A direct migration without compatibility audit may break ownership, RLS, FK targets or existing event flow.

---

## 2. Evidence summary

| Signal | Count |
|---|---:|
| ctivity_events hits | 593 |
| ctivity_event_measures hits | 32 |
| ctivity_object_facts hits | 39 |
| ctivity_fact_review_items hits | 25 |
| ctivity_fact_recalculation_queue hits | 26 |
| uth.uid() hits | 80 |
| ppUser hits | 3144 |
| ctor_id hits | 581 |
| alue_objects hits | 851 |
| parent_value_object_id hits | 440 |
| grant select hits | 55 |
| enable row level security hits | 126 |

Full evidence is in the matching TXT report:

$ReportPath

---

## 3. Compatibility questions that must be resolved before real SQL execution

| ID | Question | Why it matters |
|---|---|---|
| COMPAT-01 | What exact columns does public.activity_events expose now? | New fact tables will FK into it and may need compatible ownership/date/status fields. |
| COMPAT-02 | Does the project use direct uth.uid() ownership or Auth0/app_user/person/actor indirection? | RLS policies in the draft currently use direct user_id = auth.uid() and may need replacement. |
| COMPAT-03 | What is the canonical actor FK target? | ctor_id should reference the right table only after confirmation. |
| COMPAT-04 | Is public.value_objects(id) the correct FK target? | ctivity_object_facts.value_object_id depends on this. |
| COMPAT-05 | Are the draft table names already used elsewhere? | Avoid collision with older drafts or hidden partial implementations. |
| COMPAT-06 | Which updated_at trigger helper already exists? | Avoid duplicate helper functions or conflicting trigger names. |
| COMPAT-07 | What GRANT style is canonical for private authenticated tables? | Supabase Data API compatibility requires explicit GRANT near RLS policies. |
| COMPAT-08 | Should pre-confirmation candidates be stored in final tables or separate review/shadow tables? | This affects no-hidden-write and user-confirmation semantics. |

---

## 4. Preliminary interpretation

This step does not make the final migration decision.

The current safe conclusion is:

1. Keep the Step 3 SQL as draft.
2. Use the evidence report to prepare an executable migration only after ownership model and ctivity_events schema are locked.
3. Do not execute SQL yet.
4. Do not create Supabase migration yet.
5. Next step should convert the audit evidence into a precise execution-gate decision: either patch the SQL draft to match the existing schema, or create a separate preflight SQL inspection script.

---

## 5. Safety status

| Gate | Status |
|---|---|
| SQL executed | No |
| Supabase write | No |
| OpenAI call | No |
| Runtime code changed | No |
| Commit | No |
| Push | No |

---

## 6. Next recommended step

FACTS STEP 5/12 should be one of these, based on this audit report:

1. **SQL draft correction** if ownership/FK mismatches are found.
2. **Pre-execution SQL inspection gate** if existing schema needs live Supabase verification.
3. **Executable migration gate** only if compatibility is already proven.

No hidden DB write should be introduced.
