import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { materializeBasicIntakeSourceFactsE03V1 } from "@/lib/activity/activity-intake-source-fact-materializer.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

  try {
    const result = await materializeBasicIntakeSourceFactsE03V1({
      appUserId: appUser.id,
      activityEventId,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const conflict =
      message.startsWith("E03_") &&
      !message.startsWith("E03_GLOBAL_FACT_WRITER_FAILED") &&
      !message.startsWith("E03_SIGNAL_READ_FAILED") &&
      !message.startsWith("E03_ACTIVITY_READ_FAILED") &&
      !message.startsWith("E03_PROFILE_READ_FAILED") &&
      !message.startsWith("E03_PROFILE_PARAMETER_READ_FAILED") &&
      !message.startsWith("E03_PROFILE_OBJECT_LINK_READ_FAILED") &&
      !message.startsWith("E03_PARAMETER_DEFINITION_READ_FAILED") &&
      !message.startsWith("E03_PARAMETER_ASSIGNMENT_READ_FAILED") &&
      !message.startsWith("E03_TARGET_OBJECT_READ_FAILED") &&
      !message.startsWith("E03_SIGNAL_RESULT_UPDATE_FAILED");

    return NextResponse.json(
      {
        ok: false,
        error: message.slice(0, 700),
      },
      { status: conflict ? 409 : 500 },
    );
  }
}
