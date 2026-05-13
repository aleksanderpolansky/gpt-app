import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ActivityCorrectionRow = {
  id: string;
  user_id: string;
  event_id: string;
  correction_type: string;
  correction_status: string;
  changed_fields: string[] | null;
  previous_event_json: unknown;
  new_event_json: unknown;
  previous_impact_events_json: unknown;
  previous_daily_aggregates_json: unknown;
  previous_current_snapshots_json: unknown;
  recalculation_result_json: unknown;
  reason: string | null;
  source: string | null;
  created_at: string;
};

type ActivityEventAccessRow = {
  id: string;
  user_id: string;
};

function parseLimit(value: string | null) {
  if (!value) {
    return 20;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

function normalizeCorrection(row: ActivityCorrectionRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    correctionType: row.correction_type,
    correctionStatus: row.correction_status,
    changedFields: row.changed_fields ?? [],
    reason: row.reason,
    source: row.source,
    createdAt: row.created_at,
    previousEvent: row.previous_event_json,
    newEvent: row.new_event_json,
    previousImpactEvents: row.previous_impact_events_json,
    previousDailyAggregates: row.previous_daily_aggregates_json,
    previousCurrentSnapshots: row.previous_current_snapshots_json,
    recalculationResult: row.recalculation_result_json,
  };
}

async function getActivityEventForAccessCheck(params: {
  eventId: string;
  userId: string;
}) {
  const { eventId, userId } = params;

  const { data, error } = await supabase
    .from("activity_events")
    .select("id,user_id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as ActivityEventAccessRow | null) ?? null;
}

async function getCorrectionRows(params: {
  eventId: string;
  userId: string;
  limit: number;
}) {
  const { eventId, userId, limit } = params;

  const { data, error } = await supabase
    .from("activity_corrections")
    .select(
      [
        "id",
        "user_id",
        "event_id",
        "correction_type",
        "correction_status",
        "changed_fields",
        "previous_event_json",
        "new_event_json",
        "previous_impact_events_json",
        "previous_daily_aggregates_json",
        "previous_current_snapshots_json",
        "recalculation_result_json",
        "reason",
        "source",
        "created_at",
      ].join(",")
    )
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as ActivityCorrectionRow[] | null) ?? [];
}

export async function GET(request: Request, context: RouteContext) {
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

  const params = await context.params;
  const eventId = params.id?.trim();

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Activity event id is required.",
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  try {
    const event = await getActivityEventForAccessCheck({
      eventId,
      userId: appUser.id,
    });

    if (!event) {
      return NextResponse.json(
        {
          ok: false,
          error: "Activity event not found or access denied.",
        },
        { status: 404 }
      );
    }

    const corrections = await getCorrectionRows({
      eventId,
      userId: appUser.id,
      limit,
    });

    return NextResponse.json({
      ok: true,
      endpoint: "/api/activity/events/[id]/corrections",
      eventId,
      filters: {
        limit,
      },
      summary: {
        totalCorrectionsReturned: corrections.length,
      },
      corrections: corrections.map(normalizeCorrection),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load activity correction history.",
      },
      { status: 500 }
    );
  }
}