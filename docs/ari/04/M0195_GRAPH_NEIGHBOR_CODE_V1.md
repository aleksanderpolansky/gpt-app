# M-0195 / ARI-04.07.02 — bounded graph neighbor API (local CODE only)

Target: `GET /api/value-objects/[id]/graph-neighbors?direction=all|outgoing|incoming|symmetric&type=<relation_type>&limit=1..50`.

- Disabled by default: requires explicit `ARCTOR_GRAPH_NEIGHBOR_V1_ENABLED=1`. **DO NOT ENABLE** while SEC-06 is OPEN_BLOCKER or before runtime security review.
- Requires Auth0 session and active actor. Scope is inferred from anchor: system GLOBAL+system_model or actor-owned, never chosen by query parameter.
- System relations read only from `system_value_object_relations`, actor-owned relations only from `value_object_relations` with explicit owner+actor filtering.
- Both anchor and neighbor visible under the same scope; no private nodes returned by global search.
- `outgoing` and `incoming` are for directed relations; `symmetric` covers either orientation of symmetric relations.
- Uses two index-backed bounded queries at most, and one bounded node metadata query; fail-closed on errors; no mutation or LLM calls.
- Only active relations and types are returned. Canonical duplicate collapse is a display guard, not deletion or approval.
- `truncated` indicates more qualifying loaded rows than the requested result limit; no stable cursor guarantee.
- **Not completed here:** 2-hop traversal, inherited inference, catalog/review cache versioning, traversal time budgets, real user RLS negative tests, p50/p95 benchmarks, production integration, independent evidence verification (ARI-04.07.03–08).
- Evidence belongs in `docs/recovery/ARI_MASTER/04/0195_EVIDENCE.md` after separate owner acceptance. No acceptance performed by installer.
