import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import {
  ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1,
  materializeBasicIntakeSourceFactsE03V1,
} from "@/lib/activity/activity-intake-source-fact-materializer.server";

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

function normalizeLocale(value: unknown) {
  return value === "en" ||
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "en";
}

function isInfrastructureFailure(message: string) {
  return (
    message.startsWith("E03_GLOBAL_FACT_WRITER_FAILED") ||
    message.startsWith("E03_SIGNAL_READ_FAILED") ||
    message.startsWith("E03_ACTIVITY_READ_FAILED") ||
    message.startsWith("E03_PROFILE_READ_FAILED") ||
    message.startsWith("E03_PROFILE_PARAMETER_READ_FAILED") ||
    message.startsWith("E03_PROFILE_OBJECT_LINK_READ_FAILED") ||
    message.startsWith("E03_PARAMETER_DEFINITION_READ_FAILED") ||
    message.startsWith("E03_PARAMETER_ASSIGNMENT_READ_FAILED") ||
    message.startsWith("E03_TARGET_OBJECT_READ_FAILED") ||
    message.startsWith("E03_SIGNAL_RESULT_UPDATE_FAILED") ||
    message.startsWith("SOURCE_SNAPSHOT_READ_FAILED") ||
    message.startsWith("SOURCE_SNAPSHOT_VALIDATION_FAILED")
  );
}

function reasonCode(message: string) {
  const code = message.split(":", 1)[0]?.trim();
  return code || "E03_PREFLIGHT_BLOCKED";
}

function isEligibilityConflict(message: string) {
  return (message.startsWith("E03_") || message.startsWith("SOURCE_")) &&
    !isInfrastructureFailure(message);
}

export async function GET(request: Request) {
  const { appUser, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  const requestUrl = new URL(request.url);
  const activityEventId = text(
    requestUrl.searchParams.get("activityEventId"),
  );
  const locale = normalizeLocale(
    requestUrl.searchParams.get("locale"),
  );
  if (!UUID_RE.test(activityEventId)) {
    return NextResponse.json(
      { ok: false, error: "activityEventId is invalid" },
      { status: 400 },
    );
  }

  try {
    const preflight = await materializeBasicIntakeSourceFactsE03V1({
      appUserId: appUser.id,
      activityEventId,
      locale,
      preflightOnly: true,
    });

    return NextResponse.json({
      ok: true,
      preflight,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isEligibilityConflict(message)) {
      return NextResponse.json({
        ok: true,
        preflight: {
          contract: ARCTOR_E03_SOURCE_FACT_PREFLIGHT_V1,
          status: "blocked",
          eligible: false,
          activityEventId,
          factsPlanned: 0,
          reasonCode: reasonCode(message),
          error: message.slice(0, 700),
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: message.slice(0, 700),
      },
      { status: 500 },
    );
  }
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
  const locale = normalizeLocale(body.locale);
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
      locale,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const conflict = isEligibilityConflict(message);

    return NextResponse.json(
      {
        ok: false,
        error: message.slice(0, 700),
      },
      { status: conflict ? 409 : 500 },
    );
  }
}
