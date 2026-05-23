import { NextResponse } from "next/server";

import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/activity/debug/create-free-text-start-event";
const P4_STEP = "P4.10.0-C8-P3-B7-C2-C-A2";

type GenericRecord = Record<string, unknown>;

type ActivityEventRow = {
  id: string;
  user_id: string | null;
  performed_by_actor_id: string | null;
  acting_as_actor_id: string | null;
  acting_for_actor_id: string | null;
  activity_type_id: string | null;
  activity_template_id: string | null;
  template_id: string | null;
  event_code: string | null;
  input_text: string | null;
  title: string | null;
  description: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  source: string | null;
  status: string | null;
  privacy_scope: string | null;
  processing_status: string | null;
  metadata_json: GenericRecord | null;
  created_at: string | null;
  updated_at: string | null;
};

function isRecord(value: unknown): value is GenericRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNonEmptyString(value: unknown) {
  const text = asString(value)?.trim();
  return text && text.length > 0 ? text : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readNonEmptyStringFromRecords(
  records: GenericRecord[],
  fieldNames: string[]
) {
  for (const record of records) {
    for (const fieldName of fieldNames) {
      const value = asNonEmptyString(record[fieldName]);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function readBooleanFromRecords(
  records: GenericRecord[],
  fieldNames: string[]
) {
  for (const record of records) {
    for (const fieldName of fieldNames) {
      const value = asBoolean(record[fieldName]);

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

function resolveStartedAt(body: GenericRecord) {
  const rawStartedAt =
    asNonEmptyString(body.startedAt) ??
    asNonEmptyString(body.startTime) ??
    asNonEmptyString(body.started_at);

  if (!rawStartedAt) {
    return new Date().toISOString();
  }

  const date = new Date(rawStartedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function mapActivityEvent(event: ActivityEventRow) {
  return {
    id: event.id,
    userId: event.user_id,
    performedByActorId: event.performed_by_actor_id,
    actingAsActorId: event.acting_as_actor_id,
    actingForActorId: event.acting_for_actor_id,
    activityTypeId: event.activity_type_id,
    activityTemplateId: event.activity_template_id,
    legacyTemplateId: event.template_id,
    eventCode: event.event_code,
    inputText: event.input_text,
    title: event.title,
    description: event.description,
    startedAt: event.started_at,
    endedAt: event.ended_at,
    durationMinutes: event.duration_minutes,
    source: event.source,
    status: event.status,
    privacyScope: event.privacy_scope,
    processingStatus: event.processing_status,
    metadata: event.metadata_json,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

export async function POST(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  let body: GenericRecord;

  try {
    const parsedBody = await request.json();

    if (!isRecord(parsedBody)) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          error: "JSON body must be an object.",
        },
        { status: 400 }
      );
    }

    body = parsedBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  const inputText =
    asNonEmptyString(body.inputText) ??
    asNonEmptyString(body.naturalInput) ??
    asNonEmptyString(body.input_text) ??
    asNonEmptyString(body.description);

  if (!inputText) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error:
          "Missing inputText. Provide inputText or naturalInput, for example: walked to work for 15 minutes.",
      },
      { status: 400 }
    );
  }

  const startedAt = resolveStartedAt(body);

  if (!startedAt) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Invalid startedAt/startTime value.",
      },
      { status: 400 }
    );
  }

  const title =
    asNonEmptyString(body.title) ?? "Free-text started activity — C2-C setup";
  const description = asNonEmptyString(body.description) ?? inputText;

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "User context not found",
        contextContract:
          "Expected getActivityUserContext() to return appUser and personActor.",
      },
      { status: 500 }
    );
  }

  const bodyMetadata = isRecord(body.metadata) ? body.metadata : {};
  const metadataSources = [body, bodyMetadata];

  const proof = readNonEmptyStringFromRecords(metadataSources, [
    "proof",
    "proofMarker",
    "proof_marker",
  ]);
  const requestedP4Step =
    readNonEmptyStringFromRecords(metadataSources, ["p4Step", "p4_step"]) ??
    P4_STEP;
  const purpose = readNonEmptyStringFromRecords(metadataSources, [
    "purpose",
    "proofPurpose",
    "proof_purpose",
  ]);
  const cleanupEligible = readBooleanFromRecords(metadataSources, [
    "cleanupEligible",
    "cleanup_eligible",
  ]);
  const productionPersistProof = readBooleanFromRecords(metadataSources, [
    "productionPersistProof",
    "production_persist_proof",
  ]);
  const nonCanonicalBusinessEvent = readBooleanFromRecords(metadataSources, [
    "nonCanonicalBusinessEvent",
    "non_canonical_business_event",
  ]);

  const proofMetadata: GenericRecord = {};

  if (proof) {
    proofMetadata.proof = proof;
  }

  if (purpose) {
    proofMetadata.purpose = purpose;
  }

  if (cleanupEligible !== null) {
    proofMetadata.cleanupEligible = cleanupEligible;
  }

  if (productionPersistProof !== null) {
    proofMetadata.productionPersistProof = productionPersistProof;
  }

  if (nonCanonicalBusinessEvent !== null) {
    proofMetadata.nonCanonicalBusinessEvent = nonCanonicalBusinessEvent;
  }

  const insertRow: GenericRecord = {
    user_id: appUser.id,
    performed_by_actor_id: personActor.id,
    acting_as_actor_id: personActor.id,
    acting_for_actor_id: personActor.id,

    activity_type_id: null,
    activity_template_id: null,
    template_id: null,
    event_code: null,

    input_text: inputText,
    title,
    description,
    started_at: startedAt,
    ended_at: null,
    duration_minutes: null,

    source: "manual_form",
    status: "started",
    privacy_scope: "private",
    processing_status: "pending",

    metadata_json: {
      ...bodyMetadata,
      ...proofMetadata,
      endpoint: ENDPOINT,
      setupRouteP4Step: P4_STEP,
      p4Step: requestedP4Step,
      setupPurpose:
        "Clean non-completed free-text activity_event for production /api/activity/complete test.",
      semanticBaseline: "walked-to-work-free-text",
      templatePollutionAllowed: false,
      categoryDerivationExecutedHere: false,
      productionRouteUnderTest: "/api/activity/complete",
      createdBy: "debug_setup_route",
    },
  };

  const { data, error } = await supabase
    .from("activity_events")
    .insert(insertRow)
    .select("*")
    .single();

  const createdEvent = data as ActivityEventRow | null;

  if (error || !createdEvent) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: error?.message ?? "Failed to create free-text started event.",
        details: error?.details ?? null,
        hint: error?.hint ?? null,
        code: error?.code ?? null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    p4Step: P4_STEP,
    status: "created_started_free_text_event",
    event: mapActivityEvent(createdEvent),
    setupContract: {
      productionRouteUnderTest: "/api/activity/complete",
      createdStatus: createdEvent.status,
      createdProcessingStatus: createdEvent.processing_status,
      inputText: createdEvent.input_text,
      activityTemplateId: createdEvent.activity_template_id,
      legacyTemplateId: createdEvent.template_id,
      expectedNextStep:
        "POST /api/activity/complete once with this event id, durationMinutes and endedAt.",
      proofMetadataPreserved: {
        proof: proof ?? null,
        p4Step: requestedP4Step,
        purpose: purpose ?? null,
        cleanupEligible,
        productionPersistProof,
        nonCanonicalBusinessEvent,
        setupRouteP4Step: P4_STEP,
      },
    },
  });
}
