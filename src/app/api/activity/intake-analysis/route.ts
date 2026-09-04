import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { analyzeBasicActivityIntakeV1 } from "@/lib/activity/activity-basic-intake-analysis.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT = "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EVENT_IDS = 50;

type JsonRecord = Record<string, unknown>;

type SignalRow = {
  output_event_id: string | null;
  normalized_preview_json: unknown;
  processing_status: string;
  updated_at: string;
};

type RetrySignalRow = {
  id: string;
  output_event_id: string | null;
  normalized_preview_json: unknown;
  metadata_json: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readEventIds(request: Request) {
  const raw = new URL(request.url).searchParams.get("activityEventIds") ?? "";
  const ids = Array.from(
    new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  if (ids.length > MAX_EVENT_IDS || ids.some((id) => !UUID_RE.test(id))) {
    return null;
  }

  return ids;
}

function normalizeLocale(value: unknown) {
  return value === "en" ||
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "ru";
}

function normalizeTimeZone(value: unknown) {
  const candidate = text(value) || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return "UTC";
  }
}

function isRetryableAnalysis(value: JsonRecord, activityEventId: string) {
  if (
    value.contract !== CONTRACT ||
    value.activityEventId !== activityEventId
  ) {
    return false;
  }

  if (value.retryable !== true) return false;

  return (
    value.analysisMode === "safe_server_fallback" ||
    value.status === "failed" ||
    value.typicalActivitySearchStatus !== "completed"
  );
}

export async function POST(request: Request) {
  const { appUser, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const activityEventId = text(body.activityEventId);
  if (!UUID_RE.test(activityEventId)) {
    return NextResponse.json(
      { ok: false, error: "activityEventId is invalid" },
      { status: 400 },
    );
  }

  const { data: signalData, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select("id,output_event_id,normalized_preview_json,metadata_json")
    .eq("user_id", appUser.id)
    .eq("source_type", "manual_chat")
    .eq("output_event_id", activityEventId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (signalError) {
    return NextResponse.json(
      { ok: false, error: signalError.message },
      { status: 500 },
    );
  }

  if (!signalData) {
    return NextResponse.json(
      { ok: false, error: "Retryable intake signal not found" },
      { status: 404 },
    );
  }

  const signal = signalData as RetrySignalRow;
  const normalized = asRecord(signal.normalized_preview_json);
  const existing = asRecord(normalized.basicIntakeAnalysisV1);

  if (!isRetryableAnalysis(existing, activityEventId)) {
    return NextResponse.json({
      ok: true,
      retried: false,
      analysis: existing,
    });
  }

  const { data: activityData, error: activityError } = await supabase
    .from("activity_events")
    .select("id,acting_as_actor_id")
    .eq("id", activityEventId)
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (activityError) {
    return NextResponse.json(
      { ok: false, error: activityError.message },
      { status: 500 },
    );
  }

  const actorId = text(activityData?.acting_as_actor_id);
  if (!activityData || !actorId) {
    return NextResponse.json(
      { ok: false, error: "Activity actor not found" },
      { status: 404 },
    );
  }

  const metadata = asRecord(signal.metadata_json);
  const locale = normalizeLocale(metadata.locale);
  const timeZone = normalizeTimeZone(metadata.timeZone);

  try {
    const analysis = await analyzeBasicActivityIntakeV1({
      appUserId: appUser.id,
      actorId,
      signalId: signal.id,
      activityEventId,
      locale,
      timeZone,
    });

    return NextResponse.json({
      ok: true,
      retried: true,
      analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: message.slice(0, 500),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  const activityEventIds = readEventIds(request);
  if (!activityEventIds) {
    return NextResponse.json(
      { ok: false, error: "activityEventIds is invalid" },
      { status: 400 },
    );
  }

  if (activityEventIds.length === 0) {
    return NextResponse.json({ ok: true, analyses: [] });
  }

  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select(
      "output_event_id,normalized_preview_json,processing_status,updated_at",
    )
    .eq("user_id", appUser.id)
    .eq("source_type", "manual_chat")
    .in("output_event_id", activityEventIds)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const seen = new Set<string>();
  const analyses: JsonRecord[] = [];

  for (const row of (data ?? []) as SignalRow[]) {
    const activityEventId = text(row.output_event_id);
    if (!activityEventId || seen.has(activityEventId)) continue;
    seen.add(activityEventId);

    const normalized = asRecord(row.normalized_preview_json);
    const stored = asRecord(normalized.basicIntakeAnalysisV1);

    if (
      stored.contract === CONTRACT &&
      stored.activityEventId === activityEventId &&
      ["pending", "completed", "failed"].includes(text(stored.status))
    ) {
      analyses.push(stored);
      continue;
    }

    analyses.push({
      contract: CONTRACT,
      status: "pending",
      activityEventId,
      startedAt: row.updated_at,
      factsWritten: 0,
      automaticTemplateBinding: false,
    });
  }

  return NextResponse.json({
    ok: true,
    analyses,
    requested: activityEventIds.length,
  });
}
