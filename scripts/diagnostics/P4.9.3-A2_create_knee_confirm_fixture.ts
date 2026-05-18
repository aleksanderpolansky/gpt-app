import { supabase } from "../../lib/supabase";

const TEMPLATE_SLUG = "knee-training-health-practice";
const BASE_EVENT_ID = "620cfe6f-d3ce-4fd7-a65e-c06584009b7e";

type GenericRow = Record<string, unknown>;

function getString(row: GenericRow | null | undefined, key: string): string | null {
  if (!row) return null;

  const value = row[key];

  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): GenericRow {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as GenericRow;
  }

  return {};
}

async function readTemplate(): Promise<GenericRow> {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("*")
    .eq("slug", TEMPLATE_SLUG)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read activity_template: ${error.message}`);
  }

  if (!data) {
    throw new Error(`activity_template not found: ${TEMPLATE_SLUG}`);
  }

  return data as GenericRow;
}

async function readBaseEvent(templateId: string): Promise<GenericRow> {
  const byId = await supabase
    .from("activity_events")
    .select("*")
    .eq("id", BASE_EVENT_ID)
    .maybeSingle();

  if (byId.error) {
    throw new Error(`Failed to read base event by id: ${byId.error.message}`);
  }

  if (byId.data) {
    return byId.data as GenericRow;
  }

  const fallback = await supabase
    .from("activity_events")
    .select("*")
    .eq("activity_template_id", templateId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (fallback.error) {
    throw new Error(`Failed to read fallback base event: ${fallback.error.message}`);
  }

  const rows = (fallback.data ?? []) as GenericRow[];

  if (rows.length === 0) {
    throw new Error(
      `No base activity_event found for template ${TEMPLATE_SLUG}; create one via record/start first.`
    );
  }

  return rows[0];
}

async function main() {
  const template = await readTemplate();
  const templateId = getString(template, "id");

  if (!templateId) {
    throw new Error(`Template has no id: ${TEMPLATE_SLUG}`);
  }

  const baseEvent = await readBaseEvent(templateId);

  const userId = getString(baseEvent, "user_id");
  const activityTypeId =
    getString(baseEvent, "activity_type_id") ??
    getString(template, "default_activity_type_id");

  if (!userId) {
    throw new Error("Base event has no user_id.");
  }

  if (!activityTypeId) {
    throw new Error("Could not resolve activity_type_id for fixture.");
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - 8 * 60 * 1000).toISOString();
  const endedAt = now.toISOString();
  const runId = `P4.7.9-R-A8d-confirm-${Date.now()}`;

  const row = {
    user_id: userId,
    performed_by_actor_id: getString(baseEvent, "performed_by_actor_id"),
    acting_as_actor_id: getString(baseEvent, "acting_as_actor_id"),
    acting_for_actor_id: getString(baseEvent, "acting_for_actor_id"),
    activity_type_id: activityTypeId,
    activity_template_id: templateId,
    template_id: getString(baseEvent, "template_id"),
    event_code: null,
    input_text: runId,
    title: runId,
    description:
      "A8d imported_pending fixture for confirm route DB-backed resolver verification.",
    started_at: startedAt,
    ended_at: endedAt,
    duration_minutes: 8,
    source: getString(baseEvent, "source") ?? "manual",
    status: "imported_pending",
    privacy_scope:
      getString(baseEvent, "privacy_scope") ??
      getString(template, "default_privacy_scope") ??
      "private",
    processing_status: "processed",
    metadata_json: {
      parser: "p479_r_a8d2_sql_fixture",
      fixtureFlow: "P4.7.9-R-A8d-2a",
      purpose:
        "Create imported_pending activity_event for browser confirm route verification after DB-backed lifecycle resolver patch.",
      templateSlug: TEMPLATE_SLUG,
      baseEventId: getString(baseEvent, "id"),
      requiresHumanReview: true,
      noImpactsCreated: true,
      noDailyAggregatesCreated: true,
      noCurrentSnapshotsCreated: true,
      rawSignalId: null,
      rawSignalSourceType: null,
      importedTemplateMapping: {
        activityTemplateId: templateId,
        activityTypeId,
        templateSlug: TEMPLATE_SLUG,
        source: "server_side_diagnostic_fixture",
      },
    },
  };

  const { data: createdEvent, error: createError } = await supabase
    .from("activity_events")
    .insert(row)
    .select("*")
    .single();

  if (createError || !createdEvent) {
    throw new Error(
      `Failed to create imported_pending fixture: ${
        createError?.message ?? "no createdEvent returned"
      }`
    );
  }

  const created = createdEvent as GenericRow;
  const eventId = getString(created, "id");

  if (!eventId) {
    throw new Error("Created fixture has no id.");
  }

  const browserScript = `(async function () {
  var eventId = "${eventId}";
  var endedAt = new Date().toISOString();

  async function postJson(url, body) {
    var response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    var text = await response.text();
    var json = null;

    try {
      json = JSON.parse(text);
    } catch (e) {
      json = { rawText: text };
    }

    return { status: response.status, ok: response.ok, json: json };
  }

  async function getJson(url) {
    var response = await fetch(url, {
      method: "GET",
      credentials: "include"
    });

    var json = null;

    try {
      json = await response.json();
    } catch (e) {
      json = { rawText: await response.text() };
    }

    return { status: response.status, ok: response.ok, json: json };
  }

  function pickEventId(json) {
    return (
      (json && json.event && json.event.id) ||
      (json && json.activityEvent && json.activityEvent.id) ||
      (json && json.activity_event && json.activity_event.id) ||
      (json && json.updatedEvent && json.updatedEvent.id) ||
      (json && json.activityEventId) ||
      (json && json.eventId) ||
      eventId
    );
  }

  console.log("=== P4.7.9-R-A8d confirm route browser verification ===");
  console.log("fixture eventId:", eventId);

  var confirmResult = await postJson(
    "/api/activity/intake/events/" + encodeURIComponent(eventId) + "/confirm",
    {
      endedAt: endedAt,
      durationMinutes: 8,
      comment: "A8d browser confirm route verification after DB-backed lifecycle resolver patch.",
      reviewNote: "P4.7.9-R-A8d browser confirm verification"
    }
  );

  console.log("confirm status:", confirmResult.status);
  console.log("confirm json:", confirmResult.json);

  var confirmedEventId = pickEventId(confirmResult.json);

  console.log("confirmed eventId:", confirmedEventId);

  var summaryTrace = await getJson(
    "/api/activity/debug-trace?eventId=" +
      encodeURIComponent(confirmedEventId) +
      "&mode=summary&limit=200"
  );

  var fullTrace = await getJson(
    "/api/activity/debug-trace?eventId=" +
      encodeURIComponent(confirmedEventId) +
      "&limit=200"
  );

  var combined = JSON.stringify({
    confirmResult: confirmResult.json,
    summaryTrace: summaryTrace.json,
    fullTrace: fullTrace.json
  });

  var checks = {
    fixtureEventId: eventId,
    confirmedEventId: confirmedEventId,
    confirmOk: confirmResult.ok,
    confirmStatus: confirmResult.status,
    summaryTraceOk: summaryTrace.ok,
    fullTraceOk: fullTrace.ok,
    hasConfirmedCompleted:
      combined.indexOf("confirmed_completed") >= 0 ||
      combined.indexOf("\\\"status\\\":\\\"completed\\\"") >= 0 ||
      combined.indexOf("\\\"status\\\": \\\"completed\\\"") >= 0,
    hasRuleKey:
      combined.indexOf("german_marketing_handwriting_practice_to_business_german") >= 0,
    hasRubricatorText: combined.indexOf("rubricator") >= 0,
    hasDbMetadataSource: combined.indexOf("db_metadata") >= 0,
    hasRuleResolverText: combined.indexOf("ruleResolver") >= 0
  };

  var allOk =
    checks.confirmOk &&
    checks.summaryTraceOk &&
    checks.fullTraceOk &&
    checks.hasConfirmedCompleted &&
    checks.hasRuleKey &&
    checks.hasRubricatorText;

  console.log("A8d checks JSON:");
  console.log(JSON.stringify(checks, null, 2));
  console.log("A8d allOk:", allOk);

  if (allOk) {
    console.log("A8d browser confirm route verification passed at route/debug-trace level.");
  } else {
    console.log("A8d browser confirm route verification needs server-side diagnostic.");
  }
})();`;

  console.log(
    JSON.stringify(
      {
        ok: true,
        step: "P4.7.9-R-A8d-2a",
        fixture: {
          eventId,
          title: getString(created, "title"),
          status: getString(created, "status"),
          processingStatus: getString(created, "processing_status"),
          activityTemplateId: getString(created, "activity_template_id"),
          activityTypeId: getString(created, "activity_type_id"),
          startedAt: getString(created, "started_at"),
          endedAt: getString(created, "ended_at"),
          durationMinutes: created.duration_minutes,
        },
        browserScript,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


