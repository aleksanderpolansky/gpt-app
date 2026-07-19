-- Actor public profiles: post-migration verification (READ ONLY).
-- Returns one JSON report without personal data.

with profile_counts as (
  select
    count(*) as total_profiles_count,
    count(*) filter (where profile_kind = 'personal') as personal_profiles_count,
    count(*) filter (where profile_kind = 'avatar') as avatar_profiles_count,
    count(*) filter (where is_public) as public_profiles_count,
    count(*) filter (where not is_public) as hidden_profiles_count,
    count(distinct owner_user_id) as distinct_profile_owners_count,
    count(distinct actor_id) as distinct_profile_actors_count
  from public.actor_public_profiles
),
integrity_counts as (
  select
    count(*) filter (where au.id is null) as missing_owner_count,
    count(*) filter (where a.id is null) as missing_actor_count
  from public.actor_public_profiles as profile
  left join public.app_users as au on au.id = profile.owner_user_id
  left join public.actors as a on a.id = profile.actor_id
),
coverage_counts as (
  select
    count(*) as complete_primary_actor_mappings_count,
    count(*) filter (where profile.id is not null) as mappings_with_personal_profile_count,
    count(*) filter (where profile.id is null) as mappings_without_personal_profile_count
  from public.app_users as au
  join public.persons as person on person.user_id = au.id
  join public.actors as actor
    on actor.person_id = person.id
   and actor.actor_type = 'person'
  left join public.actor_public_profiles as profile
    on profile.owner_user_id = au.id
   and profile.actor_id = actor.id
   and profile.profile_kind = 'personal'
),
duplicate_personal_owners as (
  select count(*) as duplicate_personal_owner_count
  from (
    select owner_user_id
    from public.actor_public_profiles
    where profile_kind = 'personal'
    group by owner_user_id
    having count(*) > 1
  ) as duplicates
)
select jsonb_pretty(
  jsonb_build_object(
    'mode', 'read_only_actor_public_profiles_postcheck',
    'generated_at', now(),
    'profile_counts', (select to_jsonb(c) from profile_counts as c),
    'integrity_counts', (select to_jsonb(i) from integrity_counts as i),
    'coverage_counts', (select to_jsonb(c) from coverage_counts as c),
    'duplicate_counts', (select to_jsonb(d) from duplicate_personal_owners as d)
  )
) as actor_public_profiles_postcheck_report;
