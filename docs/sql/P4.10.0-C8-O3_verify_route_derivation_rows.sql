-- P4.10.0-C8-O3 — Verify live DB rows created by flagged debug route Category Derivation
-- Date: 2026-05-19
-- Project: gpt-app / AI-NAVIGATOR
--
-- Expected target:
-- eventId: 7bf83e7b-02f8-4882-8e7b-419c8843cee2
-- derivationRunId: dd0db584-cad7-4925-9e2a-732a0676e174
-- expected derivation rows: 5
-- expected slugs:
-- walking
-- work
-- commute-to-work
-- walking-to-work
-- duration-minutes

with target as (
  select
    '7bf83e7b-02f8-4882-8e7b-419c8843cee2'::uuid as event_id,
    'dd0db584-cad7-4925-9e2a-732a0676e174'::uuid as derivation_run_id,
    array[
      'walking',
      'work',
      'commute-to-work',
      'walking-to-work',
      'duration-minutes'
    ]::text[] as expected_slugs
),
run_row as (
  select r.*
  from category_derivation_runs r
  join target t
    on r.id = t.derivation_run_id
   and r.activity_event_id = t.event_id
),
event_row as (
  select e.*
  from activity_events e
  join target t
    on e.id = t.event_id
),
derivation_rows as (
  select d.*
  from activity_category_derivations d
  join target t
    on d.derivation_run_id = t.derivation_run_id
   and d.activity_event_id = t.event_id
),
expected_slug_rows as (
  select unnest(t.expected_slugs) as expected_slug
  from target t
),
slug_check as (
  select
    e.expected_slug,
    exists (
      select 1
      from derivation_rows d
      where d.candidate_slug = e.expected_slug
    ) as exists_ok
  from expected_slug_rows e
),
summary as (
  select
    (select count(*) from run_row) as run_rows_count,
    (select count(*) from event_row) as event_rows_count,
    (select count(*) from derivation_rows) as derivation_rows_count,
    (select count(*) from slug_check where exists_ok) as expected_slugs_found_count,
    (select count(*) from expected_slug_rows) as expected_slugs_count,
    (select coalesce(bool_and(exists_ok), false) from slug_check) as all_expected_slugs_found,
    (
      select coalesce(bool_and(category_id is null), false)
      from derivation_rows
    ) as all_category_ids_null_expected_for_dry_run,
    (
      select coalesce(bool_and(metadata_json ->> 'resolutionStatus' = 'unresolved'), false)
      from derivation_rows
    ) as all_resolution_status_unresolved,
    (
      select coalesce(bool_and(source = 'rule'), false)
      from derivation_rows
    ) as all_sources_rule
)
select
  '01_target' as section,
  to_jsonb(t) as data
from target t

union all

select
  '02_event_row' as section,
  coalesce(
    (select to_jsonb(e) from event_row e limit 1),
    jsonb_build_object('missing', true)
  ) as data

union all

select
  '03_category_derivation_run' as section,
  coalesce(
    (select to_jsonb(r) from run_row r limit 1),
    jsonb_build_object('missing', true)
  ) as data

union all

select
  '04_derivation_rows' as section,
  coalesce(
    (
      select jsonb_agg(to_jsonb(d) order by d.candidate_slug)
      from derivation_rows d
    ),
    '[]'::jsonb
  ) as data

union all

select
  '05_slug_check' as section,
  coalesce(
    (
      select jsonb_agg(to_jsonb(s) order by s.expected_slug)
      from slug_check s
    ),
    '[]'::jsonb
  ) as data

union all

select
  '06_summary' as section,
  to_jsonb(s) as data
from summary s

union all

select
  '07_final_verdict' as section,
  jsonb_build_object(
    'ok',
      s.run_rows_count = 1
      and s.event_rows_count = 1
      and s.derivation_rows_count = 5
      and s.expected_slugs_found_count = s.expected_slugs_count
      and s.all_expected_slugs_found = true
      and s.all_category_ids_null_expected_for_dry_run = true
      and s.all_resolution_status_unresolved = true
      and s.all_sources_rule = true,
    'run_rows_count', s.run_rows_count,
    'event_rows_count', s.event_rows_count,
    'derivation_rows_count', s.derivation_rows_count,
    'expected_slugs_found_count', s.expected_slugs_found_count,
    'expected_slugs_count', s.expected_slugs_count,
    'all_expected_slugs_found', s.all_expected_slugs_found,
    'all_category_ids_null_expected_for_dry_run', s.all_category_ids_null_expected_for_dry_run,
    'all_resolution_status_unresolved', s.all_resolution_status_unresolved,
    'all_sources_rule', s.all_sources_rule,
    'expected_result', 'ok=true'
  ) as data
from summary s;