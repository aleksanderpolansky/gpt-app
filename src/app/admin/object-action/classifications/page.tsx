import Link from "next/link";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ClassificationStatusFilter =
  | "all"
  | "draft"
  | "suggested"
  | "approved"
  | "published"
  | "archived";

type PrimaryFilter = "all" | "primary" | "secondary";

type AdminClassificationsPageProps = {
  searchParams?: Promise<{
    status?: string | string[];
    primary?: string | string[];
    entityType?: string | string[];
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

type EntityClassificationRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  object_type_id: string;
  action_type_id: string | null;
  context_id: string;
  contextual_category_id: string | null;
  classification_role: string;
  is_primary: boolean;
  confidence: number | null;
  status: string;
  source_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationRow = {
  id: string;
  organization_name: string;
  public_slug: string | null;
  directory_status: string | null;
  status: string | null;
};

type ObjectTypeRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  is_active: boolean;
};

type ActionTypeRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  is_active: boolean;
};

type ContextRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  is_active: boolean;
};

type ContextualCategoryRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  is_active: boolean;
};

type PageData = {
  appUser: AppUserRow | null;
  platformAdmin: PlatformAdminRow | null;
  classifications: EntityClassificationRow[];
  organizationsById: Record<string, OrganizationRow>;
  objectTypesById: Record<string, ObjectTypeRow>;
  actionTypesById: Record<string, ActionTypeRow>;
  contextsById: Record<string, ContextRow>;
  categoriesById: Record<string, ContextualCategoryRow>;
  errorMessage: string | null;
  relatedDataWarning: string | null;
  statusFilter: ClassificationStatusFilter;
  primaryFilter: PrimaryFilter;
  entityTypeFilter: string;
  contextFilter: string;
  limit: number;
};

const DEFAULT_STATUS_FILTER: ClassificationStatusFilter = "all";
const DEFAULT_PRIMARY_FILTER: PrimaryFilter = "all";
const DEFAULT_ENTITY_TYPE_FILTER = "organization";
const DEFAULT_LIMIT = 100;

const STATUS_FILTERS: {
  value: ClassificationStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
  { value: "suggested", label: "Suggested" },
  { value: "draft", label: "Draft" },
];

const PRIMARY_FILTERS: {
  value: PrimaryFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "primary", label: "Primary only" },
  { value: "secondary", label: "Secondary only" },
];

const ALLOWED_STATUS_FILTERS = new Set<ClassificationStatusFilter>(
  STATUS_FILTERS.map((item) => item.value)
);

const ALLOWED_PRIMARY_FILTERS = new Set<PrimaryFilter>(
  PRIMARY_FILTERS.map((item) => item.value)
);

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeStatusFilter(
  value: string | string[] | undefined
): ClassificationStatusFilter {
  const normalizedValue = getFirstSearchParam(value).trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_STATUS_FILTER;
  }

  const typedValue = normalizedValue as ClassificationStatusFilter;

  if (!ALLOWED_STATUS_FILTERS.has(typedValue)) {
    return DEFAULT_STATUS_FILTER;
  }

  return typedValue;
}

function normalizePrimaryFilter(
  value: string | string[] | undefined
): PrimaryFilter {
  const normalizedValue = getFirstSearchParam(value).trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_PRIMARY_FILTER;
  }

  const typedValue = normalizedValue as PrimaryFilter;

  if (!ALLOWED_PRIMARY_FILTERS.has(typedValue)) {
    return DEFAULT_PRIMARY_FILTER;
  }

  return typedValue;
}

function normalizeEntityTypeFilter(value: string | string[] | undefined) {
  const normalizedValue = getFirstSearchParam(value).trim().toLowerCase();

  if (!normalizedValue) {
    return DEFAULT_ENTITY_TYPE_FILTER;
  }

  return normalizedValue;
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

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "—";
}

function formatConfidence(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
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

function getActiveStyle(isActive: boolean | null | undefined) {
  if (isActive === true) {
    return {
      background: "#edf8f0",
      color: "#176b2c",
      border: "1px solid #bfe5c8",
    };
  }

  if (isActive === false) {
    return {
      background: "#fff5f5",
      color: "#a40000",
      border: "1px solid #f2b8b5",
    };
  }

  return {
    background: "#f5f5f5",
    color: "#555555",
    border: "1px solid #dddddd",
  };
}

function getFilterHref(params: {
  status?: ClassificationStatusFilter;
  primary?: PrimaryFilter;
  entityType?: string;
  context?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();

  searchParams.set("status", params.status ?? DEFAULT_STATUS_FILTER);
  searchParams.set("primary", params.primary ?? DEFAULT_PRIMARY_FILTER);
  searchParams.set(
    "entityType",
    params.entityType ?? DEFAULT_ENTITY_TYPE_FILTER
  );

  if (params.context) {
    searchParams.set("context", params.context);
  }

  if (params.limit && params.limit !== DEFAULT_LIMIT) {
    searchParams.set("limit", String(params.limit));
  }

  return `/admin/object-action/classifications?${searchParams.toString()}`;
}

function mapRowsById<T extends { id: string }>(rows: T[]) {
  const byId: Record<string, T> = {};

  for (const row of rows) {
    byId[row.id] = row;
  }

  return byId;
}

function getUniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
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

  const rows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!rows[0]) {
    return {
      appUser: null,
      errorMessage: "App user not found",
    };
  }

  return {
    appUser: rows[0],
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

  const rows = (data as unknown as PlatformAdminRow[] | null) ?? [];

  if (!rows[0]) {
    return {
      platformAdmin: null,
      errorMessage: "Platform admin access required",
    };
  }

  return {
    platformAdmin: rows[0],
    errorMessage: null,
  };
}

async function getContextIdByCode(contextCode: string): Promise<{
  contextId: string | null;
  errorMessage: string | null;
}> {
  if (!contextCode) {
    return {
      contextId: null,
      errorMessage: null,
    };
  }

  const { data, error } = await supabase
    .from("contexts")
    .select("id, code")
    .eq("code", contextCode)
    .limit(1);

  if (error) {
    return {
      contextId: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as { id: string; code: string }[] | null) ?? [];

  return {
    contextId: rows[0]?.id ?? null,
    errorMessage: null,
  };
}

async function getClassifications(params: {
  statusFilter: ClassificationStatusFilter;
  primaryFilter: PrimaryFilter;
  entityTypeFilter: string;
  contextFilter: string;
  limit: number;
}): Promise<{
  classifications: EntityClassificationRow[];
  errorMessage: string | null;
}> {
  const { contextId, errorMessage: contextErrorMessage } =
    await getContextIdByCode(params.contextFilter);

  if (contextErrorMessage) {
    return {
      classifications: [],
      errorMessage: contextErrorMessage,
    };
  }

  if (params.contextFilter && !contextId) {
    return {
      classifications: [],
      errorMessage: null,
    };
  }

  let query = supabase
    .from("entity_classifications")
    .select(
      `
      id,
      entity_type,
      entity_id,
      object_type_id,
      action_type_id,
      context_id,
      contextual_category_id,
      classification_role,
      is_primary,
      confidence,
      status,
      source_type,
      notes,
      created_at,
      updated_at
    `
    )
    .eq("entity_type", params.entityTypeFilter)
    .order("created_at", { ascending: false })
    .limit(params.limit);

  if (params.statusFilter !== "all") {
    query = query.eq("status", params.statusFilter);
  }

  if (params.primaryFilter === "primary") {
    query = query.eq("is_primary", true);
  }

  if (params.primaryFilter === "secondary") {
    query = query.eq("is_primary", false);
  }

  if (contextId) {
    query = query.eq("context_id", contextId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      classifications: [],
      errorMessage: error.message,
    };
  }

  return {
    classifications: (data as unknown as EntityClassificationRow[] | null) ?? [],
    errorMessage: null,
  };
}

async function getRelatedData(classifications: EntityClassificationRow[]): Promise<{
  organizationsById: Record<string, OrganizationRow>;
  objectTypesById: Record<string, ObjectTypeRow>;
  actionTypesById: Record<string, ActionTypeRow>;
  contextsById: Record<string, ContextRow>;
  categoriesById: Record<string, ContextualCategoryRow>;
  warning: string | null;
}> {
  const organizationIds = getUniqueValues(
    classifications
      .filter((item) => item.entity_type === "organization")
      .map((item) => item.entity_id)
  );
  const objectTypeIds = getUniqueValues(
    classifications.map((item) => item.object_type_id)
  );
  const actionTypeIds = getUniqueValues(
    classifications.map((item) => item.action_type_id)
  );
  const contextIds = getUniqueValues(
    classifications.map((item) => item.context_id)
  );
  const categoryIds = getUniqueValues(
    classifications.map((item) => item.contextual_category_id)
  );

  try {
    const [
      organizationsResult,
      objectTypesResult,
      actionTypesResult,
      contextsResult,
      categoriesResult,
    ] = await Promise.all([
      organizationIds.length > 0
        ? supabase
            .from("organizations")
            .select("id, organization_name, public_slug, directory_status, status")
            .in("id", organizationIds)
        : Promise.resolve({ data: [], error: null }),

      objectTypeIds.length > 0
        ? supabase
            .from("object_types")
            .select("id, code, name, status, is_active")
            .in("id", objectTypeIds)
        : Promise.resolve({ data: [], error: null }),

      actionTypeIds.length > 0
        ? supabase
            .from("action_types")
            .select("id, code, name, status, is_active")
            .in("id", actionTypeIds)
        : Promise.resolve({ data: [], error: null }),

      contextIds.length > 0
        ? supabase
            .from("contexts")
            .select("id, code, name, status, is_active")
            .in("id", contextIds)
        : Promise.resolve({ data: [], error: null }),

      categoryIds.length > 0
        ? supabase
            .from("contextual_categories")
            .select("id, slug, name, status, is_active")
            .in("id", categoryIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const firstError =
      organizationsResult.error ??
      objectTypesResult.error ??
      actionTypesResult.error ??
      contextsResult.error ??
      categoriesResult.error ??
      null;

    return {
      organizationsById: mapRowsById(
        (organizationsResult.data ?? []) as OrganizationRow[]
      ),
      objectTypesById: mapRowsById(
        (objectTypesResult.data ?? []) as ObjectTypeRow[]
      ),
      actionTypesById: mapRowsById(
        (actionTypesResult.data ?? []) as ActionTypeRow[]
      ),
      contextsById: mapRowsById((contextsResult.data ?? []) as ContextRow[]),
      categoriesById: mapRowsById(
        (categoriesResult.data ?? []) as ContextualCategoryRow[]
      ),
      warning: firstError?.message ?? null,
    };
  } catch (error) {
    return {
      organizationsById: {},
      objectTypesById: {},
      actionTypesById: {},
      contextsById: {},
      categoriesById: {},
      warning:
        error instanceof Error
          ? error.message
          : "Cannot load related classification data",
    };
  }
}

async function getPageData(params: {
  statusFilter: ClassificationStatusFilter;
  primaryFilter: PrimaryFilter;
  entityTypeFilter: string;
  contextFilter: string;
  limit: number;
}): Promise<PageData> {
  const { appUser, errorMessage: appUserErrorMessage } =
    await getCurrentAppUser();

  if (appUserErrorMessage || !appUser) {
    return {
      appUser: null,
      platformAdmin: null,
      classifications: [],
      organizationsById: {},
      objectTypesById: {},
      actionTypesById: {},
      contextsById: {},
      categoriesById: {},
      errorMessage: appUserErrorMessage ?? "Not authenticated",
      relatedDataWarning: null,
      statusFilter: params.statusFilter,
      primaryFilter: params.primaryFilter,
      entityTypeFilter: params.entityTypeFilter,
      contextFilter: params.contextFilter,
      limit: params.limit,
    };
  }

  const { platformAdmin, errorMessage: platformAdminErrorMessage } =
    await getPlatformAdmin(appUser.id);

  if (platformAdminErrorMessage || !platformAdmin) {
    return {
      appUser,
      platformAdmin: null,
      classifications: [],
      organizationsById: {},
      objectTypesById: {},
      actionTypesById: {},
      contextsById: {},
      categoriesById: {},
      errorMessage:
        platformAdminErrorMessage ?? "Platform admin access required",
      relatedDataWarning: null,
      statusFilter: params.statusFilter,
      primaryFilter: params.primaryFilter,
      entityTypeFilter: params.entityTypeFilter,
      contextFilter: params.contextFilter,
      limit: params.limit,
    };
  }

  const { classifications, errorMessage: classificationsErrorMessage } =
    await getClassifications(params);

  if (classificationsErrorMessage) {
    return {
      appUser,
      platformAdmin,
      classifications: [],
      organizationsById: {},
      objectTypesById: {},
      actionTypesById: {},
      contextsById: {},
      categoriesById: {},
      errorMessage: classificationsErrorMessage,
      relatedDataWarning: null,
      statusFilter: params.statusFilter,
      primaryFilter: params.primaryFilter,
      entityTypeFilter: params.entityTypeFilter,
      contextFilter: params.contextFilter,
      limit: params.limit,
    };
  }

  const relatedData = await getRelatedData(classifications);

  return {
    appUser,
    platformAdmin,
    classifications,
    organizationsById: relatedData.organizationsById,
    objectTypesById: relatedData.objectTypesById,
    actionTypesById: relatedData.actionTypesById,
    contextsById: relatedData.contextsById,
    categoriesById: relatedData.categoriesById,
    errorMessage: null,
    relatedDataWarning: relatedData.warning,
    statusFilter: params.statusFilter,
    primaryFilter: params.primaryFilter,
    entityTypeFilter: params.entityTypeFilter,
    contextFilter: params.contextFilter,
    limit: params.limit,
  };
}

export default async function AdminObjectActionClassificationsPage({
  searchParams,
}: AdminClassificationsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const statusFilter = normalizeStatusFilter(resolvedSearchParams?.status);
  const primaryFilter = normalizePrimaryFilter(resolvedSearchParams?.primary);
  const entityTypeFilter = normalizeEntityTypeFilter(
    resolvedSearchParams?.entityType
  );
  const contextFilter = normalizeContextFilter(resolvedSearchParams?.context);
  const limit = normalizeLimit(resolvedSearchParams?.limit);

  const {
    appUser,
    platformAdmin,
    classifications,
    organizationsById,
    objectTypesById,
    actionTypesById,
    contextsById,
    categoriesById,
    errorMessage,
    relatedDataWarning,
  } = await getPageData({
    statusFilter,
    primaryFilter,
    entityTypeFilter,
    contextFilter,
    limit,
  });

  const primaryCount = classifications.filter((item) => item.is_primary).length;
  const approvedCount = classifications.filter(
    (item) => item.status === "approved" || item.status === "published"
  ).length;
  const missingCategoryCount = classifications.filter(
    (item) =>
      item.contextual_category_id && !categoriesById[item.contextual_category_id]
  ).length;
  const inactiveCategoryCount = classifications.filter((item) => {
    if (!item.contextual_category_id) {
      return false;
    }

    const category = categoriesById[item.contextual_category_id];

    return Boolean(category && !category.is_active);
  }).length;

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
              href="/admin/object-action/categories"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              ← Categories admin
            </Link>

            <Link
              href="/admin/object-action/suggestions"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Suggestion moderation {"\u2192"}
            </Link>

            <Link
              href="/directory"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Public directory →
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
            Object-Action entity classifications
          </h1>

          <p
            style={{
              margin: "0 0 8px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Read-only admin overview of how entities are classified in the
            Object-Action Rubricator. This page does not mutate data.
          </p>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Current focus: organizations classified into business directory
            contextual categories.
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
            {relatedDataWarning ? (
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
                <strong>Related data warning:</strong> {relatedDataWarning}
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
                  Visible classifications
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {classifications.length}
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
                  Approved / published
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {approvedCount}
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
                  Primary
                </div>
                <div style={{ fontSize: "34px", fontWeight: 700 }}>
                  {primaryCount}
                </div>
              </div>

              <div
                style={{
                  border:
                    missingCategoryCount > 0 || inactiveCategoryCount > 0
                      ? "1px solid #f2b8b5"
                      : "1px solid #bbf7d0",
                  borderRadius: "16px",
                  padding: "22px",
                  background:
                    missingCategoryCount > 0 || inactiveCategoryCount > 0
                      ? "#fff5f5"
                      : "#f0fdf4",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    color:
                      missingCategoryCount > 0 || inactiveCategoryCount > 0
                        ? "#a40000"
                        : "#166534",
                    marginBottom: "8px",
                  }}
                >
                  Category warnings
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800 }}>
                  missing: {missingCategoryCount} · inactive:{" "}
                  {inactiveCategoryCount}
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
                          primary: primaryFilter,
                          entityType: entityTypeFilter,
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
                  Primary filters
                </h2>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {PRIMARY_FILTERS.map((filter) => {
                    const isActive = filter.value === primaryFilter;

                    return (
                      <Link
                        key={filter.value}
                        href={getFilterHref({
                          status: statusFilter,
                          primary: filter.value,
                          entityType: entityTypeFilter,
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
                  Classifications
                </h2>

                <p style={{ margin: "6px 0 0", color: "#666666" }}>
                  Current status filter: <strong>{statusFilter}</strong>.
                  Current primary filter: <strong>{primaryFilter}</strong>.
                  Current entity type: <strong>{entityTypeFilter}</strong>.
                  Current context filter:{" "}
                  <strong>{contextFilter || "all"}</strong>. Limit:{" "}
                  <strong>{limit}</strong>.
                </p>
              </div>

              {classifications.length === 0 ? (
                <div style={{ padding: "24px", color: "#666666" }}>
                  No classifications for the selected filters.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                    padding: "20px",
                  }}
                >
                  {classifications.map((classification) => {
                    const organization =
                      organizationsById[classification.entity_id] ?? null;
                    const objectType =
                      objectTypesById[classification.object_type_id] ?? null;
                    const actionType = classification.action_type_id
                      ? actionTypesById[classification.action_type_id] ?? null
                      : null;
                    const context =
                      contextsById[classification.context_id] ?? null;
                    const category = classification.contextual_category_id
                      ? categoriesById[classification.contextual_category_id] ??
                        null
                      : null;

                    const classificationStatusStyle = getStatusStyle(
                      classification.status
                    );
                    const categoryStatusStyle = getStatusStyle(category?.status);
                    const categoryActiveStyle = getActiveStyle(
                      category?.is_active
                    );

                    return (
                      <article
                        key={classification.id}
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
                              {classification.entity_type} ·{" "}
                              {context?.code ?? "unknown_context"} ·{" "}
                              {classification.source_type}
                            </div>

                            <h3
                              style={{
                                margin: 0,
                                fontSize: "22px",
                                lineHeight: "1.25",
                              }}
                            >
                              {organization?.organization_name ??
                                classification.entity_id}
                            </h3>

                            <div
                              style={{
                                marginTop: "6px",
                                color: "#555555",
                                fontFamily: "monospace",
                              }}
                            >
                              classification: {classification.id}
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
                                ...classificationStatusStyle,
                              }}
                            >
                              {classification.status}
                            </span>

                            <span
                              style={{
                                display: "inline-block",
                                borderRadius: "999px",
                                padding: "6px 10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                background: classification.is_primary
                                  ? "#eff6ff"
                                  : "#f5f5f5",
                                color: classification.is_primary
                                  ? "#1e3a8a"
                                  : "#555555",
                                border: classification.is_primary
                                  ? "1px solid #bfdbfe"
                                  : "1px solid #dddddd",
                              }}
                            >
                              {classification.is_primary
                                ? "primary"
                                : "secondary"}
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
                            <strong>Object type:</strong>{" "}
                            {objectType
                              ? `${objectType.code} · ${objectType.name}`
                              : classification.object_type_id}
                          </div>

                          <div>
                            <strong>Action type:</strong>{" "}
                            {actionType
                              ? `${actionType.code} · ${actionType.name}`
                              : classification.action_type_id ?? "—"}
                          </div>

                          <div>
                            <strong>Context:</strong>{" "}
                            {context
                              ? `${context.code} · ${context.name}`
                              : classification.context_id}
                          </div>

                          <div>
                            <strong>Role:</strong>{" "}
                            {classification.classification_role} · primary:{" "}
                            {formatBoolean(classification.is_primary)}
                          </div>

                          <div>
                            <strong>Confidence:</strong>{" "}
                            {formatConfidence(classification.confidence)}
                          </div>

                          <div>
                            <strong>Notes:</strong>{" "}
                            {classification.notes ?? "—"}
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
                          <div style={{ fontWeight: 800 }}>
                            Contextual category
                          </div>

                          {category ? (
                            <>
                              <div>
                                <strong>Name:</strong> {category.name}
                              </div>

                              <div>
                                <strong>Slug:</strong>{" "}
                                <span style={{ fontFamily: "monospace" }}>
                                  {category.slug}
                                </span>
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
                                    ...categoryStatusStyle,
                                  }}
                                >
                                  category status: {category.status}
                                </span>

                                <span
                                  style={{
                                    display: "inline-block",
                                    borderRadius: "999px",
                                    padding: "6px 10px",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    ...categoryActiveStyle,
                                  }}
                                >
                                  category active:{" "}
                                  {formatBoolean(category.is_active)}
                                </span>
                              </div>
                            </>
                          ) : classification.contextual_category_id ? (
                            <div style={{ color: "#a40000" }}>
                              Category record not found:{" "}
                              <span style={{ fontFamily: "monospace" }}>
                                {classification.contextual_category_id}
                              </span>
                            </div>
                          ) : (
                            <div style={{ color: "#666666" }}>
                              No contextual category linked.
                            </div>
                          )}
                        </section>

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
                              Entity ID
                            </div>
                            <strong
                              style={{
                                fontFamily: "monospace",
                                wordBreak: "break-all",
                              }}
                            >
                              {classification.entity_id}
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
                              {formatDateTime(classification.created_at)}
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
                              {formatDateTime(classification.updated_at)}
                            </strong>
                          </div>
                        </section>

                        {organization?.public_slug ? (
                          <section>
                            <Link
                              href={`/directory/${organization.public_slug}`}
                              target="_blank"
                              style={{
                                color: "#2563eb",
                                textDecoration: "underline",
                                fontWeight: 700,
                              }}
                            >
                              Open public organization page ↗
                            </Link>
                          </section>
                        ) : null}
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
