# ARCTor — Occurrence Count + Localized Routing Review V1

Date: 2026-09-26

## Purpose

Close two gaps found by the live acceptance case:

`Спал 7 часов, 3 раза проснулся`

The previous runtime correctly routed `7 hours` to the default duration target,
but:

1. generic `N times <action>` wording was deterministically classified as
   `repetition_count`;
2. Observation Object titles in the routing review were shown in canonical
   English even when the UI locale was Russian.

## Universal measurement rule

ARCTor now separates two concepts.

### Explicit repetitions

Wording that explicitly says `repetitions / reps / повторения / powtórzenia /
Wiederholungen / repeticiones / opakování` remains `repetition_count`.

### Occurrence count

Wording equivalent to `N times <action>` is a generic occurrence count:

- `3 раза проснулся`;
- `2 раза выпил кофе`;
- `5 раз подтянулся`;
- `2 times woke up`;
- analogous markers for PL/DE/ES/CS/UK.

The number is stored as:

- `parameterCode = count`;
- `measureType = count`;
- `unit = count`;
- `qualifier = the explicit action phrase from the source`;
- `rawFragment = verbatim evidence`.

This keeps the mechanism domain-independent.

## Qualified routing rule

Alias matching remains the primary routing rule.

A narrow fallback is added only for `count`:

- the measurement has a non-empty explicit qualifier;
- the active typical-activity profile exposes exactly one direct target for the
  `count` parameter;
- that target is marked `explicit_qualifier`.

Then the count may route to that single declared target even if the verb phrase
and the target's noun title are not lexically similar, e.g. `проснулся` and
`Количество пробуждений`.

This fallback is NOT allowed for mass, duration, or multi-target count
parameters. Those still require normal qualifier alias disambiguation.

The provenance stores the match method:
`single_explicit_count_target`.

## Localization rule

The source fact materializer now reuses the existing
`localizeGlobalSystemValueObject` reader.

`value_objects.metadata_json` is read for display localization only.
No translation is generated and no localization is written during intake.

The UI locale is passed from the review card to the materialization preflight
and confirmation route. Planned and missing target titles therefore use the
requested localized Observation Object title with canonical English fallback.

## Safety

- no database schema change;
- no SQL;
- no new writer;
- existing controlled confirmation remains the write gate;
- existing qualifier-alias routing remains primary;
- single-target fallback is restricted to explicit occurrence `count`.

## FIX1 implementation note

The runtime localizer is loaded lazily only when `locale` is supplied.
This keeps existing offline materializer regressions isolated from the JSON
localization catalog while production preflight/confirmation still uses the
canonical localization reader.
