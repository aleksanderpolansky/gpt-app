import { after, NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import {
  listDurableQuickCaptureSignalsForRecovery,
  processDurableQuickCaptureSignal,
} from "@/lib/activity/aiLabQuickCaptureDurable.server";
import {
  normalizeContentLocale,
  readLocalizedContentEnvelope,
  resolveLocalizedContentFields,
  type ArctorContentLocale,
} from "@/lib/localization/contentLocalization";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_REVIEW_ROWS = 250;
type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isPendingReview(metadata: Row) {
  return metadata.quickCaptureReviewRequired === true && metadata.quickCaptureReviewStatus !== "resolved";
}

const FALLBACK_ACTIVITY: Record<ArctorContentLocale, string> = {
  en: "Activity",
  pl: "Aktywność",
  ru: "Активность",
  uk: "Активність",
  de: "Aktivität",
  es: "Actividad",
  cs: "Aktivita",
};

function mapReviewRow(row: Row, locale: ArctorContentLocale) {
  const metadata = asRecord(row.metadata_json);
  const reviewSnapshot = asRecord(metadata.quickCaptureReviewSnapshot);
  const localization = readLocalizedContentEnvelope(metadata);
  const originalTitle = asString(row.title) ?? asString(row.input_text);
  const originalInputText = asString(row.input_text);
  const localized = resolveLocalizedContentFields({
    metadata,
    locale,
    fallback: {
      title: originalTitle,
      inputText: originalInputText,
      description: null,
    },
  });

  return {
    id: asString(row.id),
    title: localized.title ?? localized.inputText ?? FALLBACK_ACTIVITY[locale],
    inputText: localized.inputText,
    activityRoleCode: asString(row.activity_role_code),
    status: asString(row.status),
    processingStatus: asString(row.processing_status),
    startedAt: asString(row.started_at),
    endedAt: asString(row.ended_at),
    durationMinutes: asNumber(row.duration_minutes),
    scheduleModeCode: asString(row.schedule_mode_code),
    scheduledDate: asString(row.scheduled_date),
    scheduleStartDate: asString(row.schedule_start_date),
    scheduleEndDate: asString(row.schedule_end_date),
    deadlineAt: asString(row.deadline_at),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    reviewStatus: asString(metadata.quickCaptureReviewStatus) ?? "pending",
    reviewContract: asString(metadata.quickCaptureContract),
    reviewLocale: asString(metadata.locale),
    contentSourceLocale: localization?.detectedSourceLocale ?? asString(metadata.locale),
    sourceMessageText: localized.inputText ?? asString(metadata.quickCaptureSourceMessageText),
    sourceSegmentId: asString(metadata.quickCaptureSourceSegmentId),
    reviewSnapshot,
  };
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "User context not found" }, { status: 500 });
  }

  const recoveryCookieHeader = request.headers.get("cookie") ?? "";
  const recoveryOrigin = new URL(request.url).origin;
  after(async () => {
    try {
      const recoverySignals = await listDurableQuickCaptureSignalsForRecovery({
        userId: appUser.id,
        limit: 3,
      });
      for (const signal of recoverySignals) {
        try {
          await processDurableQuickCaptureSignal({
            signalId: signal.id,
            userId: appUser.id,
            actorId: personActor.id,
            cookieHeader: recoveryCookieHeader,
            origin: recoveryOrigin,
          });
        } catch (error) {
          console.error("P5C_DURABLE_REVIEW_WATCHDOG_FAILED", {
            signalId: signal.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      console.error("P5C_DURABLE_REVIEW_WATCHDOG_LIST_FAILED", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const url = new URL(request.url);
  const activityEventId = asString(url.searchParams.get("activityEventId"));
  const locale = normalizeContentLocale(url.searchParams.get("locale"));

  let query = supabase
    .from("activity_events")
    .select("id,title,input_text,activity_role_code,status,processing_status,started_at,ended_at,duration_minutes,schedule_mode_code,scheduled_date,schedule_start_date,schedule_end_date,deadline_at,metadata_json,created_at,updated_at")
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id);

  if (activityEventId) query = query.eq("id", activityEventId);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(activityEventId ? 1 : MAX_REVIEW_ROWS);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = ((data ?? []) as Row[])
    .filter((row) => isPendingReview(asRecord(row.metadata_json)))
    .map((row) => mapReviewRow(row, locale))
    .filter((row) => Boolean(row.id));

  if (activityEventId) {
    const activity = rows[0] ?? null;
    if (!activity) {
      return NextResponse.json({ ok: false, error: "Activity requiring review not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, activity, reviewSnapshot: activity.reviewSnapshot });
  }

  return NextResponse.json({
    ok: true,
    count: rows.length,
    activities: rows.map((row) => {
      const { reviewSnapshot, ...summary } = row;
      void reviewSnapshot;
      return summary;
    }),
  });
}
