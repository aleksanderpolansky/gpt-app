# ARCTor — Qualified Parameter Target Bindings V1

Date: 2026-09-26

## Goal

Make one universal parameter definition reusable across several semantically
different Observation Objects without copying an unqualified value to all of
them.

The feature is generic. It is not sleep-specific.

Examples:

- `duration` -> total sleep / light sleep / deep sleep / REM sleep;
- `mass` -> soup / potato in soup / meat in soup;
- `mass` -> body mass / fat mass / body water mass / muscle mass;
- `count` -> total repetitions / a specifically named counted component.

## Binding rule

The rule belongs to the concrete `parameter -> Observation Object` binding,
not to the parameter definition itself.

A new direct-authored binding stores `targetQualification`:

```json
{
  "mode": "default | explicit_qualifier",
  "aliases": ["..."]
}
```

For one parameter there may be zero or one `default` target. Any number of
`explicit_qualifier` targets is allowed.

Zero defaults is valid when every target requires an explicit label.

## Meaning

`default`:
- may accept one genuinely unqualified explicit measurement;
- may also accept an explicitly labelled value when its alias matches.

`explicit_qualifier`:
- accepts a direct explicit measurement only when the extracted measurement
  contains a qualifier that matches this target's aliases;
- otherwise no fact is created for the target;
- snapshot/external deterministic resolution remains allowed because the
  structured binding already identifies the target.

## Universal examples

Sleep:
- duration -> total night sleep: default;
- duration -> light/deep/REM: explicit qualifier.

Soup:
- mass -> soup total mass: default;
- mass -> potato mass: explicit qualifier;
- mass -> meat mass: explicit qualifier.

Body composition:
- mass -> body mass: default (optional policy choice);
- mass -> fat/water/muscle mass: explicit qualifier.

## Intake contract

The basic intake measurement adds:

`qualifier: string | null`

The qualifier is the shortest verbatim noun phrase in the source that says
what the number refers to. Several measurements with the same parameter code
are preserved, including equal numeric values when their evidence fragments
are different.

The model still does not receive the Observation Object catalog and does not
choose Observation Objects. Mapping from qualifier to a saved target binding
is deterministic server logic after a typical activity has been selected.

## Backward compatibility

Existing profiles without `targetQualification` keep their historical fan-out
behavior. This avoids silently changing already published typical activities.

New direct system typical activities write qualification metadata for every
mapping.

## Persistence

No SQL migration is required. The qualification metadata is stored in the
existing `activity_template_impact_profiles_v1.metadata_json.sourceValueBindingsV1`.

## Safety

- no automatic guess from a bare number to an explicit-only target;
- at most one default target per parameter;
- ambiguous qualifier matches fail closed;
- multiple values resolving to the same target fail closed;
- controlled E03 confirmation and canonical fact writer remain unchanged;
- source snapshot fallback remains supported.

## Image / OCR boundary

The semantic contract is source-independent. A textual phrase, OCR label,
multimodal extraction, or structured external field may supply the qualifier.

This release updates the basic text intake contract and the deterministic
materializer. Any separate image pipeline must emit the same explicit
`qualifier` evidence before it can use an explicit-only binding.
