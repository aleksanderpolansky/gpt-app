import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type SuggestionRequestBody = {
  userText?: unknown;
  locale?: unknown;
  contextCode?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  requestSource?: unknown;
  proposedObjectText?: unknown;
  proposedActionText?: unknown;
  proposedCategoryText?: unknown;
};

type ContextRow = {
  id: string;
  code: string;
  status: string;
  is_active: boolean;
};

const DEFAULT_LOCALE = "ru";
const DEFAULT_CONTEXT_CODE = "business_directory";
const DEFAULT_ENTITY_TYPE = "general";
const DEFAULT_REQUEST_SOURCE = "api";

const ALLOWED_ENTITY_TYPES = new Set([
  "organization",
  "offer",
  "certificate",
  "purchase_confirmation",
  "personal_activity",
  "health_activity",
  "learning_activity",
  "user_profile",
  "general",
]);

const ALLOWED_REQUEST_SOURCES = new Set([
  "directory_category_picker",
  "organization_profile",
  "organization_onboarding",
  "offer_form",
  "admin_panel",
  "api",
  "import",
  "other",
]);

function normalizeStringValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

function normalizeOptionalStringValue(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function normalizeCodeValue(value: unknown, fallbackValue: string) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return fallbackValue;
  }

  return normalizedValue.toLowerCase();
}

function normalizeLocale(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return DEFAULT_LOCALE;
  }

  return normalizedValue.toLowerCase();
}

function normalizeEntityType(value: unknown) {
  const normalizedValue = normalizeCodeValue(value, DEFAULT_ENTITY_TYPE);

  if (!ALLOWED_ENTITY_TYPES.has(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function normalizeRequestSource(value: unknown) {
  const normalizedValue = normalizeCodeValue(value, DEFAULT_REQUEST_SOURCE);

  if (!ALLOWED_REQUEST_SOURCES.has(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeEntityId(value: unknown) {
  const normalizedValue = normalizeStringValue(value);

  if (!normalizedValue) {
    return null;
  }

  if (!isUuid(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

async function getResolvedContext(contextCode: string) {
  const { data, error } = await supabase
    .from("contexts")
    .select(
      `
      id,
      code,
      status,
      is_active
    `
    )
    .eq("code", contextCode)
    .eq("is_active", true)
    .in("status", ["approved", "published"])
    .limit(1);

  if (error) {
    return {
      context: null,
      errorMessage: error.message,
    };
  }

  const contextRows = (data as unknown as ContextRow[] | null) ?? [];

  return {
    context: contextRows[0] ?? null,
    errorMessage: null,
  };
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

export async function POST(request: NextRequest) {
  let body: SuggestionRequestBody;

  try {
    body = (await request.json()) as SuggestionRequestBody;
  } catch {
    return createValidationErrorResponse("Invalid JSON body.");
  }

  const userText = normalizeStringValue(body.userText);

  if (!userText) {
    return createValidationErrorResponse("userText is required.");
  }

  if (userText.length > 4000) {
    return createValidationErrorResponse(
      "userText must be 4000 characters or shorter."
    );
  }

  const locale = normalizeLocale(body.locale);

  if (locale.length > 20) {
    return createValidationErrorResponse(
      "locale must be 20 characters or shorter."
    );
  }

  const contextCode = normalizeCodeValue(
    body.contextCode,
    DEFAULT_CONTEXT_CODE
  );

  const entityType = normalizeEntityType(body.entityType);

  if (!entityType) {
    return createValidationErrorResponse("Unsupported entityType.");
  }

  const entityId = normalizeEntityId(body.entityId);

  if (body.entityId && !entityId) {
    return createValidationErrorResponse("entityId must be a valid UUID.");
  }

  const requestSource = normalizeRequestSource(body.requestSource);

  if (!requestSource) {
    return createValidationErrorResponse("Unsupported requestSource.");
  }

  const { context, errorMessage: contextErrorMessage } =
    await getResolvedContext(contextCode);

  if (contextErrorMessage) {
    return NextResponse.json(
      {
        ok: false,
        error: contextErrorMessage,
      },
      { status: 500 }
    );
  }

  if (!context) {
    return createValidationErrorResponse("contextCode was not found.");
  }

  const proposedObjectText = normalizeOptionalStringValue(
    body.proposedObjectText
  );
  const proposedActionText = normalizeOptionalStringValue(
    body.proposedActionText
  );
  const proposedCategoryText = normalizeOptionalStringValue(
    body.proposedCategoryText
  );

  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .insert({
      user_text: userText,
      locale,
      context_code: context.code,
      resolved_context_id: context.id,
      entity_type: entityType,
      entity_id: entityId,
      request_source: requestSource,
      source_type: "user_submitted",
      proposed_object_text: proposedObjectText,
      proposed_action_text: proposedActionText,
      proposed_category_text: proposedCategoryText,
      ai_status: "not_requested",
      ai_analysis_json: {},
      status: "needs_review",
    })
    .select(
      `
      id,
      user_text,
      locale,
      context_code,
      resolved_context_id,
      entity_type,
      entity_id,
      request_source,
      ai_status,
      status,
      created_at
    `
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      suggestionRequest: data,
    },
    { status: 201 }
  );
}