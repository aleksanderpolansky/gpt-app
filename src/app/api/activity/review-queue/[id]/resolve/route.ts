import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export async function POST(_request: Request, context: RouteContext) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "User context not found" }, { status: 500 });
  }

  const { id } = await context.params;
  const eventId = id.trim();
  if (!eventId) return NextResponse.json({ ok: false, error: "Activity id is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("activity_events")
    .select("id,metadata_json")
    .eq("id", eventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Activity not found" }, { status: 404 });

  const metadata = asRecord(data.metadata_json);
  if (metadata.quickCaptureReviewRequired !== true) {
    return NextResponse.json({ ok: false, error: "Activity is not in the review buffer" }, { status: 409 });
  }

  const resolvedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("activity_events")
    .update({
      metadata_json: {
        ...metadata,
        quickCaptureReviewStatus: "resolved",
        quickCaptureReviewResolvedAt: resolvedAt,
        quickCaptureReviewResolvedByActorId: personActor.id,
        quickCaptureReviewResolutionContract: "AI_A3_P5C_REVIEW_RESOLUTION_V1",
      },
      updated_at: resolvedAt,
    })
    .eq("id", eventId)
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id);

  if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, activityEventId: eventId, reviewStatus: "resolved", resolvedAt });
}
