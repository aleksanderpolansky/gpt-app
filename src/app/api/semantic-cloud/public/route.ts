import { NextResponse } from "next/server";

import { supabase } from "../../../../../lib/supabase";
import type {
  SemanticCloudCategoryStatus,
  SemanticCloudDiagnostics,
  SemanticCloudProjectionMode,
  SemanticCloudPublicApiResponse,
  SemanticCloudPublicErrorResponse,
  SemanticCloudPublicResponse,
  SemanticCloudSource,
  SemanticCloudSourceStatus,
  SemanticCloudWord,
} from "../../../../types/semantic-cloud";

const BUSINESS_DIRECTORY_CONTEXT_CODE = "business_directory";
const ORGANIZATION_ENTITY_TYPE = "organization";
const PUBLIC_OBJECT_ACTION_STATUSES = ["approved", "published"] as const;
const PUBLIC_CATEGORY_STATUSES = ["approved", "published"] as const;
const MAX_PUBLIC_ORGANIZATION_ROWS = 500;
const MAX_CLOUD_WORDS = 80;
const MIN_FONT_SIZE_PX = 14;
const MAX_FONT_SIZE_PX = 34;

const projectionMode: SemanticCloudProjectionMode = "public_safe_projection";
const projectionSource: SemanticCloudSource =
  "entity_classifications_contextual_categories";

type ContextRow = {
  readonly id: string | null;
};

type PublicOrganizationRow = {
  readonly id: string | null;
};

type EntityClassificationRow = {
  readonly entity_id: string | null;
  readonly contextual_category_id: string | null;
  readonly status: string | null;
};

type ContextualCategoryRow = {
  readonly id: string | null;
  readonly code: string | null;
  readonly default_name: string | null;
  readonly status: string | null;
  readonly slug: string | null;
  readonly is_active: boolean | null;
  readonly sort_order: number | null;
};

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCategoryStatus(
  value: string | null | undefined
): SemanticCloudCategoryStatus {
  const normalized = normalizeText(value).toLowerCase();

  if (
    normalized === "confirmed" ||
    normalized === "resolved" ||
    normalized === "approved" ||
    normalized === "published"
  ) {
    return normalized;
  }

  return "published";
}

function createDiagnostics(input: {
  readonly generatedAt: string;
  readonly sourceStatus: SemanticCloudSourceStatus;
  readonly source: SemanticCloudSource;
  readonly totalWords: number;
  readonly totalPublicObjects: number;
  readonly emptyReason?: string;
  readonly warnings?: readonly string[];
}): SemanticCloudDiagnostics {
  return {
    sourceStatus: input.sourceStatus,
    generatedAt: input.generatedAt,
    source: input.source,
    projectionMode,
    totalWords: input.totalWords,
    totalPublicObjects: input.totalPublicObjects,
    allowedObjectTypes: ["organization"],
    excludedPrivateLinks: true,
    excludedRawCandidates: true,
    excludedPreviewCandidates: true,
    excludedUnresolvedCandidates: true,
    excludedValueObjectTitlesAsLabelsInV0: true,
    emptyReason: input.emptyReason,
    warnings: input.warnings ?? [],
  };
}

function createEmptyResponse(input: {
  readonly generatedAt: string;
  readonly sourceStatus?: SemanticCloudSourceStatus;
  readonly source?: SemanticCloudSource;
  readonly emptyReason: string;
  readonly warnings?: readonly string[];
}): SemanticCloudPublicResponse {
  return {
    ok: true,
    mode: projectionMode,
    generatedAt: input.generatedAt,
    items: [],
    diagnostics: createDiagnostics({
      generatedAt: input.generatedAt,
      sourceStatus: input.sourceStatus ?? "empty",
      source: input.source ?? "empty_diagnostics",
      totalWords: 0,
      totalPublicObjects: 0,
      emptyReason: input.emptyReason,
      warnings: input.warnings,
    }),
  };
}

function createErrorResponse(generatedAt: string): SemanticCloudPublicErrorResponse {
  return {
    ok: false,
    mode: projectionMode,
    generatedAt,
    items: [],
    diagnostics: {
      ...createDiagnostics({
        generatedAt,
        sourceStatus: "error",
        source: "empty_diagnostics",
        totalWords: 0,
        totalPublicObjects: 0,
        emptyReason: "public_semantic_cloud_projection_error",
        warnings: [
          "Public semantic cloud projection failed. Details are hidden for safety.",
        ],
      }),
      sourceStatus: "error",
    },
    error: {
      code: "semantic_cloud_public_projection_error",
      message: "Public semantic cloud projection is temporarily unavailable.",
    },
  };
}

async function getBusinessDirectoryContextId() {
  const { data, error } = await supabase
    .from("contexts")
    .select("id")
    .eq("code", BUSINESS_DIRECTORY_CONTEXT_CODE)
    .limit(1);

  if (error) {
    throw new Error("business_directory_context_lookup_failed");
  }

  const rows = (data as unknown as ContextRow[] | null) ?? [];
  return normalizeText(rows[0]?.id) || null;
}

async function getPublicOrganizationIds() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("status", "active")
    .eq("directory_status", "published")
    .eq("is_public_profile_enabled", true)
    .eq("is_listed_in_directory", true)
    .limit(MAX_PUBLIC_ORGANIZATION_ROWS);

  if (error) {
    throw new Error("public_organizations_lookup_failed");
  }

  const rows = (data as unknown as PublicOrganizationRow[] | null) ?? [];

  return Array.from(
    new Set(
      rows
        .map((row) => normalizeText(row.id))
        .filter((id): id is string => Boolean(id))
    )
  );
}

async function getPublicClassificationRows(input: {
  readonly businessDirectoryContextId: string;
  readonly publicOrganizationIds: readonly string[];
}) {
  const { data, error } = await supabase
    .from("entity_classifications")
    .select("entity_id, contextual_category_id, status")
    .eq("context_id", input.businessDirectoryContextId)
    .eq("entity_type", ORGANIZATION_ENTITY_TYPE)
    .in("entity_id", [...input.publicOrganizationIds])
    .in("status", [...PUBLIC_OBJECT_ACTION_STATUSES])
    .not("contextual_category_id", "is", null);

  if (error) {
    throw new Error("entity_classifications_lookup_failed");
  }

  return (data as unknown as EntityClassificationRow[] | null) ?? [];
}

async function getContextualCategories(input: {
  readonly businessDirectoryContextId: string;
  readonly contextualCategoryIds: readonly string[];
}) {
  const { data, error } = await supabase
    .from("contextual_categories")
    .select(
      `
      id,
      code:slug,
      default_name:name,
      status,
      slug,
      is_active,
      sort_order
    `
    )
    .eq("context_id", input.businessDirectoryContextId)
    .in("id", [...input.contextualCategoryIds])
    .in("status", [...PUBLIC_CATEGORY_STATUSES])
    .eq("is_active", true);

  if (error) {
    throw new Error("contextual_categories_lookup_failed");
  }

  return (data as unknown as ContextualCategoryRow[] | null) ?? [];
}

function buildSemanticCloudItems(input: {
  readonly classifications: readonly EntityClassificationRow[];
  readonly categories: readonly ContextualCategoryRow[];
  readonly publicOrganizationIds: readonly string[];
}) {
  const publicOrganizationIdSet = new Set(input.publicOrganizationIds);
  const categoryById = new Map<string, ContextualCategoryRow>();

  for (const category of input.categories) {
    const categoryId = normalizeText(category.id);

    if (categoryId) {
      categoryById.set(categoryId, category);
    }
  }

  const organizationIdsByCategoryId = new Map<string, Set<string>>();

  for (const classification of input.classifications) {
    const organizationId = normalizeText(classification.entity_id);
    const categoryId = normalizeText(classification.contextual_category_id);

    if (!organizationId || !categoryId) {
      continue;
    }

    if (!publicOrganizationIdSet.has(organizationId)) {
      continue;
    }

    if (!categoryById.has(categoryId)) {
      continue;
    }

    const currentSet =
      organizationIdsByCategoryId.get(categoryId) ?? new Set<string>();

    currentSet.add(organizationId);
    organizationIdsByCategoryId.set(categoryId, currentSet);
  }

  const publicObjectCounts = Array.from(organizationIdsByCategoryId.values()).map(
    (organizationIds) => organizationIds.size
  );

  const maxPublicObjectCount = Math.max(0, ...publicObjectCounts);

  if (maxPublicObjectCount <= 0) {
    return [];
  }

  const items: SemanticCloudWord[] = [];

  for (const [categoryId, organizationIds] of organizationIdsByCategoryId) {
    const category = categoryById.get(categoryId);

    if (!category) {
      continue;
    }

    const slug =
      normalizeText(category.slug) ||
      normalizeText(category.code) ||
      categoryId;

    const label =
      normalizeText(category.default_name) ||
      normalizeText(category.slug) ||
      normalizeText(category.code) ||
      categoryId;

    const publicObjectCount = organizationIds.size;

    if (publicObjectCount <= 0) {
      continue;
    }

    items.push({
      id: categoryId,
      categoryId,
      key: slug,
      slug,
      label,
      normalizedLabel: label.toLowerCase(),
      source: projectionSource,
      status: normalizeCategoryStatus(category.status),
      publicObjectCount,
      objectTypeCounts: {
        organization: publicObjectCount,
      },
      weight: publicObjectCount / maxPublicObjectCount,
      minFontSizePx: MIN_FONT_SIZE_PX,
      maxFontSizePx: MAX_FONT_SIZE_PX,
      href: `/directory?category=${encodeURIComponent(slug)}`,
      objectTypes: ["organization"],
      children: [],
      related: [],
    });
  }

  return items
    .sort((left, right) => {
      if (right.publicObjectCount !== left.publicObjectCount) {
        return right.publicObjectCount - left.publicObjectCount;
      }

      return left.label.localeCompare(right.label, "en", {
        sensitivity: "base",
      });
    })
    .slice(0, MAX_CLOUD_WORDS);
}

export async function GET() {
  const generatedAt = new Date().toISOString();

  try {
    const businessDirectoryContextId = await getBusinessDirectoryContextId();

    if (!businessDirectoryContextId) {
      return NextResponse.json(
        createEmptyResponse({
          generatedAt,
          sourceStatus: "blocked",
          source: "empty_diagnostics",
          emptyReason: "business_directory_context_not_found",
          warnings: [
            "Business directory context was not found, so public-safe semantic projection cannot be built.",
          ],
        })
      );
    }

    const publicOrganizationIds = await getPublicOrganizationIds();

    if (publicOrganizationIds.length === 0) {
      return NextResponse.json(
        createEmptyResponse({
          generatedAt,
          source: projectionSource,
          emptyReason: "no_public_objects",
          warnings: [
            "No public organizations matched status, directory and public profile filters.",
          ],
        })
      );
    }

    const classifications = await getPublicClassificationRows({
      businessDirectoryContextId,
      publicOrganizationIds,
    });

    const contextualCategoryIds = Array.from(
      new Set(
        classifications
          .map((row) => normalizeText(row.contextual_category_id))
          .filter((id): id is string => Boolean(id))
      )
    );

    if (contextualCategoryIds.length === 0) {
      return NextResponse.json(
        createEmptyResponse({
          generatedAt,
          source: projectionSource,
          emptyReason: "no_confirmed_public_safe_category_links",
          warnings: [
            "No approved or published organization classifications with contextual categories were found.",
          ],
        })
      );
    }

    const categories = await getContextualCategories({
      businessDirectoryContextId,
      contextualCategoryIds,
    });

    const items = buildSemanticCloudItems({
      classifications,
      categories,
      publicOrganizationIds,
    });

    if (items.length === 0) {
      return NextResponse.json(
        createEmptyResponse({
          generatedAt,
          source: projectionSource,
          emptyReason: "no_confirmed_public_safe_category_links",
          warnings: [
            "Public-safe classification rows were found, but no active public contextual category could be projected.",
          ],
        })
      );
    }

    const totalPublicObjects = new Set(
      classifications
        .map((row) => normalizeText(row.entity_id))
        .filter((id): id is string => Boolean(id))
        .filter((id) => publicOrganizationIds.includes(id))
    ).size;

    const response: SemanticCloudPublicResponse = {
      ok: true,
      mode: projectionMode,
      generatedAt,
      items,
      diagnostics: createDiagnostics({
        generatedAt,
        sourceStatus: "ready",
        source: projectionSource,
        totalWords: items.length,
        totalPublicObjects,
        warnings: [],
      }),
    };

    return NextResponse.json(response satisfies SemanticCloudPublicApiResponse);
  } catch {
    return NextResponse.json(createErrorResponse(generatedAt), { status: 500 });
  }
}
