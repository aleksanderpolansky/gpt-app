-- ARCTor.app
-- CUX4A1T: monotonic updated_at for semantic enrichment runs
--
-- Runtime acceptance exposed a timestamp-source mismatch:
-- created_at uses clock_timestamp(), while the shared updated-at trigger
-- uses now(), which is fixed at transaction start. A later update inside
-- the same transaction could therefore set updated_at earlier than created_at.
--
-- This additive correction creates a dedicated trigger function for the
-- CUX4A1 service table. It does not modify activity_events, calendar_events,
-- existing activity rows, or the shared legacy updated-at function.

begin;

create or replace function
public.set_activity_semantic_enrichment_updated_at_cux4()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := greatest(clock_timestamp(), new.created_at);
  return new;
end
$function$;

drop trigger if exists
activity_semantic_enrichment_runs_cux4_updated_at_trg
on public.activity_semantic_enrichment_runs_cux4;

create trigger activity_semantic_enrichment_runs_cux4_updated_at_trg
before update
on public.activity_semantic_enrichment_runs_cux4
for each row
execute function
public.set_activity_semantic_enrichment_updated_at_cux4();

revoke all
on function public.set_activity_semantic_enrichment_updated_at_cux4()
from public, anon, authenticated;

grant execute
on function public.set_activity_semantic_enrichment_updated_at_cux4()
to service_role;

comment on function
public.set_activity_semantic_enrichment_updated_at_cux4() is
'CUX4A1 dedicated monotonic updated_at trigger using clock_timestamp().';

commit;
