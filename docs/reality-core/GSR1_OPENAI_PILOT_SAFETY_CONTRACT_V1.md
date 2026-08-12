# ARCTor.app — GSR-1 OpenAI Pilot Safety Contract v1
Date: 2026-08-11

## Status

This contract applies to the first Global System Reality OpenAI pilot.

P8 remains blocked.

## Hard cost rule

One user operation may reserve at most **USD 0.10 provider cost in total**.

The limit applies to the sum of every OpenAI provider call inside the operation,
not independently to each call.

A test that could exceed USD 0.10 is not silently permitted. It requires a new,
explicit warning and confirmation for that specific test. There is no persistent
"expensive test" override.

## Loop / runaway controls

The database guard permits no more than 3 reservations in one operation.

The GSR-1F preview runtime is stricter:

- exactly 2 normal provider stages;
- 0 automatic provider retries;
- 25 s timeout per provider call;
- 55 s route deadline, inside the 60 s database operation window;
- 20,000 conservative input-token ceiling per call;
- 4,000 output-token ceiling per call;
- stale or unknown provider pricing blocks the call before OpenAI.

The existing OpenAI SDK caller is extended with per-request timeout/retry
controls. Existing non-GSR callers retain their prior behavior.

## First pilot model

The first pilot is Nano-only and resolves the model from the live
`ai_model_tiers` registry.

At the verified 2026-08-11 price for `gpt-5.4-nano`:

- input: USD 0.20 / 1M tokens;
- cached input: USD 0.02 / 1M tokens;
- output: USD 1.25 / 1M tokens.

GSR-1F uses output caps of 500 and 900 tokens for the two stages.

Even if each stage reached the local 20,000-token conservative input ceiling,
the maximum reserved provider cost is:

- stage 1: 20,000 × 0.20 / 1M + 500 × 1.25 / 1M = USD 0.004625;
- stage 2: 20,000 × 0.20 / 1M + 900 × 1.25 / 1M = USD 0.005125;
- two-stage maximum: **USD 0.00975**.

The database USD 0.10 operation cap remains the authoritative backstop.

## Semantic routing

The preview uses:

`text -> segmentation + DOMAIN/FACET -> exact alias OR <=10 leaf candidates -> leaf + allowed parameter selection -> deterministic server validation`

The model never receives all 150 global ontology objects.

The second-stage choice is rejected if it is outside the server-supplied
candidate set.

A proposed fact is rejected if its parameter or unit is outside the selected
leaf's active system parameter contract.

## Epistemic safeguards

The pilot prompt and server contract prohibit:

- invented numeric measurements;
- silent calories/caffeine estimates;
- diagnosis;
- inferred physical harm;
- causal claims from temporal adjacency;
- creation of new ontology objects.

Raw user evidence is preserved as `sourceFragment` / `rawFragment`.

`occurredAt` remains separate from server `reportedAt`.

## Privacy / persistence

GSR-1F is **preview only**.

It does not call `attach_global_observation_facts_gsr1_v1` and therefore does
not write extracted facts into the Reality Graph.

OpenAI Responses calls use `store=false`.

AI usage/budget metadata is written for audit and cost control. The pilot usage
event explicitly marks wallet debit as not performed by this preview stage.

## Enablement gate

No OpenAI call is possible through the new route unless:

`GSR1_OPENAI_PILOT_ENABLED=true`

The repository patch itself does not change this environment variable and does
not make any OpenAI call.

## 2026-08-12 production mode

The authenticated Global Reality preview is now enabled by default for the
production Activity AI Lab.

The legacy environment variable remains only as an emergency OFF switch:

`GSR1_OPENAI_PILOT_ENABLED=false`

If the variable is absent, the bounded Nano pipeline is allowed to run.

Unchanged safeguards: active actor context, Nano-only model, two provider
stages, zero automatic retries, USD 0.10 hard operation cap, 25 second provider
timeout, 55 second route deadline, `store=false`, server-bounded candidate
selection, parameter/evidence validation, and preview-only Reality Graph
behavior.
