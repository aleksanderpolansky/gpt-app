-- ARCTor CONTENT-L10 Global Content Localization V1 rollback.
-- Safe only while metadata_json is used exclusively by CONTENT-L10 on these tables.

begin;

alter table public.offers
  drop column if exists metadata_json;

alter table public.organizations
  drop column if exists metadata_json;

commit;
