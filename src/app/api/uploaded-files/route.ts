import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "uploaded-files-v1" as const;
const ACTIVITY_EVIDENCE_BUCKET = "activity-evidence-media-v1";

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readImageEvidence(value: unknown) {
  const record = asRecord(value);
  if (
    record.kind !== "image" ||
    record.storageBucket !== ACTIVITY_EVIDENCE_BUCKET ||
    !text(record.storagePath) ||
    !text(record.mimeType) ||
    !text(record.originalName) ||
    !text(record.sha256)
  ) {
    return null;
  }
  return {
    originalName: text(record.originalName),
    mimeType: text(record.mimeType),
    sizeBytes: numberValue(record.sizeBytes) ?? 0,
    sha256: text(record.sha256),
  };
}

export async function GET() {
  const { appUser, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser) {
    return NextResponse.json(
      { ok: false, error: "USER_CONTEXT_NOT_FOUND" },
      { status: 500 },
    );
  }

  const { data: signalsData, error: signalsError } = await supabase
    .from("raw_activity_signals")
    .select("id,created_at,metadata_json,raw_payload,output_event_id")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (signalsError) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: signalsError.message },
      { status: 500 },
    );
  }

  const signals = (signalsData ?? []) as Row[];
  const eventIds = [
    ...new Set(signals.map((row) => text(row.output_event_id)).filter(Boolean)),
  ];

  const eventTitleById = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: eventsData, error: eventsError } = await supabase
      .from("activity_events")
      .select("id,title")
      .eq("user_id", appUser.id)
      .in("id", eventIds);

    if (eventsError) {
      return NextResponse.json(
        { ok: false, routeMarker: ROUTE_MARKER, error: eventsError.message },
        { status: 500 },
      );
    }

    for (const row of (eventsData ?? []) as Row[]) {
      const id = text(row.id);
      if (id) eventTitleById.set(id, text(row.title));
    }
  }

  const files = signals.flatMap((row) => {
    const metadata = asRecord(row.metadata_json);
    const rawPayload = asRecord(row.raw_payload);
    const evidence =
      readImageEvidence(metadata.imageEvidence) ??
      readImageEvidence(rawPayload.imageEvidence);
    if (!evidence) return [];

    const signalId = text(row.id);
    if (!signalId) return [];

    const activityEventId = text(row.output_event_id) || null;
    return [{
      id: `activity-signal:${signalId}`,
      kind: "image" as const,
      sourceCode: "ai_navigator_activity_evidence" as const,
      originalName: evidence.originalName,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      createdAt: text(row.created_at),
      previewHref: `/api/uploaded-files/open?signalId=${encodeURIComponent(signalId)}`,
      downloadHref: `/api/uploaded-files/open?signalId=${encodeURIComponent(signalId)}&download=1`,
      relatedActivityEventId: activityEventId,
      relatedActivityTitle:
        (activityEventId ? eventTitleById.get(activityEventId) : null) ?? null,
      relatedHref: activityEventId
        ? `/activity-ai-lab?reviewActivityEventId=${encodeURIComponent(activityEventId)}`
        : null,
    }];
  });

  return NextResponse.json({
    ok: true,
    routeMarker: ROUTE_MARKER,
    files,
    count: files.length,
    coverageCodes: ["activity_evidence_media_v1"],
  });
}
