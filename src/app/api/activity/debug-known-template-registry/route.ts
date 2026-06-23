import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { KNOWN_TEMPLATE_RUBRICATOR_CLASSIFICATION_RULES } from "../../../../../lib/activity/knownTemplateRubricatorRules";
import {
  compareKnownTemplateRegistryTableSnapshotToDefaultMetadata,
  readKnownTemplateRegistryTableRowBySlug,
  type KnownTemplateRegistryTableClient,
  type KnownTemplateRegistryTableReadResult,
  type KnownTemplateRegistryTableSnapshot,
} from "../../../../../lib/activity/knownTemplateRegistryTable";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/activity/debug-known-template-registry";

const DEFAULT_TEMPLATE_SLUGS = [
  "german-marketing-handwriting-practice",
  "knee-training-health-practice",
];

const MAX_TEMPLATE_SLUGS = 20;

type TemplateMetadataResult =
  | {
      ok: true;
      row: {
        id: string;
        slug: string;
        title: string | null;
        status: string | null;
        isActive: boolean | null;
        defaultMetadataJson: Record<string, unknown>;
      };
      metadataSummary: Record<string, unknown>;
      errors: [];
    }
  | {
      ok: false;
      reason: "not_found" | "db_error" | "invalid_row" | "invalid_metadata";
      row?: unknown;
      metadataSummary: null;
      errors: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readRecord(
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function readString(
  record: Record<string, unknown>,
  key: string
): string | null {
  return asString(record[key]);
}

function parseList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function summarizeDefaultMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const registry = readRecord(metadata, "knownTemplateRegistry");
  const candidate = readRecord(metadata, "rubricatorCandidate");
  const mapping = readRecord(metadata, "valueObjectMapping");

  return {
    metadataKeys: Object.keys(metadata).sort(),
    knownTemplateRegistry: {
      enabled: registry.enabled,
      ruleKey: readString(registry, "ruleKey"),
      templateSlug: readString(registry, "templateSlug"),
      sourceType: readString(registry, "sourceType"),
      classificationRole: readString(registry, "classificationRole"),
      confidence: registry.confidence,
      registryVersion: readString(registry, "registryVersion"),
    },
    rubricatorCandidate: {
      objectTypeCode: readString(candidate, "objectTypeCode"),
      actionTypeCode: readString(candidate, "actionTypeCode"),
      contextCode: readString(candidate, "contextCode"),
      contextualCategorySlug: readString(candidate, "contextualCategorySlug"),
    },
    valueObjectMapping: {
      valueObjectTitle: readString(mapping, "valueObjectTitle"),
      valueObjectType: readString(mapping, "valueObjectType"),
      relationType: readString(mapping, "relationType"),
      metricKey: readString(mapping, "metricKey"),
      metricUnit: readString(mapping, "metricUnit"),
      deltaDirection: readString(mapping, "deltaDirection"),
      aggregateType: readString(mapping, "aggregateType"),
    },
  };
}

async function readTemplateMetadata(
  templateSlug: string
): Promise<TemplateMetadataResult> {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("id, slug, title, status, is_active, default_metadata_json")
    .eq("slug", templateSlug)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: "db_error",
      metadataSummary: null,
      errors: [`Failed to read activity template metadata: ${error.message}`],
    };
  }

  if (!data) {
    return {
      ok: false,
      reason: "not_found",
      metadataSummary: null,
      errors: ["Activity template was not found for requested slug."],
    };
  }

  if (!isRecord(data)) {
    return {
      ok: false,
      reason: "invalid_row",
      row: data,
      metadataSummary: null,
      errors: ["Activity template row must be an object."],
    };
  }

  const id = asString(data.id);
  const slug = asString(data.slug);
  const title = asString(data.title);
  const status = asString(data.status);
  const isActive = asBoolean(data.is_active);

  if (!id || !slug) {
    return {
      ok: false,
      reason: "invalid_row",
      row: data,
      metadataSummary: null,
      errors: ["Activity template row must contain non-empty id and slug."],
    };
  }

  if (!isRecord(data.default_metadata_json)) {
    return {
      ok: false,
      reason: "invalid_metadata",
      row: data,
      metadataSummary: null,
      errors: ["default_metadata_json must be an object."],
    };
  }

  return {
    ok: true,
    row: {
      id,
      slug,
      title,
      status,
      isActive,
      defaultMetadataJson: data.default_metadata_json,
    },
    metadataSummary: summarizeDefaultMetadata(data.default_metadata_json),
    errors: [],
  };
}

function compareSnapshotToHardcodedFallback(
  snapshot: KnownTemplateRegistryTableSnapshot
) {
  const hardcodedRule = KNOWN_TEMPLATE_RUBRICATOR_CLASSIFICATION_RULES.find(
    (rule) => rule.templateSlug === snapshot.templateSlug
  );

  if (!hardcodedRule) {
    return {
      hardcodedRuleFound: false,
      allMatched: false,
      comparedFields: {},
      warnings: ["No hardcoded fallback rule found for template slug."],
    };
  }

  const comparedFields: Record<string, boolean> = {
    ruleKey: snapshot.ruleKey === hardcodedRule.ruleKey,
    templateSlug: snapshot.templateSlug === hardcodedRule.templateSlug,
    objectTypeCode: snapshot.objectTypeCode === hardcodedRule.objectTypeCode,
    actionTypeCode: snapshot.actionTypeCode === hardcodedRule.actionTypeCode,
    contextCode: snapshot.contextCode === hardcodedRule.contextCode,
    contextualCategorySlug:
      snapshot.contextualCategorySlug === hardcodedRule.contextualCategorySlug,
  };

  return {
    hardcodedRuleFound: true,
    allMatched: Object.values(comparedFields).every(Boolean),
    comparedFields,
    warnings: [],
  };
}

function compactRegistryTableRead(result: KnownTemplateRegistryTableReadResult) {
  if (result.ok) {
    return {
      ok: true,
      reason: null,
      rowFound: true,
      snapshot: result.snapshot,
      diagnostics: result.diagnostics,
    };
  }

  return {
    ok: false,
    reason: result.reason,
    rowFound: false,
    diagnostics: result.diagnostics,
  };
}

async function buildTemplateDiagnostic(templateSlug: string) {
  const registryTableRead = await readKnownTemplateRegistryTableRowBySlug(
    supabase as unknown as KnownTemplateRegistryTableClient,
    templateSlug
  );

  const defaultMetadataRead = await readTemplateMetadata(templateSlug);

  const tableVsDefaultMetadata =
    registryTableRead.ok && defaultMetadataRead.ok
      ? compareKnownTemplateRegistryTableSnapshotToDefaultMetadata(
          registryTableRead.snapshot,
          defaultMetadataRead.row.defaultMetadataJson
        )
      : null;

  const tableVsHardcodedFallback = registryTableRead.ok
    ? compareSnapshotToHardcodedFallback(registryTableRead.snapshot)
    : null;

  return {
    templateSlug,
    registryTableRead: compactRegistryTableRead(registryTableRead),
    defaultMetadataRead,
    comparisons: {
      tableVsDefaultMetadata,
      tableVsHardcodedFallback,
    },
  };
}

function parseRequestedTemplateSlugs(request: Request): string[] {
  const url = new URL(request.url);

  const requested = unique([
    ...parseList(url.searchParams.get("templateSlug")),
    ...parseList(url.searchParams.get("templateSlugs")),
    ...parseList(url.searchParams.get("slug")),
  ]);

  return requested.length > 0 ? requested : DEFAULT_TEMPLATE_SLUGS;
}

export async function GET(request: Request) {
  const platformAdminGuard = await requirePlatformAdmin();

  if (!platformAdminGuard.ok) {
    return platformAdminErrorResponse(
      platformAdminGuard,
      "debug-api-platform-admin-guard-v1",
    );
  }

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

  const { appUser, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser?.id) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "App user context is missing appUser.id.",
      },
      { status: 500 }
    );
  }

  const templateSlugs = parseRequestedTemplateSlugs(request);

  if (templateSlugs.length > MAX_TEMPLATE_SLUGS) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: `Too many template slugs requested. Maximum is ${MAX_TEMPLATE_SLUGS}.`,
        requestedCount: templateSlugs.length,
      },
      { status: 400 }
    );
  }

  try {
    const diagnostics = await Promise.all(
      templateSlugs.map((templateSlug) => buildTemplateDiagnostic(templateSlug))
    );

    const registryTableRowsFound = diagnostics.filter(
      (item) => item.registryTableRead.ok
    ).length;

    const defaultMetadataRowsFound = diagnostics.filter(
      (item) => item.defaultMetadataRead.ok
    ).length;

    const tableVsDefaultAllMatched = diagnostics.every(
      (item) => item.comparisons.tableVsDefaultMetadata?.allMatched === true
    );

    const tableVsHardcodedAllMatched = diagnostics.every(
      (item) => item.comparisons.tableVsHardcodedFallback?.allMatched === true
    );

    const hasErrors = diagnostics.some(
      (item) =>
        !item.registryTableRead.ok ||
        !item.defaultMetadataRead.ok ||
        item.comparisons.tableVsDefaultMetadata?.allMatched === false ||
        item.comparisons.tableVsHardcodedFallback?.allMatched === false
    );

    return NextResponse.json({
      ok: !hasErrors,
      endpoint: ENDPOINT,
      diagnosticOnly: true,
      runtimeSwitchPerformed: false,
      resolverChanged: false,
      resolverOrderChanged: false,
      registryTableReaderUsedForDiagnosticsOnly: true,
      currentRuntimeSourcesStillActive: [
        "activity_templates.default_metadata_json",
        "hardcoded_fallback",
      ],
      requestedByAppUserId: appUser.id,
      checkedAt: new Date().toISOString(),
      filters: {
        templateSlugs,
      },
      summary: {
        requestedTemplates: templateSlugs.length,
        registryTableRowsFound,
        defaultMetadataRowsFound,
        tableVsDefaultAllMatched,
        tableVsHardcodedAllMatched,
      },
      diagnostics,
      notes: [
        "This endpoint reads the registry table for diagnostics only.",
        "It does not switch resolveKnownTemplateRubricatorClassificationRule to registry_table.",
        "Production runtime source order is unchanged.",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        diagnosticOnly: true,
        runtimeSwitchPerformed: false,
        resolverChanged: false,
        resolverOrderChanged: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to run known-template registry diagnostics.",
      },
      { status: 500 }
    );
  }
}