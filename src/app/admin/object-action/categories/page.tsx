import Link from "next/link";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type CategoryStatusFilter =
  | "all"
  | "draft"
  | "suggested"
  | "approved"
  | "published"
  | "archived";

type ActiveFilter = "all" | "active" | "inactive";

type AdminCategoriesPageProps = {
  searchParams?: Promise<{
    status?: string | string[];
    active?: string | string[];
    context?: string | string[];
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

type ContextRow = {
  id: string;
  code: string;
  status: string;
  is_active: boolean;
};

type ContextualCategoryRow = {
  id: string;
  context_id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  source_type: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryOriginEventRow = {
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
  metadata_json: Record<string, unknown> | null;
  internal_note: string | null;
  previous_hash: string | null;
  record_hash: string | null;
  created_at: string;
};

type OriginSuggestionRow = {
  id: string;
  user_text: string;
  locale: string;
  context_code: string;
  entity_type: string;
  entity_id: string | null;
  request_source: string;
  source_type: string;
  created_by_user_id: string | null;
  ai_status: string | null;
  ai_confidence: number | null;
  ai_suggested_object_text: string | null;
  ai_suggested_action_text: string | null;
  ai_suggested_category_text: string | null;
  status: string;
  admin_decision: string | null;
  admin_comment: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CategoryOriginData = {
  event: CategoryOriginEventRow;
  suggestion: OriginSuggestionRow | null;
};

type PageData = {
  appUser: AppUserRow | null;
  platformAdmin: PlatformAdminRow | null;
  categories: ContextualCategoryRow[];
  contextsById: Record<string, ContextRow>;
  originsByCategoryId: Record<string, CategoryOriginData>;
  errorMessage: string | null;
  contextErrorMessage: string | null;
  originErrorMessage: string | null;
  statusFilter: CategoryStatusFilter;
  activeFilter: ActiveFilter;
  contextFilter: string;
  limit: number;
};

const DEFAULT_STATUS_FILTER: CategoryStatusFilter = "all";
const DEFAULT_ACTIVE_FILTER: ActiveFilter = "active";
const DEFAULT_LIMIT = 100;

const STATUS_FILTERS: {
  value: CategoryStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
  { value: "suggested", label: "Suggested" },
  { value: "draft", label: "Draft" },
];

const ACTIVE_FILTERS: {
  value: ActiveFilter;
  label: string;
}[] = [
  { value: "active", label: "Active only" },
  { value: "all", label: "All" },
  { value: "inactive", label: "Inactive only" },
];

const ALLOWED_STATUS_FILTERS = new Set<CategoryStatusFilter>(
  STATUS_FILTERS.map((item) => item.value)
);

const ALLOWED_ACTIVE_FILTERS = new Set<ActiveFilter>(
  ACTIVE_FILTERS.map((item) => item.value)
);

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeStatusFilter(
  value: string | string[] | undefined
): CategoryStatusFilter {
  const normalizedValue = getFirstSearchParam(value).trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_STATUS_FILTER;
  }

  const typedValue = normalizedValue as CategoryStatusFilter;

  if (!ALLOWED_STATUS_FILTERS.has(typedValue)) {
    return DEFAULT_STATUS_FILTER;
  }

  return typedValue;
}

function normalizeActiveFilter(
  value: string | string[] | undefined
): ActiveFilter {
  const normalizedValue = getFirstSearchParam(value).trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_ACTIVE_FILTER;
  }

  const typedValue = normalizedValue as ActiveFilter;

  if (!ALLOWED_ACTIVE_FILTERS.has(typedValue)) {
    return DEFAULT_ACTIVE_FILTER;
  }

  return typedValue;
}

function normalizeContextFilter(value: string | string[] | undefined) {
  return getFirstSearchParam(value).trim().toLowerCase();
}

function normalizeLimit(value: string | string[] | undefined) {
  const normalizedValue = getFirstSearchParam(value).trim();
  const parsedValue = Number(normalizedValue || String(DEFAULT_LIMIT));

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsedValue), 1), 300);
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
  if (status === "approved" || status === "published") {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (status === "archived") {
    return {
      background: "#f5f5f5",
      color: "#555555",
      border: "1px solid #dddddd",
    };
  }

  if (status === "suggested" || status === "draft") {
    return {
      background: "#fff8e6",
      color: "#7a4b00",
      border: "1px solid #f0d28a",
    };
  }

  return {
    background: "#eff6ff",
    color: "#1e3a8a",
    border: "1px solid #bfdbfe",
  };
}

function getActiveStyle(isActive: boolean) {
  if (isActive) {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  return {
    background: "#fff5f5",
    color: "#a40000",
    border: "1px solid #f2b8b5",
  };
}

function getOriginStyle(origin: CategoryOriginData | null) {
  if (origin) {
    return {
      background: "#eff6ff",
      color: "#1e3a8a",
      border: "1px solid #bfdbfe",
    };
  }

  return {
    background: "#f5f5f5",
    color: "#555555",
    border: "1px solid #dddddd",
  };
}

function getFilterHref(params: {
  status?: CategoryStatusFilter;
  active?: ActiveFilter;
  context?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();

  searchParams.set("status", params.status ?? DEFAULT_STATUS_FILTER);
  searchParams.set("active", params.active ?? DEFAULT_ACTIVE_FILTER);

  if (params.context) {
    searchParams.set("context", params.context);
  }

  if (params.limit && params.limit !== DEFAULT_LIMIT) {
    searchParams.set("limit", String(params.limit));
  }

  return `/admin/object-action/categories?${searchParams.toString()}`;
}

function getOriginSuggestionHref(suggestion: OriginSuggestionRow | null) {
  if (!suggestion) {
    return "/admin/object-action/suggestions?status=all";
  }

  return `/admin/object-action/suggestions?status=${suggestion.status}`;
}

function getAuditVerifyHref(suggestion: OriginSuggestionRow | null) {
  if (!suggestion) {
    return null;
  }

  return `/api/object-action/suggestions/audit-verify?suggestionId=${suggestion.id}`;
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

async function getContextualCategories(
  statusFilter: CategoryStatusFilter,
  activeFilter: ActiveFilter,
  contextFilter: string,
  limit: number
): Promise<{
  categories: ContextualCategoryRow[];
  errorMessage: string | null;
}> {
  let query = supabase
    .from("contextual_categories")
    .select(
      `
      id,
      context_id,
      parent_id,
      slug,
      name,
      description,
      status,
      source_type,
      sort_order,
      is_active,
      created_at,
      updated_at
    `
    )
    .order("context_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (activeFilter === "active") {
    query = query.eq("is_active", true);
  }

  if (activeFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  if (contextFilter) {
    query = query.eq("context_id", contextFilter);
  }

  const { data, error } = await query;

  if (error) {
    return {
      categories: [],
      errorMessage: error.message,
    };
  }

  return {
    categories: (data as unknown as ContextualCategoryRow[] | null) ?? [],
    errorMessage: null,
  };
}

async function getContextsById(contextIds: string[]): Promise<{
  contextsById: Record<string, ContextRow>;
  errorMessage: string | null;
}> {
  const uniqueContextIds = Array.from(new Set(contextIds));

  if (uniqueContextIds.length === 0) {
    return {
      contextsById: {},
      errorMessage: null,
    };
  }

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
    .in("id", uniqueContextIds);

  if (error) {
    return {
      contextsById: {},
      errorMessage: error.message,
    };
  }

  const contextRows = (data as unknown as ContextRow[] | null) ?? [];

  const contextsById: Record<string, ContextRow> = {};

  for (const context of contextRows) {
    contextsById[context.id] = context;
  }

  return {
    contextsById,
    errorMessage: null,
  };
}

async function getOriginSuggestionsById(
  suggestionIds: string[]
): Promise<{
  suggestionsById: Record<string, OriginSuggestionRow>;
  errorMessage: string | null;
}> {
  const uniqueSuggestionIds = Array.from(new Set(suggestionIds));

  if (uniqueSuggestionIds.length === 0) {
    return {
      suggestionsById: {},
      errorMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("object_action_suggestion_requests")
    .select(
      `
      id,
      user_text,
      locale,
      context_code,
      entity_type,
      entity_id,
      request_source,
      source_type,
      created_by_user_id,
      ai_status,
      ai_confidence,
      ai_suggested_object_text,
      ai_suggested_action_text,
      ai_suggested_category_text,
      status,
      admin_decision,
      admin_comment,
      reviewed_by_user_id,
      reviewed_at,
      created_at,
      updated_at
    `
    )
    .in("id", uniqueSuggestionIds);

  if (error) {
    return {
      suggestionsById: {},
      errorMessage: error.message,
    };
  }

  const suggestionRows = (data as unknown as OriginSuggestionRow[] | null) ?? [];

  const suggestionsById: Record<string, OriginSuggestionRow> = {};

  for (const suggestion of suggestionRows) {
    suggestionsById[suggestion.id] = suggestion;
  }

  return {
    suggestionsById,
    errorMessage: null,
  };
}

async function getCategoryOriginsByCategoryId(
  categoryIds: string[]
): Promise<{
  originsByCategoryId: Record<string, CategoryOriginData>;
  errorMessage: string | null;
}> {
  const uniqueCategoryIds = Array.from(new Set(categoryIds));

  if (uniqueCategoryIds.length === 0) {
    return {
      originsByCategoryId: {},
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
      metadata_json,
      internal_note,
      previous_hash,
      record_hash,
      created_at
    `
    )
    .eq("event_type", "approve_new_category")
    .in("created_contextual_category_id", uniqueCategoryIds)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      originsByCategoryId: {},
      errorMessage: error.message,
    };
  }

  const eventRows = (data as unknown as CategoryOriginEventRow[] | null) ?? [];

  const {
    suggestionsById,
    errorMessage: suggestionsErrorMessage,
  } = await getOriginSuggestionsById(
    eventRows.map((event) => event.suggestion_request_id)
  );

  if (suggestionsErrorMessage) {
    return {
      originsByCategoryId: {},
      errorMessage: suggestionsErrorMessage,
    };
  }

  const originsByCategoryId: Record<string, CategoryOriginData> = {};

  for (const event of eventRows) {
    if (!event.created_contextual_category_id) {
      continue;
    }

    if (originsByCategoryId[event.created_contextual_category_id]) {
      continue;
    }

    originsByCategoryId[event.created_contextual_category_id] = {
      event,
      suggestion: suggestionsById[event.suggestion_request_id] ?? null,
    };
  }

  return {
    originsByCategoryId,
    errorMessage: null,
  };
}

async function getPageData(
  statusFilter: CategoryStatusFilter,
  activeFilter: ActiveFilter,
  contextFilter: string,
  limit: number
): Promise<PageData> {
  const { appUser, errorMessage: appUserErrorMessage } =
    await getCurrentAppUser();

  if (appUserErrorMessage || !appUser) {
    return {
      appUser: null,
      platformAdmin: null,
      categories: [],
      contextsById: {},
      originsByCategoryId: {},
      errorMessage: appUserErrorMessage ?? "Not authenticated",
      contextErrorMessage: null,
      originErrorMessage: null,
      statusFilter,
      activeFilter,
      contextFilter,
      limit,
    };
  }

  const { platformAdmin, errorMessage: platformAdminErrorMessage } =
    await getPlatformAdmin(appUser.id);

  if (platformAdminErrorMessage || !platformAdmin) {
    return {
      appUser,
      platformAdmin: null,
      categories: [],
      contextsById: {},
      originsByCategoryId: {},
      errorMessage:
        platformAdminErrorMessage ?? "Platform admin access required",
      contextErrorMessage: null,
      originErrorMessage: null,
      statusFilter,
      activeFilter,
      contextFilter,
      limit,
    };
  }

  const { categories, errorMessage: categoriesErrorMessage } =
    await getContextualCategories(
      statusFilter,
      activeFilter,
      contextFilter,
      limit
    );

  if (categoriesErrorMessage) {
    return {
      appUser,
      platformAdmin,
      categories: [],
      contextsById: {},
      originsByCategoryId: {},
      errorMessage: categoriesErrorMessage,
      contextErrorMessage: null,
      originErrorMessage: null,
      statusFilter,
      activeFilter,
      contextFilter,
      limit,
    };
  }

  const { contextsById, errorMessage: contextsErrorMessage } =
    await getContextsById(categories.map((category) => category.context_id));

  const {
    originsByCategoryId,
    errorMessage: originErrorMessage,
  } = await getCategoryOriginsByCategoryId(
    categories.map((category) => category.id)
  );

  return {
    appUser,
    platformAdmin,
    categories,
    contextsById,
    originsByCategoryId,
    errorMessage: null,
    contextErrorMessage: contextsErrorMessage,
    originErrorMessage,
    statusFilter,
    activeFilter,
    contextFilter,
    limit,
  };
}

export default async function AdminObjectActionCategoriesPage({
  searchParams,
}: AdminCategoriesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const statusFilter = normalizeStatusFilter(resolvedSearchParams?.status);
  const activeFilter = normalizeActiveFilter(resolvedSearchParams?.active);
  const contextFilter = normalizeContextFilter(resolvedSearchParams?.context);
  const limit = normalizeLimit(resolvedSearchParams?.limit);

  const {
    appUser,
    platformAdmin,
    categories,
    contextsById,
    originsByCategoryId,
    errorMessage,
    contextErrorMessage,
    originErrorMessage,
  } = await getPageData(statusFilter, activeFilter, contextFilter, limit);

  const activeCount = categories.filter((category) => category.is_active).length;
  const publicCount = categories.filter(
    (category) =>
      category.status === "approved" || category.status === "published"
  ).length;
  const createdFromSuggestionsCount = categories.filter(
    (category) => originsByCategoryId[category.id]
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
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <Link
              href="/directory"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              ← Назад в каталог
            </Link>

            <Link
              href="/admin/object-action/suggestions"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Suggestion moderation →
            </Link>
          </div>

          <h1
            style={{
              fontSize: "34px",
              lineHeight: "1.2",
              fontWeight: 700,
              margin: "0 0 10px",
            }}
          >
            Object-Action contextual categories
          </h1>

          <p
            style={{
              margin: "0 0 8px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Admin overview of contextual categories used by the Object-Action
            Rubricator. This page is read-only and helps verify what actually
            exists after suggestion moderation.
          </p>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Approved and published categories can be used by the business
            directory. Archived or inactive categories should not be offered to
            users in public category pickers. If a category was created through
            suggestion moderation, its source suggestion and audit event are
            shown below.
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
            {contextErrorMessage ? (
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
                <strong>Context loading warning:</strong>{" "}
                {contextErrorMessage}
              </section>
            ) : null}

            {originErrorMessage ? (
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
                <strong>Origin loading warning:</strong> {originErrorMessage}
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
                  Visible categories
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {categories.length}
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
                  Public-ready in current view
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {publicCount}
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
                  Created from suggestions
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {createdFromSuggestionsCount}
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
                display: "grid",
                gap: "18px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 12px", fontSize: "20px" }}>
                  Status filters
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
                        href={getFilterHref({
                          status: filter.value,
                          active: activeFilter,
                          context: contextFilter,
                          limit,
                        })}
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
              </div>

              <div>
                <h2 style={{ margin: "0 0 12px", fontSize: "20px" }}>
                  Active filters
                </h2>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {ACTIVE_FILTERS.map((filter) => {
                    const isActive = filter.value === activeFilter;

                    return (
                      <Link
                        key={filter.value}
                        href={getFilterHref({
                          status: statusFilter,
                          active: filter.value,
                          context: contextFilter,
                          limit,
                        })}
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
                  Contextual categories
                </h2>

                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Current status filter: <strong>{statusFilter}</strong>.
                  Current active filter: <strong>{activeFilter}</strong>.
                  Limit: <strong>{limit}</strong>.
                </p>
              </div>

              {categories.length === 0 ? (
                <div style={{ padding: "24px", color: "#666666" }}>
                  No categories for the selected filters.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                    padding: "20px",
                  }}
                >
                  {categories.map((category) => {
                    const context = contextsById[category.context_id] ?? null;
                    const statusStyle = getStatusStyle(category.status);
                    const activeStyle = getActiveStyle(category.is_active);
                    const origin = originsByCategoryId[category.id] ?? null;
                    const originStyle = getOriginStyle(origin);
                    const originSuggestion = origin?.suggestion ?? null;
                    const verifyHref = getAuditVerifyHref(originSuggestion);
                    const newCategorySource = getJsonString(
                      origin?.event.metadata_json ?? null,
                      "newCategorySource"
                    );
                    const originAction = getJsonString(
                      origin?.event.metadata_json ?? null,
                      "action"
                    );

                    return (
                      <article
                        key={category.id}
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
                              {context?.code ?? "unknown_context"} ·{" "}
                              {category.source_type ?? "unknown_source"}
                            </div>

                            <h3
                              style={{
                                margin: 0,
                                fontSize: "22px",
                                lineHeight: "1.25",
                              }}
                            >
                              {category.name}
                            </h3>

                            <div
                              style={{
                                marginTop: "6px",
                                color: "#555555",
                                fontFamily: "monospace",
                              }}
                            >
                              slug: {category.slug}
                            </div>
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
                              {category.status}
                            </span>

                            <span
                              style={{
                                display: "inline-block",
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                ...activeStyle,
                              }}
                            >
                              active: {formatBoolean(category.is_active)}
                            </span>

                            <span
                              style={{
                                display: "inline-block",
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                ...originStyle,
                              }}
                            >
                              origin:{" "}
                              {origin ? "suggestion request" : "not linked"}
                            </span>
                          </div>
                        </div>

                        <section
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "12px",
                            background: "#f9fafb",
                            display: "grid",
                            gap: "8px",
                            lineHeight: "1.45",
                          }}
                        >
                          <div>
                            <strong>Description:</strong>{" "}
                            {category.description ?? "—"}
                          </div>

                          <div>
                            <strong>Context:</strong>{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {context?.code ?? "—"}
                            </span>{" "}
                            <span style={{ color: "#666666" }}>
                              ({category.context_id})
                            </span>
                          </div>

                          <div>
                            <strong>Context status:</strong>{" "}
                            {context?.status ?? "—"} · active:{" "}
                            {formatBoolean(context?.is_active)}
                          </div>

                          <div>
                            <strong>Parent category:</strong>{" "}
                            <span style={{ fontFamily: "monospace" }}>
                              {category.parent_id ?? "—"}
                            </span>
                          </div>

                          <div>
                            <strong>Sort order:</strong>{" "}
                            {formatNumber(category.sort_order)}
                          </div>
                        </section>

                        {origin ? (
                          <section
                            style={{
                              border: "1px solid #bfdbfe",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#eff6ff",
                              display: "grid",
                              gap: "10px",
                              lineHeight: "1.45",
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
                                  color: "#1e3a8a",
                                }}
                              >
                                Origin: created from suggestion moderation
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <Link
                                  href={getOriginSuggestionHref(
                                    originSuggestion
                                  )}
                                  style={{
                                    display: "inline-block",
                                    border: "1px solid #2563eb",
                                    borderRadius: "999px",
                                    padding: "6px 10px",
                                    background: "#ffffff",
                                    color: "#2563eb",
                                    textDecoration: "none",
                                    fontWeight: 800,
                                    fontSize: "13px",
                                  }}
                                >
                                  Open moderation queue →
                                </Link>

                                {verifyHref ? (
                                  <Link
                                    href={verifyHref}
                                    target="_blank"
                                    style={{
                                      display: "inline-block",
                                      border: "1px solid #2563eb",
                                      borderRadius: "999px",
                                      padding: "6px 10px",
                                      background: "#ffffff",
                                      color: "#2563eb",
                                      textDecoration: "none",
                                      fontWeight: 800,
                                      fontSize: "13px",
                                    }}
                                  >
                                    Verify hash chain ↗
                                  </Link>
                                ) : null}
                              </div>
                            </div>

                            <section
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: "8px",
                                fontSize: "13px",
                              }}
                            >
                              <div>
                                <strong>Suggestion ID:</strong>{" "}
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {origin.event.suggestion_request_id}
                                </span>
                              </div>

                              <div>
                                <strong>Event:</strong> {origin.event.event_type}
                              </div>

                              <div>
                                <strong>Event source:</strong>{" "}
                                {origin.event.event_source}
                              </div>

                              <div>
                                <strong>Actor:</strong>{" "}
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {origin.event.actor_user_id ?? "—"}
                                </span>
                              </div>

                              <div>
                                <strong>Actor role:</strong>{" "}
                                {origin.event.actor_role ?? "—"}
                              </div>

                              <div>
                                <strong>Admin decision:</strong>{" "}
                                {origin.event.admin_decision ?? "—"}
                              </div>

                              <div>
                                <strong>New category source:</strong>{" "}
                                {newCategorySource ?? "—"}
                              </div>

                              <div>
                                <strong>Origin action:</strong>{" "}
                                {originAction ?? "—"}
                              </div>

                              <div>
                                <strong>Origin event created:</strong>{" "}
                                {formatDateTime(origin.event.created_at)}
                              </div>

                              <div>
                                <strong>Previous hash:</strong>{" "}
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {origin.event.previous_hash ?? "—"}
                                </span>
                              </div>

                              <div>
                                <strong>Record hash:</strong>{" "}
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {origin.event.record_hash ?? "—"}
                                </span>
                              </div>
                            </section>

                            {originSuggestion ? (
                              <section
                                style={{
                                  border: "1px solid #bfdbfe",
                                  borderRadius: "8px",
                                  padding: "10px",
                                  background: "#ffffff",
                                  display: "grid",
                                  gap: "8px",
                                }}
                              >
                                <div>
                                  <strong>User text:</strong>{" "}
                                  {originSuggestion.user_text}
                                </div>

                                <div>
                                  <strong>Suggestion status:</strong>{" "}
                                  {originSuggestion.status} ·{" "}
                                  <strong>AI status:</strong>{" "}
                                  {originSuggestion.ai_status ?? "—"} ·{" "}
                                  <strong>AI confidence:</strong>{" "}
                                  {formatNumber(
                                    originSuggestion.ai_confidence
                                  )}
                                </div>

                                <div>
                                  <strong>AI object:</strong>{" "}
                                  {originSuggestion.ai_suggested_object_text ??
                                    "—"}{" "}
                                  · <strong>AI action:</strong>{" "}
                                  {originSuggestion.ai_suggested_action_text ??
                                    "—"}{" "}
                                  · <strong>AI category:</strong>{" "}
                                  {originSuggestion.ai_suggested_category_text ??
                                    "—"}
                                </div>

                                <div>
                                  <strong>Admin comment:</strong>{" "}
                                  {originSuggestion.admin_comment ?? "—"}
                                </div>

                                <div>
                                  <strong>Reviewed at:</strong>{" "}
                                  {formatDateTime(
                                    originSuggestion.reviewed_at
                                  )}
                                </div>
                              </section>
                            ) : (
                              <section
                                style={{
                                  border: "1px solid #f0d28a",
                                  borderRadius: "8px",
                                  padding: "10px",
                                  background: "#fff8e6",
                                  color: "#7a4b00",
                                }}
                              >
                                Origin audit event exists, but linked suggestion
                                request was not found.
                              </section>
                            )}

                            {origin.event.internal_note ? (
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
                                <strong>Internal note:</strong>{" "}
                                {origin.event.internal_note}
                              </div>
                            ) : null}

                            <details>
                              <summary
                                style={{
                                  cursor: "pointer",
                                  color: "#2563eb",
                                  fontWeight: 800,
                                  fontSize: "13px",
                                }}
                              >
                                metadata_json
                              </summary>

                              <pre
                                style={{
                                  marginTop: "8px",
                                  border: "1px solid #bfdbfe",
                                  borderRadius: "8px",
                                  padding: "10px",
                                  background: "#ffffff",
                                  overflowX: "auto",
                                  fontSize: "12px",
                                  lineHeight: "1.45",
                                }}
                              >
                                {formatJson(origin.event.metadata_json)}
                              </pre>
                            </details>
                          </section>
                        ) : (
                          <section
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#f9fafb",
                              color: "#555555",
                              fontSize: "13px",
                            }}
                          >
                            No approve_new_category audit origin found for this
                            category. This usually means the category was seeded
                            manually, imported, created before the audit-origin
                            flow, or created outside suggestion moderation.
                          </section>
                        )}

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
                              background: "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                color: "#666666",
                                marginBottom: "6px",
                              }}
                            >
                              Category ID
                            </div>
                            <strong
                              style={{
                                fontFamily: "monospace",
                                wordBreak: "break-all",
                              }}
                            >
                              {category.id}
                            </strong>
                          </div>

                          <div
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#ffffff",
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
                              {formatDateTime(category.created_at)}
                            </strong>
                          </div>

                          <div
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#ffffff",
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
                              {formatDateTime(category.updated_at)}
                            </strong>
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