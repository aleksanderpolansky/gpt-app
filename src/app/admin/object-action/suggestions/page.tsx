import Link from "next/link";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";
import SuggestionModerationButtons from "./SuggestionModerationButtons";

export const dynamic = "force-dynamic";

type SuggestionStatusFilter =
  | "all"
  | "draft"
  | "suggested"
  | "needs_review"
  | "approved"
  | "merged"
  | "rejected"
  | "archived";

type AdminSuggestionsPageProps = {
  searchParams?: Promise<{
    status?: string | string[];
    limit?: string | string[];
  }>;
};

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
  user_text: string;
  locale: string;
  context_code: string;
  resolved_context_id: string | null;
  entity_type: string;
  entity_id: string | null;
  request_source: string;
  source_type: string;
  created_by_user_id: string | null;
  proposed_object_text: string | null;
  proposed_action_text: string | null;
  proposed_category_text: string | null;
  ai_status: string;
  ai_confidence: number | null;
  ai_model: string | null;
  ai_prompt_version: string | null;
  ai_suggested_object_text: string | null;
  ai_suggested_action_text: string | null;
  ai_suggested_category_text: string | null;
  ai_suggested_object_type_id: string | null;
  ai_suggested_action_type_id: string | null;
  ai_suggested_contextual_category_id: string | null;
  matched_existing_category_id: string | null;
  ai_analysis_json: Record<string, unknown> | null;
  ai_error_message: string | null;
  status: string;
  admin_decision: string | null;
  admin_comment: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
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

type PageData = {
  appUser: AppUserRow | null;
  platformAdmin: PlatformAdminRow | null;
  suggestions: SuggestionRequestRow[];
  auditEventsBySuggestionId: Record<string, SuggestionAuditEventRow[]>;
  errorMessage: string | null;
  auditErrorMessage: string | null;
  statusFilter: SuggestionStatusFilter;
  limit: number;
};

type AiAnalysisDetails = {
  model: string | null;
  promptVersion: string | null;
  analyzedAt: string | null;
  rationale: string | null;
  riskNotes: string | null;
  safetyNote: string | null;
  categorySlug: string | null;
  existingCategoriesConsidered: number | null;
};

const DEFAULT_STATUS_FILTER: SuggestionStatusFilter = "needs_review";

const STATUS_FILTERS: {
  value: SuggestionStatusFilter;
  label: string;
}[] = [
  { value: "needs_review", label: "Needs review" },
  { value: "all", label: "All" },
  { value: "suggested", label: "Suggested" },
  { value: "approved", label: "Approved" },
  { value: "merged", label: "Merged" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
  { value: "draft", label: "Draft" },
];

const ALLOWED_STATUS_FILTERS = new Set<SuggestionStatusFilter>(
  STATUS_FILTERS.map((item) => item.value)
);

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeStatusFilter(
  value: string | string[] | undefined
): SuggestionStatusFilter {
  const normalizedValue = getFirstSearchParam(value).trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_STATUS_FILTER;
  }

  const typedValue = normalizedValue as SuggestionStatusFilter;

  if (!ALLOWED_STATUS_FILTERS.has(typedValue)) {
    return DEFAULT_STATUS_FILTER;
  }

  return typedValue;
}

function normalizeLimit(value: string | string[] | undefined) {
  const normalizedValue = getFirstSearchParam(value).trim();
  const parsedValue = Number(normalizedValue || "50");

  if (!Number.isFinite(parsedValue)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), 100);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "—";
}

function formatJson(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getStatusStyle(status: string | null | undefined) {
  if (status === "needs_review" || status === "suggested") {
    return {
      background: "#fff8e6",
      color: "#7a4b00",
      border: "1px solid #f0d28a",
    };
  }

  if (status === "approved" || status === "merged") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (status === "rejected") {
    return {
      background: "#fff5f5",
      color: "#a40000",
      border: "1px solid #f2b8b5",
    };
  }

  if (status === "archived") {
    return {
      background: "#f5f5f5",
      color: "#555555",
      border: "1px solid #dddddd",
    };
  }

  return {
    background: "#eff6ff",
    color: "#1e3a8a",
    border: "1px solid #bfdbfe",
  };
}

function getAiStatusStyle(status: string | null | undefined) {
  if (status === "not_requested" || status === "pending") {
    return {
      background: "#f5f5f5",
      color: "#555555",
      border: "1px solid #dddddd",
    };
  }

  if (status === "matched_existing") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (status === "new_category_suggested" || status === "low_confidence") {
    return {
      background: "#fff8e6",
      color: "#7a4b00",
      border: "1px solid #f0d28a",
    };
  }

  if (status === "failed") {
    return {
      background: "#fff5f5",
      color: "#a40000",
      border: "1px solid #f2b8b5",
    };
  }

  return {
    background: "#eff6ff",
    color: "#1e3a8a",
    border: "1px solid #bfdbfe",
  };
}

function getAuditEventStyle(eventType: string | null | undefined) {
  if (eventType === "approve_new_category") {
    return {
      background: "#f0fdf4",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (eventType === "approve_existing_match") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (eventType === "ai_analyzed") {
    return {
      background: "#eff6ff",
      color: "#1e3a8a",
      border: "1px solid #bfdbfe",
    };
  }

  if (eventType === "rejected") {
    return {
      background: "#fff5f5",
      color: "#a40000",
      border: "1px solid #f2b8b5",
    };
  }

  if (eventType === "archived") {
    return {
      background: "#f5f5f5",
      color: "#555555",
      border: "1px solid #dddddd",
    };
  }

  return {
    background: "#fff8e6",
    color: "#7a4b00",
    border: "1px solid #f0d28a",
  };
}

function getStatusFilterHref(status: SuggestionStatusFilter) {
  return `/admin/object-action/suggestions?status=${status}`;
}

function getRecord(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getJsonString(record: Record<string, unknown> | null, key: string) {
  if (!record) {
    return null;
  }

  const value = record[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}

function getJsonNumber(record: Record<string, unknown> | null, key: string) {
  if (!record) {
    return null;
  }

  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function getJsonBoolean(record: Record<string, unknown> | null, key: string) {
  if (!record) {
    return null;
  }

  const value = record[key];

  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function getAiAnalysisDetails(
  suggestion: SuggestionRequestRow
): AiAnalysisDetails {
  const analysisRecord = getRecord(suggestion.ai_analysis_json);

  return {
    model: getJsonString(analysisRecord, "model") ?? suggestion.ai_model,
    promptVersion:
      getJsonString(analysisRecord, "promptVersion") ??
      suggestion.ai_prompt_version,
    analyzedAt: getJsonString(analysisRecord, "analyzedAt"),
    rationale: getJsonString(analysisRecord, "rationale"),
    riskNotes: getJsonString(analysisRecord, "riskNotes"),
    safetyNote: getJsonString(analysisRecord, "safetyNote"),
    categorySlug: getJsonString(analysisRecord, "categorySlug"),
    existingCategoriesConsidered: getJsonNumber(
      analysisRecord,
      "existingCategoriesConsidered"
    ),
  };
}

function hasAiAnalysisDetails(details: AiAnalysisDetails) {
  return Boolean(
    details.model ||
      details.promptVersion ||
      details.analyzedAt ||
      details.rationale ||
      details.riskNotes ||
      details.safetyNote ||
      details.categorySlug ||
      details.existingCategoriesConsidered !== null
  );
}

async function getCurrentAppUser(): Promise<{
  appUser: AppUserRow | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorMessage: "Not authenticated",
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
    };
  }

  const appUserRows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!appUserRows[0]) {
    return {
      appUser: null,
      errorMessage: "App user not found",
    };
  }

  return {
    appUser: appUserRows[0],
    errorMessage: null,
  };
}

async function getPlatformAdmin(appUserId: string): Promise<{
  platformAdmin: PlatformAdminRow | null;
  errorMessage: string | null;
}> {
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
    .eq("app_user_id", appUserId)
    .eq("status", "active")
    .limit(1);

  if (error) {
    return {
      platformAdmin: null,
      errorMessage: error.message,
    };
  }

  const platformAdminRows =
    (data as unknown as PlatformAdminRow[] | null) ?? [];

  if (!platformAdminRows[0]) {
    return {
      platformAdmin: null,
      errorMessage: "Platform admin access required",
    };
  }

  return {
    platformAdmin: platformAdminRows[0],
    errorMessage: null,
  };
}

async function getSuggestionRequests(
  statusFilter: SuggestionStatusFilter,
  limit: number
): Promise<{
  suggestions: SuggestionRequestRow[];
  errorMessage: string | null;
}> {
  let query = supabase
    .from("object_action_suggestion_requests")
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
      source_type,
      created_by_user_id,
      proposed_object_text,
      proposed_action_text,
      proposed_category_text,
      ai_status,
      ai_confidence,
      ai_model,
      ai_prompt_version,
      ai_suggested_object_text,
      ai_suggested_action_text,
      ai_suggested_category_text,
      ai_suggested_object_type_id,
      ai_suggested_action_type_id,
      ai_suggested_contextual_category_id,
      matched_existing_category_id,
      ai_analysis_json,
      ai_error_message,
      status,
      admin_decision,
      admin_comment,
      reviewed_by_user_id,
      reviewed_at,
      created_at,
      updated_at
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return {
      suggestions: [],
      errorMessage: error.message,
    };
  }

  return {
    suggestions: (data as unknown as SuggestionRequestRow[] | null) ?? [],
    errorMessage: null,
  };
}

async function getSuggestionAuditEvents(
  suggestionIds: string[]
): Promise<{
  auditEventsBySuggestionId: Record<string, SuggestionAuditEventRow[]>;
  errorMessage: string | null;
}> {
  if (suggestionIds.length === 0) {
    return {
      auditEventsBySuggestionId: {},
      errorMessage: null,
    };
  }

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
    .in("suggestion_request_id", suggestionIds)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      auditEventsBySuggestionId: {},
      errorMessage: error.message,
    };
  }

  const auditRows = (data as unknown as SuggestionAuditEventRow[] | null) ?? [];

  const auditEventsBySuggestionId: Record<string, SuggestionAuditEventRow[]> =
    {};

  for (const auditEvent of auditRows) {
    const existingEvents =
      auditEventsBySuggestionId[auditEvent.suggestion_request_id] ?? [];

    auditEventsBySuggestionId[auditEvent.suggestion_request_id] = [
      ...existingEvents,
      auditEvent,
    ];
  }

  return {
    auditEventsBySuggestionId,
    errorMessage: null,
  };
}

async function getPageData(
  statusFilter: SuggestionStatusFilter,
  limit: number
): Promise<PageData> {
  const { appUser, errorMessage: appUserErrorMessage } =
    await getCurrentAppUser();

  if (appUserErrorMessage || !appUser) {
    return {
      appUser: null,
      platformAdmin: null,
      suggestions: [],
      auditEventsBySuggestionId: {},
      errorMessage: appUserErrorMessage ?? "Not authenticated",
      auditErrorMessage: null,
      statusFilter,
      limit,
    };
  }

  const { platformAdmin, errorMessage: platformAdminErrorMessage } =
    await getPlatformAdmin(appUser.id);

  if (platformAdminErrorMessage || !platformAdmin) {
    return {
      appUser,
      platformAdmin: null,
      suggestions: [],
      auditEventsBySuggestionId: {},
      errorMessage:
        platformAdminErrorMessage ?? "Platform admin access required",
      auditErrorMessage: null,
      statusFilter,
      limit,
    };
  }

  const { suggestions, errorMessage: suggestionsErrorMessage } =
    await getSuggestionRequests(statusFilter, limit);

  if (suggestionsErrorMessage) {
    return {
      appUser,
      platformAdmin,
      suggestions: [],
      auditEventsBySuggestionId: {},
      errorMessage: suggestionsErrorMessage,
      auditErrorMessage: null,
      statusFilter,
      limit,
    };
  }

  const {
    auditEventsBySuggestionId,
    errorMessage: auditEventsErrorMessage,
  } = await getSuggestionAuditEvents(
    suggestions.map((suggestion) => suggestion.id)
  );

  return {
    appUser,
    platformAdmin,
    suggestions,
    auditEventsBySuggestionId,
    errorMessage: null,
    auditErrorMessage: auditEventsErrorMessage,
    statusFilter,
    limit,
  };
}

export default async function AdminObjectActionSuggestionsPage({
  searchParams,
}: AdminSuggestionsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const statusFilter = normalizeStatusFilter(resolvedSearchParams?.status);
  const limit = normalizeLimit(resolvedSearchParams?.limit);

  const {
    appUser,
    platformAdmin,
    suggestions,
    auditEventsBySuggestionId,
    errorMessage,
    auditErrorMessage,
  } = await getPageData(statusFilter, limit);

  const needsReviewCount = suggestions.filter(
    (suggestion) => suggestion.status === "needs_review"
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1300px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <Link
            href="/directory"
            style={{
              color: "#2563eb",
              textDecoration: "underline",
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            ← Назад в каталог
          </Link>

          <h1
            style={{
              fontSize: "34px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 10px",
            }}
          >
            Object-Action suggestion requests
          </h1>

          <p
            style={{
              margin: "0 0 8px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Moderation queue for user-submitted missing business directions.
            These requests are not public categories and do not change the
            Object-Action Rubricator until explicit moderation.
          </p>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            AI analysis is advisory only. It can suggest object, action and
            category mapping, but it never creates, approves, publishes or
            merges Object-Action Rubricator data automatically.
          </p>
        </header>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "12px",
              padding: "22px",
              background: "#fff5f5",
              color: "#a40000",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Access or loading error</h2>
            <p style={{ marginBottom: 0 }}>{errorMessage}</p>
          </section>
        ) : null}

        {!errorMessage && appUser && platformAdmin ? (
          <>
            {auditErrorMessage ? (
              <section
                style={{
                  border: "1px solid #f0d28a",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#fff8e6",
                  color: "#7a4b00",
                  marginBottom: "24px",
                }}
              >
                <strong>Audit loading warning:</strong> {auditErrorMessage}
              </section>
            ) : null}

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  border: "1px solid #dddddd",
                  borderRadius: "16px",
                  padding: "22px",
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#666666", marginBottom: "8px" }}>
                  Visible requests
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {suggestions.length}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #f0d28a",
                  borderRadius: "16px",
                  padding: "22px",
                  background: "#fff8e6",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#7a4b00", marginBottom: "8px" }}>
                  Needs review in current view
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {needsReviewCount}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "16px",
                  padding: "22px",
                  background: "#eff6ff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#1e3a8a", marginBottom: "8px" }}>
                  Current filter
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>
                  {statusFilter}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #bbf7d0",
                  borderRadius: "16px",
                  padding: "22px",
                  background: "#f0fdf4",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#166534", marginBottom: "8px" }}>
                  Admin
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800 }}>
                  {appUser.email ?? appUser.name ?? appUser.id}
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    color: "#166534",
                    fontSize: "14px",
                  }}
                >
                  role: {platformAdmin.role}
                </div>
              </div>
            </section>

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "16px",
                padding: "18px",
                background: "#f9fafb",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "20px" }}>
                Filters
              </h2>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {STATUS_FILTERS.map((filter) => {
                  const isActive = filter.value === statusFilter;

                  return (
                    <Link
                      key={filter.value}
                      href={getStatusFilterHref(filter.value)}
                      style={{
                        display: "inline-block",
                        border: isActive
                          ? "1px solid #2563eb"
                          : "1px solid #dddddd",
                        borderRadius: "999px",
                        padding: "8px 12px",
                        background: isActive ? "#2563eb" : "#ffffff",
                        color: isActive ? "#ffffff" : "#111111",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      {filter.label}
                    </Link>
                  );
                })}
              </div>
            </section>

            <section
              style={{
                border: "1px solid #dddddd",
                borderRadius: "16px",
                background: "#ffffff",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #eeeeee",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "22px" }}>
                  Suggestion requests
                </h2>
                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  AI Analyze, Approve match, Approve new category, Reject and
                  Archive are available here. Approve match only confirms an
                  AI-matched existing category and does not create a new public
                  category. Approve new category requires explicit admin name,
                  slug and comment. Each moderation action is shown in the
                  audit timeline.
                </p>
              </div>

              {suggestions.length === 0 ? (
                <div style={{ padding: "24px", color: "#666666" }}>
                  No suggestion requests for the selected filter.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                    padding: "20px",
                  }}
                >
                  {suggestions.map((suggestion) => {
                    const statusStyle = getStatusStyle(suggestion.status);
                    const aiStatusStyle = getAiStatusStyle(
                      suggestion.ai_status
                    );
                    const aiAnalysisDetails =
                      getAiAnalysisDetails(suggestion);
                    const shouldShowAiAnalysisDetails = hasAiAnalysisDetails(
                      aiAnalysisDetails
                    );
                    const resolvedMatchedExistingCategoryId =
                      suggestion.matched_existing_category_id ??
                      suggestion.ai_suggested_contextual_category_id;
                    const auditEvents =
                      auditEventsBySuggestionId[suggestion.id] ?? [];

                    return (
                      <article
                        key={suggestion.id}
                        style={{
                          border: "1px solid #dddddd",
                          borderRadius: "16px",
                          padding: "18px",
                          background: "#ffffff",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                          display: "grid",
                          gap: "14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: "#666666",
                                fontSize: "13px",
                                marginBottom: "6px",
                              }}
                            >
                              {suggestion.context_code} ·{" "}
                              {suggestion.request_source}
                            </div>

                            <h3
                              style={{
                                margin: 0,
                                fontSize: "22px",
                                lineHeight: "1.25",
                              }}
                            >
                              {suggestion.user_text}
                            </h3>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                ...statusStyle,
                              }}
                            >
                              {suggestion.status}
                            </span>

                            <span
                              style={{
                                display: "inline-block",
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                ...aiStatusStyle,
                              }}
                            >
                              AI: {suggestion.ai_status}
                            </span>
                          </div>
                        </div>

                        <section
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#f9fafb",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Entity
                            </div>
                            <strong>{suggestion.entity_type}</strong>
                            <div
                              style={{
                                marginTop: "6px",
                                color: "#666666",
                                fontSize: "13px",
                                fontFamily: "monospace",
                              }}
                            >
                              {suggestion.entity_id ?? "no entity id"}
                            </div>
                          </div>

                          <div
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#f9fafb",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Locale
                            </div>
                            <strong>{suggestion.locale}</strong>
                          </div>

                          <div
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#f9fafb",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Created
                            </div>
                            <strong>
                              {formatDateTime(suggestion.created_at)}
                            </strong>
                          </div>

                          <div
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#f9fafb",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Updated
                            </div>
                            <strong>
                              {formatDateTime(suggestion.updated_at)}
                            </strong>
                          </div>
                        </section>

                        <section
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "12px",
                            background: "#ffffff",
                            display: "grid",
                            gap: "8px",
                            lineHeight: "1.45",
                          }}
                        >
                          <div>
                            <strong>Proposed object:</strong>{" "}
                            {suggestion.proposed_object_text ?? "—"}
                          </div>

                          <div>
                            <strong>Proposed action:</strong>{" "}
                            {suggestion.proposed_action_text ?? "—"}
                          </div>

                          <div>
                            <strong>Proposed category:</strong>{" "}
                            {suggestion.proposed_category_text ?? "—"}
                          </div>

                          <div>
                            <strong>AI object:</strong>{" "}
                            {suggestion.ai_suggested_object_text ?? "—"}
                          </div>

                          <div>
                            <strong>AI action:</strong>{" "}
                            {suggestion.ai_suggested_action_text ?? "—"}
                          </div>

                          <div>
                            <strong>AI category:</strong>{" "}
                            {suggestion.ai_suggested_category_text ?? "—"}
                          </div>

                          <div>
                            <strong>AI confidence:</strong>{" "}
                            {formatNumber(suggestion.ai_confidence)}
                          </div>

                          <div>
                            <strong>Matched existing category:</strong>{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {resolvedMatchedExistingCategoryId ?? "—"}
                            </span>
                          </div>
                        </section>

                        <section
                          style={{
                            border:
                              suggestion.ai_error_message ||
                              aiAnalysisDetails.riskNotes
                                ? "1px solid #f0d28a"
                                : "1px solid #bfdbfe",
                            borderRadius: "10px",
                            padding: "12px",
                            background:
                              suggestion.ai_error_message ||
                              aiAnalysisDetails.riskNotes
                                ? "#fff8e6"
                                : "#eff6ff",
                            display: "grid",
                            gap: "10px",
                            lineHeight: "1.45",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              color:
                                suggestion.ai_error_message ||
                                aiAnalysisDetails.riskNotes
                                  ? "#7a4b00"
                                  : "#1e3a8a",
                            }}
                          >
                            AI analysis details
                          </div>

                          <div
                            style={{
                              border: "1px solid #bfdbfe",
                              borderRadius: "8px",
                              padding: "10px",
                              background: "#ffffff",
                              color: "#1e3a8a",
                              fontSize: "13px",
                            }}
                          >
                            <strong>Safety note:</strong>{" "}
                            {aiAnalysisDetails.safetyNote ??
                              "AI analysis is advisory only. It does not create, approve, publish or merge Object-Action Rubricator data."}
                          </div>

                          {shouldShowAiAnalysisDetails ||
                          suggestion.ai_error_message ? (
                            <div
                              style={{
                                display: "grid",
                                gap: "8px",
                              }}
                            >
                              <div>
                                <strong>Rationale:</strong>{" "}
                                {aiAnalysisDetails.rationale ?? "—"}
                              </div>

                              <div>
                                <strong>Risk notes:</strong>{" "}
                                {aiAnalysisDetails.riskNotes ?? "—"}
                              </div>

                              <div>
                                <strong>AI error:</strong>{" "}
                                {suggestion.ai_error_message ?? "—"}
                              </div>

                              <div>
                                <strong>Category slug:</strong>{" "}
                                {aiAnalysisDetails.categorySlug ?? "—"}
                              </div>

                              <div>
                                <strong>Model:</strong>{" "}
                                {aiAnalysisDetails.model ?? "—"}
                              </div>

                              <div>
                                <strong>Prompt version:</strong>{" "}
                                {aiAnalysisDetails.promptVersion ?? "—"}
                              </div>

                              <div>
                                <strong>Analyzed at:</strong>{" "}
                                {formatDateTime(aiAnalysisDetails.analyzedAt)}
                              </div>

                              <div>
                                <strong>
                                  Existing categories considered:
                                </strong>{" "}
                                {formatNumber(
                                  aiAnalysisDetails.existingCategoriesConsidered
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                color: "#555555",
                                fontSize: "13px",
                              }}
                            >
                              AI analysis has not been run for this request yet.
                            </div>
                          )}
                        </section>

                        <SuggestionModerationButtons
                          suggestionId={suggestion.id}
                          currentStatus={suggestion.status}
                          aiStatus={suggestion.ai_status}
                          aiConfidence={suggestion.ai_confidence}
                          aiSuggestedCategoryText={
                            suggestion.ai_suggested_category_text
                          }
                          matchedExistingCategoryId={
                            resolvedMatchedExistingCategoryId
                          }
                        />

                        <section
                          style={{
                            border: "1px solid #d1d5db",
                            borderRadius: "10px",
                            padding: "12px",
                            background: "#f9fafb",
                            display: "grid",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "12px",
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 800,
                                color: "#111111",
                                fontSize: "14px",
                              }}
                            >
                              Moderation timeline / Audit history
                            </div>

                            <div
                              style={{
                                color: "#666666",
                                fontSize: "13px",
                              }}
                            >
                              Events: {auditEvents.length}
                            </div>
                          </div>

                          {auditEvents.length === 0 ? (
                            <div
                              style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "10px",
                                background: "#ffffff",
                                color: "#666666",
                                fontSize: "13px",
                              }}
                            >
                              No audit events yet.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "grid",
                                gap: "10px",
                              }}
                            >
                              {auditEvents.map((auditEvent) => {
                                const auditEventStyle = getAuditEventStyle(
                                  auditEvent.event_type
                                );
                                const publicDataMutation = getJsonBoolean(
                                  auditEvent.metadata_json,
                                  "publicDataMutation"
                                );

                                return (
                                  <article
                                    key={auditEvent.id}
                                    style={{
                                      border: "1px solid #e5e7eb",
                                      borderRadius: "10px",
                                      padding: "12px",
                                      background: "#ffffff",
                                      display: "grid",
                                      gap: "10px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: "10px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: "inline-block",
                                          borderRadius: "999px",
                                          padding: "6px 10px",
                                          fontSize: "13px",
                                          fontWeight: 800,
                                          whiteSpace: "nowrap",
                                          ...auditEventStyle,
                                        }}
                                      >
                                        {auditEvent.event_type}
                                      </span>

                                      <span
                                        style={{
                                          color: "#555555",
                                          fontSize: "13px",
                                        }}
                                      >
                                        {formatDateTime(auditEvent.created_at)}
                                      </span>
                                    </div>

                                    <section
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(auto-fit, minmax(220px, 1fr))",
                                        gap: "8px",
                                        fontSize: "13px",
                                        lineHeight: "1.45",
                                      }}
                                    >
                                      <div>
                                        <strong>Actor:</strong>{" "}
                                        <span
                                          style={{ fontFamily: "monospace" }}
                                        >
                                          {auditEvent.actor_user_id ?? "—"}
                                        </span>
                                      </div>

                                      <div>
                                        <strong>Actor role:</strong>{" "}
                                        {auditEvent.actor_role ?? "—"}
                                      </div>

                                      <div>
                                        <strong>Source:</strong>{" "}
                                        {auditEvent.event_source}
                                      </div>

                                      <div>
                                        <strong>Public mutation:</strong>{" "}
                                        {formatBoolean(publicDataMutation)}
                                      </div>

                                      <div>
                                        <strong>Status:</strong>{" "}
                                        {auditEvent.status_before ?? "—"} →{" "}
                                        {auditEvent.status_after}
                                      </div>

                                      <div>
                                        <strong>AI status:</strong>{" "}
                                        {auditEvent.ai_status_before ?? "—"} →{" "}
                                        {auditEvent.ai_status_after ?? "—"}
                                      </div>

                                      <div>
                                        <strong>Admin decision:</strong>{" "}
                                        {auditEvent.admin_decision ?? "—"}
                                      </div>

                                      <div>
                                        <strong>Matched category:</strong>{" "}
                                        <span
                                          style={{ fontFamily: "monospace" }}
                                        >
                                          {auditEvent.matched_existing_category_id ??
                                            "—"}
                                        </span>
                                      </div>

                                      <div>
                                        <strong>Created category:</strong>{" "}
                                        <span
                                          style={{ fontFamily: "monospace" }}
                                        >
                                          {auditEvent.created_contextual_category_id ??
                                            "—"}
                                        </span>
                                      </div>

                                      <div>
                                        <strong>Record hash:</strong>{" "}
                                        <span
                                          style={{ fontFamily: "monospace" }}
                                        >
                                          {auditEvent.record_hash ?? "—"}
                                        </span>
                                      </div>
                                    </section>

                                    {auditEvent.internal_note ? (
                                      <div
                                        style={{
                                          border: "1px solid #e5e7eb",
                                          borderRadius: "8px",
                                          padding: "10px",
                                          background: "#f9fafb",
                                          color: "#333333",
                                          fontSize: "13px",
                                          lineHeight: "1.45",
                                        }}
                                      >
                                        <strong>Internal note:</strong>{" "}
                                        {auditEvent.internal_note}
                                      </div>
                                    ) : null}

                                    {auditEvent.public_note ? (
                                      <div
                                        style={{
                                          border: "1px solid #bfdbfe",
                                          borderRadius: "8px",
                                          padding: "10px",
                                          background: "#eff6ff",
                                          color: "#1e3a8a",
                                          fontSize: "13px",
                                          lineHeight: "1.45",
                                        }}
                                      >
                                        <strong>Public note:</strong>{" "}
                                        {auditEvent.public_note}
                                      </div>
                                    ) : null}

                                    <details>
                                      <summary
                                        style={{
                                          cursor: "pointer",
                                          color: "#2563eb",
                                          fontWeight: 700,
                                          fontSize: "13px",
                                        }}
                                      >
                                        metadata_json
                                      </summary>
                                      <pre
                                        style={{
                                          marginTop: "8px",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: "8px",
                                          padding: "10px",
                                          background: "#f9fafb",
                                          overflowX: "auto",
                                          fontSize: "12px",
                                          lineHeight: "1.45",
                                        }}
                                      >
                                        {formatJson(auditEvent.metadata_json)}
                                      </pre>
                                    </details>
                                  </article>
                                );
                              })}
                            </div>
                          )}
                        </section>

                        <section
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "12px",
                            background: "#f9fafb",
                            display: "grid",
                            gap: "6px",
                            color: "#444444",
                            fontSize: "13px",
                          }}
                        >
                          <div>
                            <strong>ID:</strong>{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {suggestion.id}
                            </span>
                          </div>

                          <div>
                            <strong>Created by user:</strong>{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {suggestion.created_by_user_id ?? "—"}
                            </span>
                          </div>

                          <div>
                            <strong>Admin decision:</strong>{" "}
                            {suggestion.admin_decision ?? "—"}
                          </div>

                          <div>
                            <strong>Admin comment:</strong>{" "}
                            {suggestion.admin_comment ?? "—"}
                          </div>

                          <div>
                            <strong>Reviewed at:</strong>{" "}
                            {formatDateTime(suggestion.reviewed_at)}
                          </div>
                        </section>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}