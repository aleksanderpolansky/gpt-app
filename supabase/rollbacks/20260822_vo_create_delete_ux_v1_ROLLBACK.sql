-- ARCTOR_VO_CREATE_DELETE_UX_V1 ROLLBACK
-- Drops only the safe-delete RPC introduced by this release.
-- It does not restore objects that a user deliberately deleted while the RPC was installed.

begin;

drop function if exists public.delete_value_object_safe_v1(uuid, uuid, uuid);

commit;
