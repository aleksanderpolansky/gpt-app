-- 015_activity_impact_rules_v2_template_link.sql
-- Activity Recording Layer v2 impact rules compatibility patch.
--
-- Purpose:
-- impact_rules.template_id from migration 012 points to legacy activity_code_templates.
-- New v2 template-first model uses activity_templates.
-- Therefore we add impact_rules.activity_template_id instead of overloading template_id.
--
-- This migration is additive and keeps legacy impact_rules.template_id intact.

create extension if not exists "pgcrypto";

alter table public.impact_rules
add column if not exists activity_template_id uuid
references public.activity_templates(id)
on delete set null;

create index if not exists idx_impact_rules_activity_template_id
on public.impact_rules(activity_template_id);

create unique index if not exists idx_impact_rules_activity_template_rule_code_unique
on public.impact_rules(activity_template_id, rule_code)
where activity_template_id is not null;

drop trigger if exists trg_impact_rules_updated_at on public.impact_rules;

create trigger trg_impact_rules_updated_at
before update on public.impact_rules
for each row
execute function public.set_activity_recording_updated_at();

update public.impact_rules rules
set
  activity_template_id = templates.id,
  updated_at = now()
from public.activity_templates templates
where templates.legacy_activity_code_template_id = rules.template_id
  and templates.slug = 'german-marketing-handwriting-practice'
  and rules.activity_template_id is distinct from templates.id;

comment on column public.impact_rules.activity_template_id is
'Activity Recording Layer v2 template reference. Do not confuse with legacy template_id, which points to activity_code_templates from migration 012.';