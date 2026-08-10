# P5B2B — Methodology / Processing Provenance Persistence v1

## Purpose

P5B2B closes the gap between:

- P5B1/P5B2A, where a live AI result can expose a public-safe `methodologyTrace`;
- P4A, where `activity_ai_processing_provenance` already exists for exact
  provider/instruction/source/assumption snapshots.

P5B2B reuses the P4A table. It does not create a second provenance store.

## What is persisted

For a background semantic-enrichment run that successfully returns a preview,
ARCTor persists one immutable provenance row containing:

- semantic enrichment run id;
- owner user / actor;
- provider + model when model-backed;
- exact system-instruction revision texts used by the trace;
- exact actor-instruction revision text when one was actually used;
- knowledge-package references supplied to the runtime;
- inference assumptions (empty until an explicit assumption contract is wired);
- the full public-safe `methodologyTrace`.

## Exact snapshot reconstruction

`methodologyTrace` intentionally exposes only revision metadata, not private
instruction text.

P5B2B reconstructs the exact private snapshot server-side:

- `code_default` system instructions come from the versioned source definition;
- DB-backed system instructions are read from the immutable
  `ai_processing_instruction_revisions` row named by code/locale/revision;
- personal rules are read from the immutable
  `actor_ai_processing_preference_revisions` row named by
  owner/actor/locale/revision.

This prevents hidden instruction text from being returned through the preview
API while still preserving exact historical reproducibility.

## Database validation

The existing P4A insert trigger is extended so that a stored methodology trace
must match a registered P5A runtime binding:

- runtime code + binding version;
- protocol code/version/hash;
- output schema code/version/hash;
- methodology trace schema code/version/hash;
- deterministic rule registries must be declared by the binding;
- knowledge packages must be declared by the binding.

The row remains immutable after insert.

## Runtime placement

Persistence is wired into the existing background semantic-enrichment processor:

`activity event -> CUX4 semantic enrichment run -> preview -> provenance insert
-> finish semantic enrichment run`

Foreground preview remains preview-only and does not write provenance merely
because a user opened the preview screen.

## Important current limitation

The current CUX4 internal preview fetch does not forward the browser session.
Therefore the persisted actor-processing snapshot reflects what the internal
runtime actually used. If the internal trace has no actor processing rule, P5B2B
records `source=none`; it does not pretend that a personal rule was applied.

A later dedicated server-to-server actor-context handoff can improve that
runtime behavior without falsifying historical provenance.

## Non-goals

P5B2B does not:

- create Goal Worlds;
- add a knowledge base;
- persist Navigator chat methodology yet;
- fabricate inference assumptions;
- change the strict P5B2A output schemas;
- expose private instruction text through public API responses.
