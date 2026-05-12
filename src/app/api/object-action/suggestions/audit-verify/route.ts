import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../../../lib/auth0";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AppUserRow = {
  id: string;
  auth0_sub: string;
  email: string | null;
  name: string | null;
};

type PlatformAdminRow = {
  id: string;
  app_user_id: string;
  role: string;
  status: string;
};

type SuggestionRequestRow = {
  id: string;
  status: string;
  ai_status: string | null;
  user_text: string;
};

type SuggestionAuditEventRow = {
  id: string;
  suggestion_request_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  event_type: string;
  event_source: string;
  status_before: string | null;
  status_after: string;
  ai_status_before: string | null;
  ai_status_after: string | null;
  admin_decision: string | null;
  matched_existing_category_id: string | null;
  created_contextual_category_id: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata_json: Record<string, unknown> | null;
  public_note: string | null;
  internal_note: string | null;
  previous_hash: string | null;
  record_hash: string | null;
  created_at: string;
};

type ChainStatus =
  | "chain_start"
  | "linked"
  | "record_hash_missing"
  | "previous_hash_missing"
  | "previous_record_hash_missing"
  | "previous_hash_mismatch"
  | "unexpected_previous_hash"
  | "record_hash_mismatch";

type RecordHashStatus = "valid" | "missing" | "mismatch";

type VerifiedAuditEvent = {
  id: string;
  eventType: string;
  eventSource: string;
  createdAt: string;
  chainStatus: ChainStatus;
  recordHashStatus: RecordHashStatus;
  isValid: boolean;
  previousHash: string | null;
  expectedPreviousHash: string | null;
  recordHash: string | null;
  expectedRecordHash: string | null;
};

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableJsonValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const sortedRecord: Record<string, unknown> = {};

    for (const key of Object.keys(record).sort()) {
      sortedRecord[key] = stableJsonValue(record[key]);
    }

    return sortedRecord;
  }

  return value;
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableJsonValue(value));
}

function sha256Hex(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function normalizeTimestampForHash(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeSuggestionId(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || !isUuid(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}

function createAuthErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function createValidationErrorResponse(message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status: 400 }
  );
}

function createAuditEventHashPayload(auditEvent: SuggestionAuditEventRow) {
  return {
    suggestion_request_id: auditEvent.suggestion_request_id,
    actor_user_id: auditEvent.actor_user_id,
    actor_role: auditEvent.actor_role,
    event_type: auditEvent.event_type,
    event_source: auditEvent.event_source,
    status_before: auditEvent.status_before,
    status_after: auditEvent.status_after,
    ai_status_before: auditEvent.ai_status_before,
    ai_status_after: auditEvent.ai_status_after,
    admin_decision: auditEvent.admin_decision,
    matched_existing_category_id: auditEvent.matched_existing_category_id,
    created_contextual_category_id: auditEvent.created_contextual_category_id,
    previous_values: auditEvent.previous_values,
    new_values: auditEvent.new_values,
    metadata_json: auditEvent.metadata_json ?? {},
    public_note: auditEvent.public_note,
    internal_note: auditEvent.internal_note,
    previous_hash: auditEvent.previous_hash,
    created_at: normalizeTimestampForHash(auditEvent.created_at),
  };
}

function getRecordHashStatus(
  auditEvent: SuggestionAuditEventRow,
  expectedRecordHash: string
): RecordHashStatus {
  if (!auditEvent.record_hash) {
    return "missing";
  }

  if (auditEvent.record_hash === expectedRecordHash) {
    return "valid";
  }

  return "mismatch";
}

function getChainStatus(
  auditEvents: SuggestionAuditEventRow[],
  index: number
): ChainStatus {
  const auditEvent = auditEvents[index];
  const previousEvent = auditEvents[index - 1] ?? null;

  if (!auditEvent.record_hash) {
    return "record_hash_missing";
  }

  if (!previousEvent) {
    if (!auditEvent.previous_hash) {
      return "chain_start";
    }

    return "unexpected_previous_hash";
  }

  if (!previousEvent.record_hash) {
    return "previous_record_hash_missing";
  }

  if (!auditEvent.previous_hash) {
    return "previous_hash_missing";
  }

  if (auditEvent.previous_hash === previousEvent.record_hash) {
    return "linked";
  }

  return "previous_hash_mismatch";
}

function isValidChainStatus(status: ChainStatus) {
  return status === "chain_start" || status === "linked";
}

async function getCurrentAppUser(): Promise<{
  appUser: AppUserRow | null;
  errorMessage: string | null;
  status: number;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorMessage: "Not authenticated.",
      status: 401,
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select(
      `
      id,
      auth0_sub,
      email,
      name
    `
    )
    .eq("auth0_sub", session.user.sub)
    .limit(1);

  if (error) {
    return {
      appUser: null,
      errorMessage: error.message,
      status: 500,
    };
  }

  const appUserRows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!appUserRows[0]) {
    return {
      appUser: null,
      errorMessage: "App user not found.",
      status: 403,
    };
  }

  return {
    appUser: appUserRows[0],
    errorMessage: null,
    status: 200,
  };
}

async function requirePlatformAdmin(): Promise<{
  appUser: AppUserRow | null;
  platformAdmin: PlatformAdminRow | null;
  errorMessage: string | null;
  status: number;
}> {
  const {
    appUser,
    errorMessage: appUserErrorMessage,
    status: appUserStatus,
  } = await getCurrentAppUser();

  if (appUserErrorMessage || !appUser) {
    return {
      appUser: null,
      platformAdmin: null,
      errorMessage: appUserErrorMessage ?? "App user not found.",
      status: appUserStatus,
    };
  }

  const { data, error } = await supabase
    .from("platform_admins")
    .select(
      `
      id,
      app_user_id,
      role,
      status
    `
    )
    .eq("app_user_id", appUser.id)
    .eq("status", "active")
    .limit(1);

  if (error) {
    return {
      appUser,
      platformAdmin: null,
      errorMessage: error.message,
      status: 500,
    };
  }

  const platformAdminRows =
    (data as unknown as PlatformAdminRow[] | null) ?? [];

  if (!platformAdminRows[0]) {
    return {
      appUser,
      platformAdmin: null,
      errorMessage: "Platform admin access required.",
      status: 403,
    };
  }

  return {
    appUser,
    platformAdmin: platformAdminRows[0],
    errorMessage: null,
    status: 200,
  };
}

async function getSuggestionRequest(suggestionId: string): Promise<{
  suggestion: SuggestionRequestRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .select(
      `
      id,
      status,
      ai_status,
      user_text
    `
    )
    .eq("id", suggestionId)
    .limit(1);

  if (error) {
    return {
      suggestion: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as SuggestionRequestRow[] | null) ?? [];

  return {
    suggestion: rows[0] ?? null,
    errorMessage: null,
  };
}

async function getAuditEvents(suggestionId: string): Promise<{
  auditEvents: SuggestionAuditEventRow[];
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("object_action_suggestion_events")
    .select(
      `
      id,
      suggestion_request_id,
      actor_user_id,
      actor_role,
      event_type,
      event_source,
      status_before,
      status_after,
      ai_status_before,
      ai_status_after,
      admin_decision,
      matched_existing_category_id,
      created_contextual_category_id,
      previous_values,
      new_values,
      metadata_json,
      public_note,
      internal_note,
      previous_hash,
      record_hash,
      created_at
    `
    )
    .eq("suggestion_request_id", suggestionId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      auditEvents: [],
      errorMessage: error.message,
    };
  }

  return {
    auditEvents: (data as unknown as SuggestionAuditEventRow[] | null) ?? [],
    errorMessage: null,
  };
}

function verifyAuditEvents(
  auditEvents: SuggestionAuditEventRow[]
): VerifiedAuditEvent[] {
  return auditEvents.map((auditEvent, index) => {
    const expectedPreviousHash = auditEvents[index - 1]?.record_hash ?? null;
    const expectedRecordHash = sha256Hex(
      createAuditEventHashPayload(auditEvent)
    );
    const recordHashStatus = getRecordHashStatus(
      auditEvent,
      expectedRecordHash
    );

    let chainStatus = getChainStatus(auditEvents, index);

    if (recordHashStatus === "mismatch") {
      chainStatus = "record_hash_mismatch";
    }

    const isValid =
      recordHashStatus === "valid" && isValidChainStatus(chainStatus);

    return {
      id: auditEvent.id,
      eventType: auditEvent.event_type,
      eventSource: auditEvent.event_source,
      createdAt: auditEvent.created_at,
      chainStatus,
      recordHashStatus,
      isValid,
      previousHash: auditEvent.previous_hash,
      expectedPreviousHash,
      recordHash: auditEvent.record_hash,
      expectedRecordHash,
    };
  });
}

export async function GET(request: NextRequest) {
  const {
    appUser,
    platformAdmin,
    errorMessage: adminErrorMessage,
    status: adminStatus,
  } = await requirePlatformAdmin();

  if (adminErrorMessage || !appUser || !platformAdmin) {
    return createAuthErrorResponse(
      adminErrorMessage ?? "Platform admin access required.",
      adminStatus
    );
  }

  const suggestionId = normalizeSuggestionId(
    request.nextUrl.searchParams.get("suggestionId")
  );

  if (!suggestionId) {
    return createValidationErrorResponse(
      "suggestionId query parameter must be a valid UUID."
    );
  }

  const { suggestion, errorMessage: suggestionErrorMessage } =
    await getSuggestionRequest(suggestionId);

  if (suggestionErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: suggestionErrorMessage,
      },
      { status: 500 }
    );
  }

  if (!suggestion) {
    return NextResponse.json(
      {
        ok: false,
        error: "Suggestion request not found.",
      },
      { status: 404 }
    );
  }

  const { auditEvents, errorMessage: auditEventsErrorMessage } =
    await getAuditEvents(suggestionId);

  if (auditEventsErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: auditEventsErrorMessage,
      },
      { status: 500 }
    );
  }

  const verifiedEvents = verifyAuditEvents(auditEvents);
  const isValid =
    verifiedEvents.length > 0 &&
    verifiedEvents.every((event) => event.isValid);

  return NextResponse.json({
    ok: true,
    suggestionId,
    suggestion: {
      id: suggestion.id,
      status: suggestion.status,
      aiStatus: suggestion.ai_status,
      userText: suggestion.user_text,
    },
    isValid,
    eventsChecked: verifiedEvents.length,
    events: verifiedEvents,
    summary: {
      validEvents: verifiedEvents.filter((event) => event.isValid).length,
      invalidEvents: verifiedEvents.filter((event) => !event.isValid).length,
      missingRecordHashEvents: verifiedEvents.filter(
        (event) => event.recordHashStatus === "missing"
      ).length,
      mismatchedRecordHashEvents: verifiedEvents.filter(
        (event) => event.recordHashStatus === "mismatch"
      ).length,
    },
    admin: {
      appUserId: appUser.id,
      email: appUser.email,
      role: platformAdmin.role,
    },
  });
}