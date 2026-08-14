import { after, NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import {
  createDurableQuickCaptureSignal,
  findDurableQuickCaptureSignalByKey,
  processDurableQuickCaptureSignal,
  readDurableQuickCaptureSignal,
  requeueDurableSignalIfStale,
  summarizeDurableQuickCaptureSignal,
} from "@/lib/activity/aiLabQuickCaptureDurable.server";
import type { ActivityTimingLocalePp1 } from "@/lib/activity/pp1/activityTiming";
import { normalizeQuickCaptureTemporalMode } from "@/lib/activity/quickCaptureTemporalMode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,179}$/;
const IANA_TIME_ZONE_RE = /^[A-Za-z0-9_+\-/]{1,80}$/;
const MAX_INPUT_CHARS = 12_000;

function isSupportedTimeZone(value: string) {
  if (!IANA_TIME_ZONE_RE.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

type SubmitBody = {
  inputText?: unknown;
  locale?: unknown;
  timeZone?: unknown;
  clientRequestId?: unknown;
  temporalDirection?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(value: unknown): ActivityTimingLocalePp1 {
  return value === "en" || value === "pl" || value === "ru" || value === "uk" ||
    value === "de" || value === "es" || value === "cs"
    ? value
    : "ru";
}

function scheduleProcessing(input: {
  signalId: string;
  userId: string;
  actorId: string;
  cookieHeader: string;
  origin: string;
}) {
  after(async () => {
    try {
      await processDurableQuickCaptureSignal(input);
    } catch (error) {
      console.error("P5C_DURABLE_BACKGROUND_FAILED", {
        signalId: input.signalId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "User context not found" }, { status: 500 });
  }

  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const inputText = text(body.inputText);
  const locale = normalizeLocale(body.locale);
  const timeZone = text(body.timeZone) || "UTC";
  const clientRequestId = text(body.clientRequestId);
  const temporalDirection = normalizeQuickCaptureTemporalMode(body.temporalDirection);
  if (!inputText || inputText.length > MAX_INPUT_CHARS) {
    return NextResponse.json({ ok: false, error: `inputText must contain 1-${MAX_INPUT_CHARS} characters` }, { status: 400 });
  }
  if (!REQUEST_ID_RE.test(clientRequestId)) {
    return NextResponse.json({ ok: false, error: "clientRequestId is invalid" }, { status: 400 });
  }
  if (!temporalDirection) {
    return NextResponse.json({ ok: false, error: "temporalDirection must be past or future" }, { status: 400 });
  }
  if (!isSupportedTimeZone(timeZone)) {
    return NextResponse.json({ ok: false, error: "timeZone is invalid" }, { status: 400 });
  }

  const idempotencyKey = `activity_ai_lab_quick_capture:${clientRequestId}`;
  let signal = await findDurableQuickCaptureSignalByKey({
    userId: appUser.id,
    idempotencyKey,
  });

  if (!signal) {
    const created = await createDurableQuickCaptureSignal({
      userId: appUser.id,
      actorId: personActor.id,
      clientRequestId,
      inputText,
      locale,
      timeZone,
      temporalDirection,
      reportedAt: new Date().toISOString(),
    });
    if (!created.signal) {
      signal = await findDurableQuickCaptureSignalByKey({
        userId: appUser.id,
        idempotencyKey,
      });
      if (!signal) {
        return NextResponse.json(
          { ok: false, error: created.error || "Could not persist durable activity receipt" },
          { status: 500 },
        );
      }
    } else {
      signal = created.signal;
    }
  }

  signal = await requeueDurableSignalIfStale(signal);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const origin = new URL(request.url).origin;
  if (signal.processing_status === "pending" || signal.processing_status === "received" || signal.processing_status === "failed") {
    scheduleProcessing({
      signalId: signal.id,
      userId: appUser.id,
      actorId: personActor.id,
      cookieHeader,
      origin,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      duplicate: signal.idempotency_key === idempotencyKey && signal.processing_status !== "pending",
      ...summarizeDurableQuickCaptureSignal(signal),
      note: "The source message is persisted before background analysis starts. The page may be closed after this response is accepted.",
    },
    { status: signal.processing_status === "processed" ? 200 : 202 },
  );
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "User context not found" }, { status: 500 });
  }

  const signalId = text(new URL(request.url).searchParams.get("signalId"));
  if (!signalId) {
    return NextResponse.json({ ok: false, error: "signalId is required" }, { status: 400 });
  }
  let signal = await readDurableQuickCaptureSignal({ signalId, userId: appUser.id });
  if (!signal) {
    return NextResponse.json({ ok: false, error: "Quick capture receipt not found" }, { status: 404 });
  }

  signal = await requeueDurableSignalIfStale(signal);
  if (signal.processing_status === "pending" || signal.processing_status === "received") {
    scheduleProcessing({
      signalId: signal.id,
      userId: appUser.id,
      actorId: personActor.id,
      cookieHeader: request.headers.get("cookie") ?? "",
      origin: new URL(request.url).origin,
    });
  }

  return NextResponse.json({
    ok: true,
    ...summarizeDurableQuickCaptureSignal(signal),
  });
}
