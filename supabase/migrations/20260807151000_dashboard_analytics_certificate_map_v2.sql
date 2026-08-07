-- ARCTor Dashboard Analytics DAV2
-- Certificate map visualization + location grouping.
-- Precise browser user location is not persisted.

begin;

alter table public.dashboard_analytics_blocks
  drop constraint if exists dashboard_analytics_blocks_visualization_check;

alter table public.dashboard_analytics_blocks
  add constraint dashboard_analytics_blocks_visualization_check
  check (
    visualization_type in (
      'line','bar','metric','map','donut','radar','heatmap','scatter','progress'
    )
  ) not valid;

alter table public.dashboard_analytics_blocks
  validate constraint dashboard_analytics_blocks_visualization_check;

alter table public.dashboard_analytics_blocks
  drop constraint if exists dashboard_analytics_blocks_grouping_check;

alter table public.dashboard_analytics_blocks
  add constraint dashboard_analytics_blocks_grouping_check
  check (
    group_by_key in (
      'day','week','month','category','observation_object','profile','location'
    )
  ) not valid;

alter table public.dashboard_analytics_blocks
  validate constraint dashboard_analytics_blocks_grouping_check;

comment on table public.dashboard_analytics_blocks is
  'Persistent per-account/per-active-profile dashboard analytics configuration. DAV2 adds certificate map blocks. Browser user location is ephemeral and not written here.';

commit;