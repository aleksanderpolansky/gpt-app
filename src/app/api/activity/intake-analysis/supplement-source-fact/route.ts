import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supplementMissingBasicIntakeSourceFactE03V1 } from "@/lib/activity/activity-intake-source-fact-supplement.server";

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

function isInputFailure(message: string) {
  return (
    message.startsWith("E03_SUPPLEMENT_VALUE_") ||
    message === "E03_SUPPLEMENT_NEGATIVE_VALUE_NOT_ALLOWED" ||
    message === "E03_SUPPLEMENT_INPUT_INVALID"
  );
}

function isInfrastructureFailure(message: string) {
  return (
    message.startsWith("E03_SUPPLEMENT_SIGNAL_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_ACTIVITY_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_PROFILE_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_PROFILE_PARAMETER_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_PROFILE_OBJECT_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_PARAMETER_DEFINITION_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_PARAMETER_ASSIGNMENT_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_TARGET_OBJECT_READ_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_GLOBAL_FACT_WRITER_FAILED") ||
    message.startsWith("E03_SUPPLEMENT_SIGNAL_RESULT_UPDATE_FAILED")
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
  const parameterDefinitionId = text(body.parameterDefinitionId);
  const valueObjectId = text(body.valueObjectId);
  const rawValue = text(body.value);

  if (
    !UUID_RE.test(activityEventId) ||
    !UUID_RE.test(parameterDefinitionId) ||
    !UUID_RE.test(valueObjectId) ||
    !rawValue
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid supplement request" },
      { status: 400 },
    );
  }

  try {
    const result = await supplementMissingBasicIntakeSourceFactE03V1({
      appUserId: appUser.id,
      activityEventId,
      parameterDefinitionId,
      valueObjectId,
      rawValue,
    });

    return NextResponse.json({
      ok: true,
      result,
      analysis: result.analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = isInputFailure(message)
      ? 400
      : isInfrastructureFailure(message)
        ? 500
        : 409;

    return NextResponse.json(
      {
        ok: false,
        error: message.slice(0, 700),
      },
      { status },
    );
  }
}
