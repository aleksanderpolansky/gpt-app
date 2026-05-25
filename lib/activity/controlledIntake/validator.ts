import type {
  ControlledActivityIntakeInput,
  ControlledActivityIntakeIssueCode,
  ControlledActivityIntakeSource,
  ControlledActivityIntakeValidationIssue,
  ControlledActivityIntakeValidationResult,
} from "./types";

const MAX_INPUT_TEXT_LENGTH = 4000;
const MAX_TITLE_LENGTH = 240;
const MAX_DURATION_MINUTES = 60 * 24 * 7;

const ALLOWED_SOURCES: readonly ControlledActivityIntakeSource[] = [
  "manual",
  "chat",
  "ui_action",
  "calendar_import",
  "debug",
  "unknown",
];

const FORBIDDEN_CLIENT_FIELD_NAMES = new Set<string>([
  "userId",
  "user_id",
  "appUserId",
  "app_user_id",
  "ownerId",
  "owner_id",
  "actorId",
  "actor_id",
  "organizationId",
  "organization_id",
  "tenantId",
  "tenant_id",
  "workspaceId",
  "workspace_id",
  "profileId",
  "profile_id",
  "auth0UserId",
  "auth0_user_id",
  "createdBy",
  "created_by",
  "updatedBy",
  "updated_by",
  "activityEventId",
  "activity_event_id",
  "categoryCandidates",
  "metricCandidates",
  "stateHookCandidates",
  "valueObjects",
  "stateFacts",
  "stateDeltas",
  "stateSnapshots",
  "semanticProcessingStarted",
  "semanticProcessingCompleted",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(
  issues: ControlledActivityIntakeValidationIssue[],
  code: ControlledActivityIntakeIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function findForbiddenClientFields(
  value: unknown,
  path: string,
  issues: ControlledActivityIntakeValidationIssue[],
): void {
  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;

    if (FORBIDDEN_CLIENT_FIELD_NAMES.has(key)) {
      addIssue(
        issues,
        "FORBIDDEN_CLIENT_FIELD",
        childPath,
        "Client payload must not provide ownership, identity, persistence, semantic-output, or server-controlled fields.",
      );
    }

    const nestedValue = value[key];
    if (isRecord(nestedValue)) {
      findForbiddenClientFields(nestedValue, childPath, issues);
    }
  }
}

function normalizeRequiredString(
  value: unknown,
  fieldName: "inputText" | "title",
  issues: ControlledActivityIntakeValidationIssue[],
): string {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed) {
    addIssue(
      issues,
      fieldName === "inputText" ? "INPUT_TEXT_REQUIRED" : "TITLE_REQUIRED",
      `$.${fieldName}`,
      `${fieldName} is required and must be a non-empty string.`,
    );
    return "";
  }

  if (fieldName === "inputText" && trimmed.length > MAX_INPUT_TEXT_LENGTH) {
    addIssue(
      issues,
      "INPUT_TEXT_TOO_LONG",
      "$.inputText",
      `inputText must be ${MAX_INPUT_TEXT_LENGTH} characters or less.`,
    );
  }

  if (fieldName === "title" && trimmed.length > MAX_TITLE_LENGTH) {
    addIssue(
      issues,
      "TITLE_TOO_LONG",
      "$.title",
      `title must be ${MAX_TITLE_LENGTH} characters or less.`,
    );
  }

  return trimmed;
}

function normalizeOptionalNumber(
  value: unknown,
  issues: ControlledActivityIntakeValidationIssue[],
): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    addIssue(
      issues,
      "DURATION_INVALID",
      "$.durationMinutes",
      "durationMinutes must be a finite number when provided.",
    );
    return null;
  }

  if (value <= 0 || value > MAX_DURATION_MINUTES) {
    addIssue(
      issues,
      "DURATION_INVALID",
      "$.durationMinutes",
      `durationMinutes must be greater than 0 and not exceed ${MAX_DURATION_MINUTES}.`,
    );
    return null;
  }

  return value;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalIsoDateTime(
  value: unknown,
  path: string,
  issues: ControlledActivityIntakeValidationIssue[],
): string | null {
  const normalized = normalizeOptionalString(value);

  if (normalized === null) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    addIssue(
      issues,
      "TIME_INVALID",
      path,
      "Date/time value must be parseable as an ISO-like date/time string.",
    );
    return null;
  }

  return normalized;
}

function normalizeSource(
  value: unknown,
  issues: ControlledActivityIntakeValidationIssue[],
): ControlledActivityIntakeSource {
  if (value === undefined || value === null || value === "") {
    return "manual";
  }

  if (typeof value !== "string") {
    addIssue(
      issues,
      "SOURCE_INVALID",
      "$.source",
      "source must be a string when provided.",
    );
    return "unknown";
  }

  if (ALLOWED_SOURCES.includes(value as ControlledActivityIntakeSource)) {
    return value as ControlledActivityIntakeSource;
  }

  addIssue(
    issues,
    "SOURCE_INVALID",
    "$.source",
    `source must be one of: ${ALLOWED_SOURCES.join(", ")}.`,
  );

  return "unknown";
}

function normalizeOptionalRecord(
  value: unknown,
  path: "$.context" | "$.metadata",
  issues: ControlledActivityIntakeValidationIssue[],
): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    addIssue(
      issues,
      path === "$.context" ? "CONTEXT_INVALID" : "METADATA_INVALID",
      path,
      `${path} must be an object when provided.`,
    );
    return {};
  }

  return value;
}

export function validateControlledActivityIntake(
  input: unknown,
): ControlledActivityIntakeValidationResult {
  const issues: ControlledActivityIntakeValidationIssue[] = [];

  if (!isRecord(input)) {
    addIssue(
      issues,
      "INPUT_NOT_OBJECT",
      "$",
      "Controlled activity intake input must be an object.",
    );

    return {
      ok: false,
      value: null,
      issues,
    };
  }

  findForbiddenClientFields(input, "$", issues);

  const candidate = input as Partial<ControlledActivityIntakeInput>;

  const inputText = normalizeRequiredString(
    candidate.inputText,
    "inputText",
    issues,
  );

  const title = normalizeRequiredString(candidate.title, "title", issues);

  const source = normalizeSource(candidate.source, issues);
  const durationMinutes = normalizeOptionalNumber(
    candidate.durationMinutes,
    issues,
  );

  const startedAt = normalizeOptionalIsoDateTime(
    candidate.startedAt,
    "$.startedAt",
    issues,
  );

  const endedAt = normalizeOptionalIsoDateTime(
    candidate.endedAt,
    "$.endedAt",
    issues,
  );

  const occurredAt = normalizeOptionalIsoDateTime(
    candidate.occurredAt,
    "$.occurredAt",
    issues,
  );

  if (startedAt && endedAt && Date.parse(endedAt) <= Date.parse(startedAt)) {
    addIssue(
      issues,
      "TIME_RANGE_INVALID",
      "$.endedAt",
      "endedAt must be later than startedAt.",
    );
  }

  const timezone = normalizeOptionalString(candidate.timezone);
  const context = normalizeOptionalRecord(candidate.context, "$.context", issues);
  const metadata = normalizeOptionalRecord(
    candidate.metadata,
    "$.metadata",
    issues,
  );

  if (issues.length > 0) {
    return {
      ok: false,
      value: null,
      issues,
    };
  }

  return {
    ok: true,
    value: {
      inputText,
      title,
      source,
      durationMinutes,
      startedAt,
      endedAt,
      occurredAt,
      timezone,
      context,
      metadata,
    },
    issues: [],
  };
}