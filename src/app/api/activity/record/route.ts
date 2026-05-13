import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import {
  getDurationMs,
  safeCreateActivityProcessingLog,
} from "../../../../../lib/activity/activityProcessingLogs";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { processActivityImpacts } from "../../../../../lib/activity/activityImpactProcessor";
import {
  createRawActivitySignal,
  markRawActivitySignalFailed,
  markRawActivitySignalProcessed,
} from "../../../../../lib/activity/rawActivitySignals";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityRecordBody = {
  templateId?: unknown;
  templateSlug?: unknown;
  shortcut?: unknown;
  naturalInput?: unknown;
  input?: unknown;
  durationMinutes?: unknown;
  comment?: unknown;
  title?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  sourceType?: unknown;
  status?: unknown;
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

type ResolvedTiming = {
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
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

const ALLOWED_STATUSES = new Set([
  "draft",
  "planned",
  "confirmed",
  "completed",
  "cancelled",
  "missed",
  "corrected",
  "started",
  "paused",
  "imported_pending",
  "archived",
]);

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeSourceType(value: unknown, fallback: string) {
  const sourceType = asString(value) ?? fallback;

  if (ALLOWED_SOURCE_TYPES.has(sourceType)) {
    return sourceType;
  }

  return fallback;
}

function normalizeStatus(value: unknown, fallback: string) {
  const status = asString(value) ?? fallback;

  if (ALLOWED_STATUSES.has(status)) {
    return status;
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

function buildInputText(params: {
  template: ActivityTemplateRow | null;
  naturalInput: string | null;
  input: string | null;
  shortcut: ActivityShortcutRow | null;
  durationMinutes: number | null;
  comment: string | null;
}) {
  const {
    template,
    naturalInput,
    input,
    shortcut,
    durationMinutes,
    comment,
  } = params;

  if (naturalInput) {
    return naturalInput;
  }

  if (input) {
    return input;
  }

  if (template) {
    return [
      template.title,
      durationMinutes !== null ? `${durationMinutes} min` : null,
      comment,
      shortcut ? `shortcut:${shortcut.shortcut_value}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  return [durationMinutes !== null ? `${durationMinutes} min` : null, comment]
    .filter(Boolean)
    .join(" | ");
}

function resolveTiming(params: {
  body: ActivityRecordBody;
  durationMinutes: number | null;
  requireDuration: boolean;
}): ResolvedTiming | { error: string } {
  const { body, durationMinutes, requireDuration } = params;

  const rawStartedAt = asString(body.startedAt) ?? asString(body.startTime);
  const rawEndedAt = asString(body.endedAt) ?? asString(body.endTime);

  if (durationMinutes !== null && durationMinutes < 0) {
    return { error: "durationMinutes must be greater than or equal to 0" };
  }

  if (rawStartedAt && rawEndedAt) {
    const startedDate = new Date(rawStartedAt);
    const endedDate = new Date(rawEndedAt);

    if (
      Number.isNaN(startedDate.getTime()) ||
      Number.isNaN(endedDate.getTime())
    ) {
      return { error: "Invalid startedAt or endedAt" };
    }

    if (endedDate.getTime() < startedDate.getTime()) {
      return { error: "endedAt must be greater than or equal to startedAt" };
    }

    const calculatedDurationMinutes = Math.round(
      (endedDate.getTime() - startedDate.getTime()) / 60000
    );

    return {
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes: calculatedDurationMinutes,
    };
  }

  if (rawStartedAt) {
    const startedDate = new Date(rawStartedAt);

    if (Number.isNaN(startedDate.getTime())) {
      return { error: "Invalid startedAt" };
    }

    if (durationMinutes === null) {
      if (requireDuration) {
        return { error: "durationMinutes is required for this activity" };
      }

      return {
        startedAt: startedDate.toISOString(),
        endedAt: null,
        durationMinutes: null,
      };
    }

    const endedDate = new Date(startedDate.getTime() + durationMinutes * 60000);

    return {
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes,
    };
  }

  if (rawEndedAt) {
    const endedDate = new Date(rawEndedAt);

    if (Number.isNaN(endedDate.getTime())) {
      return { error: "Invalid endedAt" };
    }

    if (durationMinutes === null) {
      if (requireDuration) {
        return { error: "durationMinutes is required for this activity" };
      }

      return {
        startedAt: null,
        endedAt: endedDate.toISOString(),
        durationMinutes: null,
      };
    }

    const startedDate = new Date(endedDate.getTime() - durationMinutes * 60000);

    return {
      startedAt: startedDate.toISOString(),
      endedAt: endedDate.toISOString(),
      durationMinutes,
    };
  }

  if (durationMinutes === null) {
    if (requireDuration) {
      return { error: "durationMinutes is required for this activity" };
    }

    return {
      startedAt: null,
      endedAt: null,
      durationMinutes: null,
    };
  }

  const endedDate = new Date();
  const startedDate = new Date(endedDate.getTime() - durationMinutes * 60000);

  return {
    startedAt: startedDate.toISOString(),
    endedAt: endedDate.toISOString(),
    durationMinutes,
  };
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
  body: ActivityRecordBody;
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

async function createNaturalInputDraft(params: {
  appUserId: string;
  actorId: string;
  naturalInput: string;
  durationMinutes: number | null;
  body: ActivityRecordBody;
}) {
  const { appUserId, actorId, naturalInput, durationMinutes, body } = params;

  const timing = resolveTiming({
    body,
    durationMinutes,
    requireDuration: false,
  });

  if ("error" in timing) {
    throw new Error(timing.error);
  }

  const { data: createdEvent, error: eventError } = await supabase
    .from("activity_events")
    .insert({
      user_id: appUserId,
      performed_by_actor_id: actorId,
      acting_as_actor_id: actorId,
      acting_for_actor_id: actorId,
      activity_type_id: null,
      activity_template_id: null,
      template_id: null,
      event_code: null,
      input_text: naturalInput,
      title: asString(body.title) ?? "Unclassified activity draft",
      description: asString(body.comment),
      started_at: timing.startedAt,
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      source: normalizeSourceType(body.sourceType, "manual_chat"),
      status: "draft",
      privacy_scope: "private",
      processing_status: "pending",
      metadata_json: {
        parser: "template_first_v2",
        natural_input_draft: true,
        ai_used: false,
        needs_classification: true,
      },
    })
    .select()
    .single();

  if (eventError || !createdEvent) {
    throw new Error(eventError?.message ?? "Failed to create activity draft");
  }

  return createdEvent;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/record",
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Activity recording endpoint is template-first."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    primaryInputExample: {
      templateSlug: "german-marketing-handwriting-practice",
      durationMinutes: 25,
      comment: "commercial letter handwriting practice",
    },
    supportedFallbacks: {
      templateId: "uuid",
      shortcut: "DE writing",
      legacyShortcut: "11-341",
      naturalInput:
        "I studied German for 25 minutes and wrote a commercial letter by hand.",
    },
    note:
      "Legacy numeric codes are supported only as optional shortcuts, not as the primary UX model.",
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

  let body: ActivityRecordBody;

  try {
    body = (await request.json()) as ActivityRecordBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }

  const naturalInput = asString(body.naturalInput);
  const legacyInput = asString(body.input);
  const durationMinutes = asNumber(body.durationMinutes);
  const comment = asString(body.comment);

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
    const fallbackNaturalInput = naturalInput ?? legacyInput;

    if (fallbackNaturalInput) {
      try {
        const draftEvent = await createNaturalInputDraft({
          appUserId: appUser.id,
          actorId: personActor.id,
          naturalInput: fallbackNaturalInput,
          durationMinutes,
          body,
        });

        return NextResponse.json({
          ok: true,
          status: "draft_created",
          event: draftEvent,
          eventLinks: [],
          parser: {
            mode: "natural_input_draft",
            aiUsed: false,
            needsClassification: true,
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to create natural input draft",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "templateId, templateSlug, shortcut or naturalInput is required.",
        primaryInputExample: {
          templateSlug: "german-marketing-handwriting-practice",
          durationMinutes: 25,
          comment: "commercial letter handwriting practice",
        },
      },
      { status: 400 }
    );
  }

  const { template, shortcut, resolvedBy } = resolvedTemplate;

  const effectiveDurationMinutes =
    durationMinutes ?? template.default_duration_minutes;

  if (effectiveDurationMinutes === null) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "durationMinutes is required because this template has no default duration.",
      },
      { status: 400 }
    );
  }

  const timing = resolveTiming({
    body,
    durationMinutes: effectiveDurationMinutes,
    requireDuration: true,
  });

  if ("error" in timing) {
    return NextResponse.json(
      {
        ok: false,
        error: timing.error,
      },
      { status: 400 }
    );
  }

  const templateLinks = await getTemplateLinks(template.id);

  const source = normalizeSourceType(
    body.sourceType,
    shortcut?.shortcut_type === "legacy_code"
      ? "legacy_code"
      : template.default_source_type
  );

  const status = normalizeStatus(body.status, template.default_status);

  const title = asString(body.title) ?? template.title;

  const inputText = buildInputText({
    template,
    naturalInput,
    input: legacyInput,
    shortcut,
    durationMinutes: timing.durationMinutes,
    comment,
  });

  const processingRunId = randomUUID();
  const processingStartedAt = new Date();

  const rawSignalResult = await createRawActivitySignal({
    userId: appUser.id,
    sourceType: "manual_form",
    rawPayload: {
      endpoint: "/api/activity/record",
      body,
      resolvedBy,
      source,
      status,
    },
    normalizedPreview: {
      templateId: template.id,
      templateSlug: template.slug,
      title,
      source,
      status,
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      durationMinutes: timing.durationMinutes,
    },
    occurredAt: timing.startedAt,
    trustLevel: "medium",
    privacyScope:
      template.default_privacy_scope === "shared_with_org" ||
      template.default_privacy_scope === "public_masked" ||
      template.default_privacy_scope === "public"
        ? template.default_privacy_scope
        : "private",
    processingStatus: "processing",
    metadata: {
      parser: "template_first_v2",
      processingRunId,
      mode: "template_first_completed",
      templateScope: template.template_scope,
      templateGroup: template.template_group,
      shortcutId: shortcut?.id ?? null,
      shortcutType: shortcut?.shortcut_type ?? null,
      shortcutValue: shortcut?.shortcut_value ?? null,
    },
  });

  const rawSignal = rawSignalResult.signal;

  await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: rawSignal?.id ?? null,
    processingRunId,
    processorName: "activity_record_route",
    processingStage: "ingest",
    processingStatus: rawSignalResult.ok ? "completed" : "warning",
    severity: rawSignalResult.ok ? "info" : "warning",
    message: rawSignalResult.ok
      ? "Raw activity signal captured."
      : "Raw activity signal creation failed; continuing without raw signal.",
    input: {
      templateId: template.id,
      templateSlug: template.slug,
      source,
      status,
    },
    output: rawSignal
      ? {
          rawSignalId: rawSignal.id,
        }
      : {},
    error: rawSignalResult.ok
      ? {}
      : {
          message: rawSignalResult.error,
        },
    metadata: {
      endpoint: "/api/activity/record",
      mode: "template_first_completed",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: getDurationMs(processingStartedAt),
  });

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
        shortcut?.shortcut_type === "legacy_code" ? shortcut.shortcut_value : null,
      input_text: inputText,
      title,
      description: comment ?? template.description,
      started_at: timing.startedAt,
      ended_at: timing.endedAt,
      duration_minutes: timing.durationMinutes,
      source,
      status,
      privacy_scope: template.default_privacy_scope,
      processing_status: "processed",
      metadata_json: {
        parser: "template_first_v2",
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
    if (rawSignal) {
      await markRawActivitySignalFailed({
        signalId: rawSignal.id,
        userId: appUser.id,
        error: eventError?.message ?? "Failed to create activity event",
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      processingRunId,
      processorName: "activity_record_route",
      processingStage: "create_event",
      processingStatus: "failed",
      severity: "error",
      message: "Failed to create activity event from template-first raw signal.",
      input: {
        templateId: template.id,
        templateSlug: template.slug,
        title,
      },
      error: {
        message: eventError?.message ?? "Failed to create activity event",
      },
      metadata: {
        endpoint: "/api/activity/record",
        mode: "template_first_completed",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    return NextResponse.json(
      {
        ok: false,
        error: eventError?.message ?? "Failed to create activity event",
      },
      { status: 500 }
    );
  }

  await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: rawSignal?.id ?? null,
    activityEventId: createdEvent.id,
    processingRunId,
    processorName: "activity_record_route",
    processingStage: "create_event",
    processingStatus: "completed",
    severity: "info",
    message: "Activity event created from template-first record flow.",
    input: {
      templateId: template.id,
      templateSlug: template.slug,
      title,
    },
    output: {
      activityEventId: createdEvent.id,
      status: createdEvent.status,
      processingStatus: createdEvent.processing_status,
    },
    metadata: {
      endpoint: "/api/activity/record",
      mode: "template_first_completed",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: getDurationMs(processingStartedAt),
  });

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
    if (rawSignal) {
      await markRawActivitySignalFailed({
        signalId: rawSignal.id,
        userId: appUser.id,
        error: eventLinksError.message,
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: createdEvent.id,
      processingRunId,
      processorName: "activity_record_route",
      processingStage: "link_event",
      processingStatus: "failed",
      severity: "error",
      message: "Failed to create activity event links.",
      input: {
        eventLinkRowsCount: eventLinkRows.length,
      },
      error: {
        message: eventLinksError.message,
      },
      metadata: {
        endpoint: "/api/activity/record",
        mode: "template_first_completed",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    await supabase
      .from("activity_events")
      .update({ processing_status: "failed" })
      .eq("id", createdEvent.id)
      .eq("user_id", appUser.id);

    return NextResponse.json(
      {
        ok: false,
        error: eventLinksError.message,
        event: createdEvent,
      },
      { status: 500 }
    );
  }

  await safeCreateActivityProcessingLog({
    userId: appUser.id,
    rawSignalId: rawSignal?.id ?? null,
    activityEventId: createdEvent.id,
    processingRunId,
    processorName: "activity_record_route",
    processingStage: "link_event",
    processingStatus: "completed",
    severity: "info",
    message: "Activity event links created.",
    input: {
      eventLinkRowsCount: eventLinkRows.length,
    },
    output: {
      eventLinksCount: Array.isArray(eventLinks) ? eventLinks.length : 0,
    },
    metadata: {
      endpoint: "/api/activity/record",
      mode: "template_first_completed",
    },
    startedAt: processingStartedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: getDurationMs(processingStartedAt),
  });

  try {
    const impactResult = await processActivityImpacts({
      eventId: createdEvent.id,
      userId: appUser.id,
      activityTemplateId: createdEvent.activity_template_id,
      activityTypeId: createdEvent.activity_type_id,
      durationMinutes: createdEvent.duration_minutes,
      startedAt: createdEvent.started_at,
    });

    const processedSignalResult = rawSignal
      ? await markRawActivitySignalProcessed({
          signalId: rawSignal.id,
          userId: appUser.id,
          outputEventId: createdEvent.id,
          normalizedPreview: {
            activityEventId: createdEvent.id,
            eventLinksCount: Array.isArray(eventLinks) ? eventLinks.length : 0,
            impactProcessor: {
              ok: impactResult.ok,
              skipped: impactResult.skipped,
              reason: impactResult.reason,
              counts: impactResult.counts,
            },
          },
        })
      : null;

    if (processedSignalResult && !processedSignalResult.ok) {
      await safeCreateActivityProcessingLog({
        userId: appUser.id,
        rawSignalId: rawSignal?.id ?? null,
        activityEventId: createdEvent.id,
        processingRunId,
        processorName: "activity_record_route",
        processingStage: "finalize",
        processingStatus: "warning",
        severity: "warning",
        message: "Activity was recorded, but raw signal could not be marked as processed.",
        error: {
          message: processedSignalResult.error,
        },
        metadata: {
          endpoint: "/api/activity/record",
          mode: "template_first_completed",
        },
        startedAt: processingStartedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: getDurationMs(processingStartedAt),
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: createdEvent.id,
      processingRunId,
      processorName: "activity_record_route",
      processingStage: "process_impacts",
      processingStatus: impactResult.ok ? "completed" : "skipped",
      severity: impactResult.ok ? "info" : "notice",
      message: "Rule-based activity impacts processed.",
      input: {
        activityTemplateId: createdEvent.activity_template_id,
        activityTypeId: createdEvent.activity_type_id,
        durationMinutes: createdEvent.duration_minutes,
      },
      output: {
        ok: impactResult.ok,
        skipped: impactResult.skipped,
        reason: impactResult.reason,
        counts: impactResult.counts,
      },
      metadata: {
        endpoint: "/api/activity/record",
        mode: "template_first_completed",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    return NextResponse.json({
      ok: true,
      status: "recorded",
      event: createdEvent,
      eventLinks,
      impactEvents: impactResult.impactEvents,
      dailyAggregates: impactResult.dailyAggregates,
      currentSnapshots: impactResult.currentSnapshots,
      impactProcessor: {
        ok: impactResult.ok,
        skipped: impactResult.skipped,
        reason: impactResult.reason,
        counts: impactResult.counts,
      },
      rawSignal: rawSignal
        ? {
            id: rawSignal.id,
            processingStatus:
              processedSignalResult?.signal?.processing_status ??
              rawSignal.processing_status,
          }
        : null,
      processingRunId,
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
        durationMinutes: timing.durationMinutes,
        aiUsed: false,
        impactsCreated: impactResult.counts.impactEvents > 0,
        note:
          "Rule-based impacts, daily aggregates and current snapshots were processed without AI.",
      },
    });
  } catch (error) {
    if (rawSignal) {
      await markRawActivitySignalFailed({
        signalId: rawSignal.id,
        userId: appUser.id,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process rule-based activity impacts",
      });
    }

    await safeCreateActivityProcessingLog({
      userId: appUser.id,
      rawSignalId: rawSignal?.id ?? null,
      activityEventId: createdEvent.id,
      processingRunId,
      processorName: "activity_record_route",
      processingStage: "process_impacts",
      processingStatus: "failed",
      severity: "error",
      message: "Failed to process rule-based activity impacts.",
      input: {
        activityTemplateId: createdEvent.activity_template_id,
        activityTypeId: createdEvent.activity_type_id,
        durationMinutes: createdEvent.duration_minutes,
      },
      error,
      metadata: {
        endpoint: "/api/activity/record",
        mode: "template_first_completed",
      },
      startedAt: processingStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: getDurationMs(processingStartedAt),
    });

    await supabase
      .from("activity_events")
      .update({ processing_status: "failed" })
      .eq("id", createdEvent.id)
      .eq("user_id", appUser.id);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process rule-based activity impacts",
        event: createdEvent,
        eventLinks,
      },
      { status: 500 }
    );
  }
}
