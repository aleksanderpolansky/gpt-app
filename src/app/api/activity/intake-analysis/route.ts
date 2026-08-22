import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
