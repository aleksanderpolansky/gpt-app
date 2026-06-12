-- AI-NAVIGATOR / Activity Recording Layer
-- Adds a system template for activities recorded through the single right-column AI composer.
--
-- Design rules:
-- - Single Message Entry Point remains the right AI composer.
-- - This template is not shown as a separate quick-capture button.
-- - The template is generic; semantic categories and Value Objects stay controlled by the AI preview/review pipeline.
-- - This migration file is safe to create; it does not run until applied by the migration tool.

do $$
declare
  v_existing_template_id uuid;
  v_template_id uuid;
begin
  select id
  into v_existing_template_id
  from public.activity_templates
  where slug = 'ai-navigator-manual-activity'
    and template_scope = 'system'
    and owner_user_id is null
    and organization_id is null
  limit 1;

  if v_existing_template_id is null then
    insert into public.activity_templates (
      legacy_activity_code_template_id,
      owner_user_id,
      owner_actor_id,
      organization_id,
      slug,
      title,
      short_title,
      description,
      template_group,
      template_scope,
      visibility,
      source_type,
      status,
      default_activity_type_id,
      default_duration_minutes,
      quick_duration_minutes,
      default_status,
      default_source_type,
      default_privacy_scope,
      icon_key,
      color_key,
      show_in_quick_capture,
      show_in_onboarding,
      allow_manual_duration,
      allow_comment,
      allow_started_at_override,
      allow_ended_at_override,
      input_schema_json,
      ui_schema_json,
      default_metadata_json,
      sort_order,
      is_active
    )
    values (
      null,
      null,
      null,
      null,
      'ai-navigator-manual-activity',
      'AI Navigator manual activity',
      'AI manual activity',
      'Generic system template for activities recorded through the single right-column AI Navigator composer after preview, review and governed write.',
      'general',
      'system',
      'private',
      'system_seed',
      'active',
      null,
      null,
      array[15, 30, 45, 60]::integer[],
      'completed',
      'manual_chat',
      'private',
      'sparkles',
      'blue',
      false,
      false,
      true,
      true,
      true,
      true,
      '{
        "required": ["durationMinutes"],
        "optional": ["naturalInput", "comment", "title", "startedAt", "endedAt"],
        "fields": {
          "naturalInput": {
            "type": "string",
            "label": "Original AI message"
          },
          "title": {
            "type": "string",
            "label": "Normalized activity title"
          },
          "durationMinutes": {
            "type": "number",
            "label": "Duration",
            "unit": "minutes"
          },
          "comment": {
            "type": "string",
            "label": "Comment"
          }
        }
      }'::jsonb,
      '{
        "cardTitle": "AI Navigator manual activity",
        "cardSubtitle": "Single-entry AI composer activity after preview and governed write",
        "primaryButtonLabel": "Record governed activity",
        "quickDurations": [15, 30, 45, 60],
        "showShortcutAsAdvanced": false,
        "singleEntryPointOnly": true
      }'::jsonb,
      '{
        "mvp_seed": true,
        "ai_navigator_template": true,
        "single_entry_point": "right_ai_composer",
        "controlled_write_required": true,
        "creates_template_links": false,
        "semantic_candidates_from_ai_preview": true,
        "value_object_candidates_from_ai_preview": true,
        "example_manual_chat": {
          "templateSlug": "ai-navigator-manual-activity",
          "naturalInput": "полчаса был на профилактическом приеме у стоматолога",
          "durationMinutes": 30,
          "title": "Профилактический приём у стоматолога",
          "sourceType": "manual_chat",
          "status": "completed"
        }
      }'::jsonb,
      900,
      true
    )
    returning id into v_template_id;
  else
    update public.activity_templates
    set
      title = 'AI Navigator manual activity',
      short_title = 'AI manual activity',
      description = 'Generic system template for activities recorded through the single right-column AI Navigator composer after preview, review and governed write.',
      template_group = 'general',
      visibility = 'private',
      source_type = 'system_seed',
      status = 'active',
      default_activity_type_id = null,
      default_duration_minutes = null,
      quick_duration_minutes = array[15, 30, 45, 60]::integer[],
      default_status = 'completed',
      default_source_type = 'manual_chat',
      default_privacy_scope = 'private',
      icon_key = 'sparkles',
      color_key = 'blue',
      show_in_quick_capture = false,
      show_in_onboarding = false,
      allow_manual_duration = true,
      allow_comment = true,
      allow_started_at_override = true,
      allow_ended_at_override = true,
      input_schema_json = '{
        "required": ["durationMinutes"],
        "optional": ["naturalInput", "comment", "title", "startedAt", "endedAt"],
        "fields": {
          "naturalInput": {
            "type": "string",
            "label": "Original AI message"
          },
          "title": {
            "type": "string",
            "label": "Normalized activity title"
          },
          "durationMinutes": {
            "type": "number",
            "label": "Duration",
            "unit": "minutes"
          },
          "comment": {
            "type": "string",
            "label": "Comment"
          }
        }
      }'::jsonb,
      ui_schema_json = '{
        "cardTitle": "AI Navigator manual activity",
        "cardSubtitle": "Single-entry AI composer activity after preview and governed write",
        "primaryButtonLabel": "Record governed activity",
        "quickDurations": [15, 30, 45, 60],
        "showShortcutAsAdvanced": false,
        "singleEntryPointOnly": true
      }'::jsonb,
      default_metadata_json = '{
        "mvp_seed": true,
        "ai_navigator_template": true,
        "single_entry_point": "right_ai_composer",
        "controlled_write_required": true,
        "creates_template_links": false,
        "semantic_candidates_from_ai_preview": true,
        "value_object_candidates_from_ai_preview": true,
        "example_manual_chat": {
          "templateSlug": "ai-navigator-manual-activity",
          "naturalInput": "полчаса был на профилактическом приеме у стоматолога",
          "durationMinutes": 30,
          "title": "Профилактический приём у стоматолога",
          "sourceType": "manual_chat",
          "status": "completed"
        }
      }'::jsonb,
      sort_order = 900,
      is_active = true,
      updated_at = now()
    where id = v_existing_template_id
    returning id into v_template_id;
  end if;
end $$;