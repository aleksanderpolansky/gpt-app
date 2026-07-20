-- PRE-PUBLISH ROLLBACK ONLY.
-- Use only while the personal profile feature has not been released and the
-- table contains only the automatically created hidden bootstrap profiles.
-- This restores the production database to its state before
-- 20260719190000_actor_public_profiles.sql was applied.
--
-- DESTRUCTIVE EFFECT: removes actor_public_profiles and every row in it.
-- It does not modify app_users, persons, actors or any other existing table.

begin;

drop table if exists public.actor_public_profiles;

commit;
