-- ARCTor CONTENT-L10 Global Content Localization V1
-- Add a shared JSON envelope storage slot to user-authored commercial entities.
-- activity_events already has metadata_json and uses the same localization envelope.

begin;

alter table public.organizations
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

alter table public.offers
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

comment on column public.organizations.metadata_json is
  'Server-owned metadata. localizedContent stores persistent 7-locale user-content variants.';

comment on column public.offers.metadata_json is
  'Server-owned metadata. localizedContent stores persistent 7-locale user-content variants.';

commit;
