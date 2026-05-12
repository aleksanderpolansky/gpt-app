import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityStartBody = {
  templateId?: unknown;
  templateSlug?: unknown;
  shortcut?: unknown;
  input?: unknown;
  comment?: unknown;
  title?: unknown;
  startedAt?: unknown;
  startTime?: unknown;
  sourceType?: unknown;
};

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
};

type ResolvedTemplate = {
  template: ActivityTemplateRow;
  resolvedBy: "templateId" | "templateSlug" | "shortcut" | "legacyInputShortcut";
  shortcut: ActivityShortcutRow | null;
};

const ALLOWED_SOURCE_TYPES = new Set([
  "manual",
  "chat_ai",
  "calendar",
  "booking",
  "rule",
  "import",
  "system",
  "manual_form",
  "manual_chat",
  "voice_input",
  "app_action",
  "system_event",
  "api_webhook",
  "nfc_sensor",
  "wearable_import",
  "calendar_import",
  "ai_suggested",
  "legacy_code",
]);

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSourceType(value: unknown, fallback: string) {
  const sourceType = asString(value) ?? fallback;

  if (ALLOWED_SOURCE_TYPES.has(sourceType)) {
    return sourceType;
  }

  return fallback;
}

function inferLegacyShortcutFromInput(input: string | null) {
  if (!input) {
    return null;
  }

  const firstToken = input.split(/\s+/).filter(Boolean)[0];

  return firstToken ?? null;
}

function resolveStartedAt(body: ActivityStartBody) {
  const rawStartedAt = asString(body.startedAt) ?? asString(body.startTime);

  if (!rawStartedAt) {
    return new Date().toISOString();
  }

  const startedDate = new Date(rawStartedAt);

  if (Number.isNaN(startedDate.getTime())) {
    return null;
  }

  return startedDate.toISOString();
}

function hasTemplateAccess(template: ActivityTemplateRow, appUserId: string) {
  if (template.template_scope === "system") {
    return true;
  }

  if (template.template_scope === "user") {
    return template.owner_user_id === appUserId;
  }

  if (
    template.visibility === "public_template" ||
    template.visibility === "public"
  ) {
    return true;
  }

  return false;
}

async function getTemplateById(templateId: string, appUserId: string) {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("*")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const template = data as ActivityTemplateRow | null;

  if (!template || !hasTemplateAccess(template, appUserId)) {
    return null;
  }

  return template;
}

async function getTemplateBySlug(templateSlug: string, appUserId: string) {
  const { data: systemTemplate, error: systemTemplateError } = await supabase
    .from("activity_templates")
    .select("*")
    .eq("slug", templateSlug)
    .eq("template_scope", "system")
    .eq("is_active", true)
    .maybeSingle();

  if (systemTemplateError) {
    throw new Error(systemTemplateError.message);
  }

  if (systemTemplate) {
    return systemTemplate as ActivityTemplateRow;
  }

  const { data: userTemplate, error: userTemplateError } = await supabase
    .from("activity_templates")
    .select("*")
    .eq("slug", templateSlug)
    .eq("template_scope", "user")
    .eq("owner_user_id", appUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (userTemplateError) {
    throw new Error(userTemplateError.message);
  }

  return (userTemplate as ActivityTemplateRow | null) ?? null;
}

async function getShortcut(shortcutValue: string, appUserId: string) {
  const { data, error } = await supabase
    .from("user_activity_shortcuts")
    .select("*")
    .eq("shortcut_value", shortcutValue)
    .eq("is_active", true)
    .or(`shortcut_scope.eq.system,user_id.eq.${appUserId}`)
    .order("shortcut_scope", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const shortcuts = (data ?? []) as ActivityShortcutRow[];

  const userShortcut = shortcuts.find(
    (shortcut) => shortcut.user_id === appUserId
  );

  return userShortcut ?? shortcuts[0] ?? null;
}

async function resolveTemplate(params: {
  body: ActivityStartBody;
  appUserId: string;
}): Promise<ResolvedTemplate | null> {
  const { body, appUserId } = params;

  const templateId = asString(body.templateId);
  const templateSlug = asString(body.templateSlug);
  const shortcutValue = asString(body.shortcut);
  const input = asString(body.input);
  const legacyShortcutFromInput = inferLegacyShortcutFromInput(input);

  if (templateId) {
    const template = await getTemplateById(templateId, appUserId);

    return template
      ? {
          template,
          resolvedBy: "templateId",
          shortcut: null,
        }
      : null;
  }

  if (templateSlug) {
    const template = await getTemplateBySlug(templateSlug, appUserId);

    return template
      ? {
          template,
          resolvedBy: "templateSlug",
          shortcut: null,
        }
      : null;
  }

  if (shortcutValue) {
    const shortcut = await getShortcut(shortcutValue, appUserId);

    if (!shortcut) {
      return null;
    }

    const template = await getTemplateById(shortcut.template_id, appUserId);

    return template
      ? {
          template,
          resolvedBy: "shortcut",
          shortcut,
        }
      : null;
  }

  if (legacyShortcutFromInput) {
    const shortcut = await getShortcut(legacyShortcutFromInput, appUserId);

    if (!shortcut) {
      return null;
    }

    const template = await getTemplateById(shortcut.template_id, appUserId);

    return template
      ? {
          template,
          resolvedBy: "legacyInputShortcut",
          shortcut,
        }
      : null;
  }

  return null;
}

function mapTemplateLinkSourceToEventLinkSource(sourceType: string) {
  if (sourceType === "ai_suggested") {
    return "ai";
  }

  if (sourceType === "imported") {
    return "import";
  }

  if (sourceType === "user_created" || sourceType === "organization_created") {
    return "manual";
  }

  if (sourceType === "system_seed" || sourceType === "legacy_migration") {
    return "template";
  }

  return "template";
}

async function getTemplateLinks(templateId: string) {
  const { data, error } = await supabase
    .from("activity_template_links")
    .select("*")
    .eq("template_id", templateId)
    .eq("is_active", true)
    .order("linked_entity_type", { ascending: true })
    .order("linked_entity_key", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ActivityTemplateLinkRow[];
}

function buildEventLinkRows(params: {
  eventId: string;
  template: ActivityTemplateRow;
  templateLinks: ActivityTemplateLinkRow[];
}) {
  const { eventId, template, templateLinks } = params;

  const templateSelfLink = {
    event_id: eventId,
    linked_entity_type: "activity_template",
    linked_entity_id: template.id,
    linked_entity_key: template.slug,
    link_role: "capture_template",
    relation_type: "created_from",
    weight: 1,
    confidence: 1,
    source: "template",
    metadata_json: {
      template_title: template.title,
      template_scope: template.template_scope,
    },
  };

  const semanticLinks = templateLinks.map((link) => ({
    event_id: eventId,
    linked_entity_type: link.linked_entity_type,
    linked_entity_id: link.linked_entity_id,
    linked_entity_key: link.linked_entity_key,
    link_role: link.link_role,
    relation_type: link.relation_type,
    weight: link.default_weight,
    confidence: link.default_confidence,
    source: mapTemplateLinkSourceToEventLinkSource(link.source_type),
    metadata_json: {
      template_link_id: link.id,
      template_link_source_type: link.source_type,
      is_required: link.is_required,
      ...(link.metadata_json ?? {}),
    },
  }));

  return [templateSelfLink, ...semanticLinks];
}

function buildInputText(params: {
  template: ActivityTemplateRow;
  shortcut: ActivityShortcutRow | null;
  comment: string | null;
}) {
  const { template, shortcut, comment } = params;

  return [
    template.title,
    "started",
    comment,
    shortcut ? `shortcut:${shortcut.shortcut_value}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/start",
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Start an activity session from a template without creating impacts yet."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    example: {
      templateSlug: "german-marketing-handwriting-practice",
      comment: "Started lifecycle smoke test",
      sourceType: "manual_form",
    },
  });
}

export async function POST(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  let body: ActivityStartBody;

  try {
    body = (await request.json()) as ActivityStartBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }

  const startedAt = resolveStartedAt(body);

  if (!startedAt) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid startedAt or startTime",
      },
      { status: 400 }
    );
  }

  let resolvedTemplate: ResolvedTemplate | null = null;

  try {
    resolvedTemplate = await resolveTemplate({
      body,
      appUserId: appUser.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve activity template",
      },
      { status: 500 }
    );
  }

  if (!resolvedTemplate) {
    return NextResponse.json(
      {
        ok: false,
        error: "templateId, templateSlug, shortcut or input is required.",
        example: {
          templateSlug: "german-marketing-handwriting-practice",
          comment: "Started lifecycle smoke test",
        },
      },
      { status: 400 }
    );
  }

  const { template, shortcut, resolvedBy } = resolvedTemplate;
  const comment = asString(body.comment);
  const title = asString(body.title) ?? template.title;
  const source = normalizeSourceType(
    body.sourceType,
    shortcut?.shortcut_type === "legacy_code"
      ? "legacy_code"
      : template.default_source_type
  );

  const { data: createdEvent, error: eventError } = await supabase
    .from("activity_events")
    .insert({
      user_id: appUser.id,
      performed_by_actor_id: personActor.id,
      acting_as_actor_id: personActor.id,
      acting_for_actor_id: personActor.id,
      activity_type_id: template.default_activity_type_id,
      activity_template_id: template.id,
      template_id: template.legacy_activity_code_template_id,
      event_code:
        shortcut?.shortcut_type === "legacy_code"
          ? shortcut.shortcut_value
          : null,
      input_text: buildInputText({
        template,
        shortcut,
        comment,
      }),
      title,
      description: comment ?? template.description,
      started_at: startedAt,
      ended_at: null,
      duration_minutes: null,
      source,
      status: "started",
      privacy_scope: template.default_privacy_scope,
      processing_status: "pending",
      metadata_json: {
        parser: "template_first_v2",
        lifecycle: "started",
        resolved_by: resolvedBy,
        ai_used: false,
        template_slug: template.slug,
        template_scope: template.template_scope,
        template_group: template.template_group,
        shortcut_id: shortcut?.id ?? null,
        shortcut_type: shortcut?.shortcut_type ?? null,
        shortcut_value: shortcut?.shortcut_value ?? null,
        shortcut_is_deprecated_alias: shortcut?.is_deprecated_alias ?? false,
        legacy_code_is_primary_ux: false,
      },
    })
    .select()
    .single();

  if (eventError || !createdEvent) {
    return NextResponse.json(
      {
        ok: false,
        error: eventError?.message ?? "Failed to start activity event",
      },
      { status: 500 }
    );
  }

  const templateLinks = await getTemplateLinks(template.id);

  const eventLinkRows = buildEventLinkRows({
    eventId: createdEvent.id,
    template,
    templateLinks,
  });

  const { data: eventLinks, error: eventLinksError } =
    eventLinkRows.length > 0
      ? await supabase.from("event_links").insert(eventLinkRows).select()
      : { data: [], error: null };

  if (eventLinksError) {
    await supabase
      .from("activity_events")
      .update({ processing_status: "failed" })
      .eq("id", createdEvent.id);

    return NextResponse.json(
      {
        ok: false,
        error: eventLinksError.message,
        event: createdEvent,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "started",
    event: createdEvent,
    eventLinks,
    impactEvents: [],
    lifecycle: {
      startedAt,
      endedAt: null,
      durationMinutes: null,
      impactsCreated: false,
      note:
        "Activity has been started. Impacts, snapshots and aggregates will be created on completion.",
    },
    parser: {
      mode: "template_first_v2",
      resolvedBy,
      templateId: template.id,
      templateSlug: template.slug,
      shortcutUsed: shortcut
        ? {
            shortcutType: shortcut.shortcut_type,
            shortcutValue: shortcut.shortcut_value,
            isDeprecatedAlias: shortcut.is_deprecated_alias,
            showInDefaultUi: shortcut.show_in_default_ui,
          }
        : null,
      aiUsed: false,
    },
  });
}
