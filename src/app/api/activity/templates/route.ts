import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
  ACTIVITY_RECORDING_DEFAULT_LIMIT,
  ACTIVITY_RECORDING_MAX_LIMIT,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityTemplateRow = {
  id: string;
  legacy_activity_code_template_id: string | null;
  owner_user_id: string | null;
  owner_actor_id: string | null;
  organization_id: string | null;
  slug: string;
  title: string;
  short_title: string | null;
  description: string | null;
  template_group: string;
  template_scope: string;
  visibility: string;
  source_type: string;
  status: string;
  default_activity_type_id: string | null;
  default_duration_minutes: number | null;
  quick_duration_minutes: number[] | null;
  default_status: string;
  default_source_type: string;
  default_privacy_scope: string;
  icon_key: string | null;
  color_key: string | null;
  show_in_quick_capture: boolean;
  show_in_onboarding: boolean;
  allow_manual_duration: boolean;
  allow_comment: boolean;
  allow_started_at_override: boolean;
  allow_ended_at_override: boolean;
  input_schema_json: Record<string, unknown> | null;
  ui_schema_json: Record<string, unknown> | null;
  default_metadata_json: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ActivityTemplateLinkRow = {
  id: string;
  template_id: string;
  linked_entity_type: string;
  linked_entity_id: string | null;
  linked_entity_key: string | null;
  link_role: string;
  relation_type: string;
  default_weight: number;
  default_confidence: number;
  source_type: string;
  is_required: boolean;
  is_active: boolean;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ActivityShortcutRow = {
  id: string;
  user_id: string | null;
  template_id: string;
  shortcut_scope: string;
  shortcut_type: string;
  shortcut_value: string;
  label: string | null;
  description: string | null;
  is_favorite: boolean;
  show_in_default_ui: boolean;
  is_deprecated_alias: boolean;
  nfc_tag_id: string | null;
  voice_phrase: string | null;
  device_binding: string | null;
  sort_order: number;
  is_active: boolean;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ActivityTypeRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
};

function parseLimit(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get("limit");

  if (!rawLimit) {
    return ACTIVITY_RECORDING_DEFAULT_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawLimit, 10);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return ACTIVITY_RECORDING_DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, ACTIVITY_RECORDING_MAX_LIMIT);
}

function normalizeText(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function mergeTemplates(
  systemTemplates: ActivityTemplateRow[],
  userTemplates: ActivityTemplateRow[]
) {
  const templatesById = new Map<string, ActivityTemplateRow>();

  for (const template of systemTemplates) {
    templatesById.set(template.id, template);
  }

  for (const template of userTemplates) {
    templatesById.set(template.id, template);
  }

  return Array.from(templatesById.values()).sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return a.title.localeCompare(b.title);
  });
}

function filterTemplatesByQuery(
  templates: ActivityTemplateRow[],
  query: string | null
) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return templates;
  }

  return templates.filter((template) => {
    const searchableText = [
      template.slug,
      template.title,
      template.short_title,
      template.description,
      template.template_group,
      template.template_scope,
      template.source_type,
      template.status,
    ]
      .map((value) => normalizeText(value))
      .join(" ");

    return searchableText.includes(normalizedQuery);
  });
}

function filterTemplatesByGroup(
  templates: ActivityTemplateRow[],
  group: string | null
) {
  const normalizedGroup = normalizeText(group);

  if (!normalizedGroup || normalizedGroup === "all") {
    return templates;
  }

  return templates.filter(
    (template) => normalizeText(template.template_group) === normalizedGroup
  );
}

function filterTemplatesByQuickCapture(
  templates: ActivityTemplateRow[],
  quickCaptureOnly: boolean
) {
  if (!quickCaptureOnly) {
    return templates;
  }

  return templates.filter((template) => template.show_in_quick_capture);
}

function mapByTemplateId<T extends { template_id: string }>(rows: T[]) {
  const result = new Map<string, T[]>();

  for (const row of rows) {
    const existingRows = result.get(row.template_id) ?? [];
    existingRows.push(row);
    result.set(row.template_id, existingRows);
  }

  return result;
}

function mapActivityTypesById(activityTypes: ActivityTypeRow[]) {
  const result = new Map<string, ActivityTypeRow>();

  for (const activityType of activityTypes) {
    result.set(activityType.id, activityType);
  }

  return result;
}

export async function GET(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { appUser, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams);
  const query = url.searchParams.get("q");
  const group = url.searchParams.get("group");
  const quickCaptureOnly =
    url.searchParams.get("quickCaptureOnly") === "true";

  const { data: systemTemplatesData, error: systemTemplatesError } =
    await supabase
      .from("activity_templates")
      .select("*")
      .eq("template_scope", "system")
      .eq("status", "active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

  if (systemTemplatesError) {
    return NextResponse.json(
      {
        ok: false,
        error: systemTemplatesError.message,
      },
      { status: 500 }
    );
  }

  const { data: userTemplatesData, error: userTemplatesError } = await supabase
    .from("activity_templates")
    .select("*")
    .eq("template_scope", "user")
    .eq("owner_user_id", appUser.id)
    .eq("status", "active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (userTemplatesError) {
    return NextResponse.json(
      {
        ok: false,
        error: userTemplatesError.message,
      },
      { status: 500 }
    );
  }

  const systemTemplates = (systemTemplatesData ?? []) as ActivityTemplateRow[];
  const userTemplates = (userTemplatesData ?? []) as ActivityTemplateRow[];

  let templates = mergeTemplates(systemTemplates, userTemplates);
  templates = filterTemplatesByQuery(templates, query);
  templates = filterTemplatesByGroup(templates, group);
  templates = filterTemplatesByQuickCapture(templates, quickCaptureOnly);
  templates = templates.slice(0, limit);

  const templateIds = uniqueStrings(templates.map((template) => template.id));
  const activityTypeIds = uniqueStrings(
    templates.map((template) => template.default_activity_type_id)
  );

  const { data: linksData, error: linksError } =
    templateIds.length > 0
      ? await supabase
          .from("activity_template_links")
          .select("*")
          .in("template_id", templateIds)
          .eq("is_active", true)
          .order("linked_entity_type", { ascending: true })
          .order("linked_entity_key", { ascending: true })
      : { data: [], error: null };

  if (linksError) {
    return NextResponse.json(
      {
        ok: false,
        error: linksError.message,
      },
      { status: 500 }
    );
  }

  const { data: shortcutsData, error: shortcutsError } =
    templateIds.length > 0
      ? await supabase
          .from("user_activity_shortcuts")
          .select("*")
          .in("template_id", templateIds)
          .or(`shortcut_scope.eq.system,user_id.eq.${appUser.id}`)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

  if (shortcutsError) {
    return NextResponse.json(
      {
        ok: false,
        error: shortcutsError.message,
      },
      { status: 500 }
    );
  }

  const { data: activityTypesData, error: activityTypesError } =
    activityTypeIds.length > 0
      ? await supabase
          .from("activity_types")
          .select("id, code, title, description, status")
          .in("id", activityTypeIds)
      : { data: [], error: null };

  if (activityTypesError) {
    return NextResponse.json(
      {
        ok: false,
        error: activityTypesError.message,
      },
      { status: 500 }
    );
  }

  const linksByTemplateId = mapByTemplateId(
    (linksData ?? []) as ActivityTemplateLinkRow[]
  );

  const shortcutsByTemplateId = mapByTemplateId(
    (shortcutsData ?? []) as ActivityShortcutRow[]
  );

  const activityTypesById = mapActivityTypesById(
    (activityTypesData ?? []) as ActivityTypeRow[]
  );

  const responseTemplates = templates.map((template) => {
    const links = linksByTemplateId.get(template.id) ?? [];
    const shortcuts = shortcutsByTemplateId.get(template.id) ?? [];
    const defaultActivityType = template.default_activity_type_id
      ? activityTypesById.get(template.default_activity_type_id) ?? null
      : null;

    return {
      id: template.id,
      slug: template.slug,
      title: template.title,
      shortTitle: template.short_title,
      description: template.description,
      templateGroup: template.template_group,
      templateScope: template.template_scope,
      visibility: template.visibility,
      sourceType: template.source_type,
      status: template.status,
      defaultActivityType,
      defaultDurationMinutes: template.default_duration_minutes,
      quickDurationMinutes: template.quick_duration_minutes ?? [],
      defaultStatus: template.default_status,
      defaultSourceType: template.default_source_type,
      defaultPrivacyScope: template.default_privacy_scope,
      iconKey: template.icon_key,
      colorKey: template.color_key,
      showInQuickCapture: template.show_in_quick_capture,
      showInOnboarding: template.show_in_onboarding,
      allowManualDuration: template.allow_manual_duration,
      allowComment: template.allow_comment,
      allowStartedAtOverride: template.allow_started_at_override,
      allowEndedAtOverride: template.allow_ended_at_override,
      inputSchema: template.input_schema_json ?? {},
      uiSchema: template.ui_schema_json ?? {},
      metadata: template.default_metadata_json ?? {},
      links: links.map((link) => ({
        id: link.id,
        linkedEntityType: link.linked_entity_type,
        linkedEntityId: link.linked_entity_id,
        linkedEntityKey: link.linked_entity_key,
        linkRole: link.link_role,
        relationType: link.relation_type,
        defaultWeight: link.default_weight,
        defaultConfidence: link.default_confidence,
        sourceType: link.source_type,
        isRequired: link.is_required,
        metadata: link.metadata_json ?? {},
      })),
      shortcuts: shortcuts.map((shortcut) => ({
        id: shortcut.id,
        shortcutScope: shortcut.shortcut_scope,
        shortcutType: shortcut.shortcut_type,
        shortcutValue: shortcut.shortcut_value,
        label: shortcut.label,
        description: shortcut.description,
        isFavorite: shortcut.is_favorite,
        showInDefaultUi: shortcut.show_in_default_ui,
        isDeprecatedAlias: shortcut.is_deprecated_alias,
        nfcTagId: shortcut.nfc_tag_id,
        voicePhrase: shortcut.voice_phrase,
        deviceBinding: shortcut.device_binding,
        metadata: shortcut.metadata_json ?? {},
      })),
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };
  });

  return NextResponse.json({
    ok: true,
    count: responseTemplates.length,
    filters: {
      q: query,
      group,
      quickCaptureOnly,
      limit,
    },
    templates: responseTemplates,
  });
}