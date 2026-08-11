# ARCTor.app — P6B Goal Intake Runtime Wiring v1

Runtime code: `goal_intake`
Binding version: `1`

P6B connects the accepted P6A Goal Intake contract to the P5 methodology
platform without creating Goal Worlds or writing user reality.

Primary protocol:
- `arctor_ai_runtime_core@1`

Supporting protocols:
- `goal_intake_protocol@1`
- `reality_context_snapshot@1`

Strict model output:
- `goal_intake_definition@1`
- SHA256 `D814F94B539E13055C1462564A90676E09598BEB09E9E418B31F293ACA73C845`

Methodology trace:
- `ai_methodology_trace@2`
- SHA256 `A7C7F264A0D5CD7E609A5188343B06B07807C00E35D13CCBA103B537C65EEC33`

Deterministic rule registries:
- `goal_intake_registry / goal_intake_v1 / 1`
- `reality_context_policy / goal_intake / 1`

The provider receives current goal text plus a trusted server-side Reality
Context Snapshot. It never treats arbitrary client-supplied personal context as
trusted reality.

This runtime is preview-only: no Value Object creation, no Goal World creation,
no fact persistence, no statement-routing persistence and no database mutation.

Trace v2 adds `supportingProtocols`. Existing Navigator and Activity runtimes
remain on trace v1.

Acceptance order:
1. source/build gate;
2. manual Supabase methodology-registry apply;
3. read-only postcheck;
4. one no-write strict provider smoke;
5. commit/push only after smoke passes.
