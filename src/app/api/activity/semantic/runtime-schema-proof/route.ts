import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import { getSupabaseAdminClient } from "../../../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type ProbeResult = {
  table: string;
  column: string;
  exists: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

type TableInventory = {
  table: string;
  tableReadable: boolean;
  expectedColumns: string[];
  existingColumns: string[];
  missingColumns: string[];
  probes: ProbeResult[];
};

const VALUE_OBJECT_EXPECTED_COLUMNS = [
  "id",
  "organization_id",
  "actor_id",
  "space_id",
  "app_user_id",
  "owner_user_id",
  "title",
  "name",
  "description",
  "visibility",
  "status",
  "source",
  "semantic_signature",
  "metadata",
  "created_at",
  "updated_at",
];

const ACTIVITY_VALUE_OBJECT_LINK_EXPECTED_COLUMNS = [
  "id",
  "activity_event_id",
  "value_object_id",
  "actor_id",
  "space_id",
  "app_user_id",
  "organization_id",
  "link_type",
  "exposure_type",
  "confidence",
  "evidence",
  "metadata",
  "created_at",
  "updated_at",
];

const CRITICAL_VALUE_OBJECT_SCOPE_COLUMNS = [
  "actor_id",
  "space_id",
  "app_user_id",
  "owner_user_id",
  "visibility",
  "source",
  "semantic_signature",
  "metadata",
];

const CRITICAL_LINK_COLUMNS = [
  "id",
  "activity_event_id",
  "value_object_id",
  "actor_id",
  "space_id",
  "app_user_id",
  "organization_id",
  "link_type",
  "exposure_type",
  "confidence",
  "evidence",
  "metadata",
  "created_at",
  "updated_at",
];

function sanitizeErrorMessage(value: string | null | undefined): string | null {
  return value ? value.slice(0, 260) : null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function readStringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[key];

  return typeof fieldValue === "string" && fieldValue.length > 0
    ? fieldValue
    : null;
}

function readAuthSubjectFromSession(session: unknown): string | null {
  if (!isRecord(session)) {
    return null;
  }

  const user = session.user;

  if (!isRecord(user)) {
    return null;
  }

  return readStringProperty(user, "sub");
}

function hashDiagnosticValue(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return crypto
    .createHash("sha256")
    .update(value.trim())
    .digest("hex")
    .slice(0, 16);
}

async function probeColumn(
  supabase: any,
  table: string,
  column: string
): Promise<ProbeResult> {
  try {
    const { error } = await supabase.from(table).select(column).limit(1);

    if (error) {
      return {
        table,
        column,
        exists: false,
        errorCode: error.code ?? "unknown",
        errorMessage: sanitizeErrorMessage(error.message),
      };
    }

    return {
      table,
      column,
      exists: true,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      table,
      column,
      exists: false,
      errorCode: "unexpected_probe_error",
      errorMessage:
        error instanceof Error
          ? sanitizeErrorMessage(error.message)
          : "Unexpected probe error.",
    };
  }
}

async function buildInventory(
  supabase: any,
  table: string,
  expectedColumns: string[]
): Promise<TableInventory> {
  const probes: ProbeResult[] = [];

  for (const column of expectedColumns) {
    probes.push(await probeColumn(supabase, table, column));
  }

  const existingColumns = probes
    .filter((probe) => probe.exists)
    .map((probe) => probe.column);

  const missingColumns = expectedColumns.filter(
    (column) => !existingColumns.includes(column)
  );

  return {
    table,
    tableReadable: existingColumns.includes("id"),
    expectedColumns,
    existingColumns,
    missingColumns,
    probes,
  };
}

function missingFromInventory(
  inventory: TableInventory,
  requiredColumns: string[]
): string[] {
  return requiredColumns.filter(
    (column) => !inventory.existingColumns.includes(column)
  );
}

function allPresent(inventory: TableInventory, requiredColumns: string[]): boolean {
  return missingFromInventory(inventory, requiredColumns).length === 0;
}

export async function GET() {
  let session: unknown = null;
  let sessionReadOk = true;

  try {
    session = await auth0.getSession();
  } catch {
    sessionReadOk = false;
  }

  const trustedAuthSubject = readAuthSubjectFromSession(session);
  const supabase = getSupabaseAdminClient() as any;

  const [valueObjectsInventory, activityValueObjectLinksInventory] =
    await Promise.all([
      buildInventory(
        supabase,
        "value_objects",
        VALUE_OBJECT_EXPECTED_COLUMNS
      ),
      buildInventory(
        supabase,
        "activity_value_object_links",
        ACTIVITY_VALUE_OBJECT_LINK_EXPECTED_COLUMNS
      ),
    ]);

  const missingCriticalValueObjectColumns = missingFromInventory(
    valueObjectsInventory,
    CRITICAL_VALUE_OBJECT_SCOPE_COLUMNS
  );

  const missingCriticalLinkColumns = missingFromInventory(
    activityValueObjectLinksInventory,
    CRITICAL_LINK_COLUMNS
  );

  const checks = {
    valueObjectsTableReadable: valueObjectsInventory.tableReadable,
    valueObjectsCriticalPersonalScopeVisible: allPresent(
      valueObjectsInventory,
      CRITICAL_VALUE_OBJECT_SCOPE_COLUMNS
    ),
    activityValueObjectLinksTableReadable:
      activityValueObjectLinksInventory.tableReadable,
    activityValueObjectLinksCriticalColumnsVisible: allPresent(
      activityValueObjectLinksInventory,
      CRITICAL_LINK_COLUMNS
    ),
    sourceColumnVisible: valueObjectsInventory.existingColumns.includes("source"),
    semanticSignatureColumnVisible:
      valueObjectsInventory.existingColumns.includes("semantic_signature"),
    valueObjectMetadataColumnVisible:
      valueObjectsInventory.existingColumns.includes("metadata"),
    linkEvidenceColumnVisible:
      activityValueObjectLinksInventory.existingColumns.includes("evidence"),
    linkMetadataColumnVisible:
      activityValueObjectLinksInventory.existingColumns.includes("metadata"),
    dbWriteExecuted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateDeltaCreated: false,
  };

  const passed =
    checks.valueObjectsTableReadable &&
    checks.valueObjectsCriticalPersonalScopeVisible &&
    checks.activityValueObjectLinksTableReadable &&
    checks.activityValueObjectLinksCriticalColumnsVisible &&
    checks.sourceColumnVisible &&
    checks.semanticSignatureColumnVisible &&
    checks.valueObjectMetadataColumnVisible &&
    checks.linkEvidenceColumnVisible &&
    checks.linkMetadataColumnVisible &&
    !checks.dbWriteExecuted &&
    !checks.valueObjectCreated &&
    !checks.activityValueObjectLinkCreated &&
    !checks.stateDeltaCreated;

  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/semantic/runtime-schema-proof",
    policy: "runtime_schema_proof_after_c32_migration_v0",
    mode: "read_only_postgrest_schema_cache_full_column_proof_no_write",
    auth0Session: {
      readAttempted: true,
      readOk: sessionReadOk,
      sessionAvailable: Boolean(session),
      trustedAuthSubjectPresent: Boolean(trustedAuthSubject),
      trustedAuthSubjectSha256Prefix: hashDiagnosticValue(trustedAuthSubject),
    },
    result: {
      passed,
      checks,
      missingCriticalValueObjectColumns,
      missingCriticalLinkColumns,
    },
    targetInventories: {
      valueObjects: valueObjectsInventory,
      activityValueObjectLinks: activityValueObjectLinksInventory,
    },
    writes: {
      sqlExecuted: false,
      dbReadExecuted: true,
      dbWriteExecuted: false,
      supabaseReadExecuted: true,
      supabaseWriteExecuted: false,
      activityEventInserted: false,
      valueObjectCreated: false,
      activityValueObjectLinkCreated: false,
      stateDeltaCreated: false,
      stateFactCreated: false,
      stateSnapshotCreated: false,
    },
    next: passed
      ? "C32-C stable semantic bundle proof can start."
      : "Stop: PostgREST/API schema cache still does not expose all required C32 columns.",
  });
}
