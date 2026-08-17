import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { analyzeActivityForSemanticReviewA31 } from "@/lib/ai/activitySemanticReviewA31.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  activityEventId?: unknown;
  locale?: unknown;
  timeZone?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const activityEventId = text(body.activityEventId);
  const locale = text(body.locale) || "ru";
  const timeZone = text(body.timeZone) || "UTC";

  if (!validUuid(activityEventId)) {
    return NextResponse.json(
      { ok: false, error: "activityEventId must be a UUID" },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeActivityForSemanticReviewA31({
      appUserId: appUser.id,
      actorId: personActor.id,
      activityEventId,
      locale,
      timeZone,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("NOT_FOUND_OR_NOT_OWNED") ? 404 :
      message.includes("NOT_REVIEW_FIRST_PENDING") ? 409 :
      message.includes("BUDGET_BLOCKED") ? 429 :
      500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
        contract: "ARCTOR_AI_A3_1_SEMANTIC_REVIEW_V1",
      },
      { status },
    );
  }
}
