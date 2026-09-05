import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnv(path.resolve(".env.local"));
loadDotEnv(path.resolve(".env"));

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_ENV_MISSING");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const REFERENCE_TABLES = [
  "value_object_parameter_assignments",
  "activity_template_profile_parameters_v2",
  "fact_capture_precision_preferences",
  "activity_event_measures",
  "activity_object_facts",
];

const RETIRED_SELECT = [
  "id",
  "parameter_code",
  "title",
  "description",
  "dimension_code",
  "value_type_code",
  "canonical_unit_code",
  "allowed_unit_codes",
  "aggregation_method_code",
  "default_window_code",
  "allow_negative",
  "source_version",
  "status",
].join(",");

function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map((item) => item.trim())
    : [];
}

async function referenceCount(table, parameterDefinitionId) {
  const { count, error } = await supabase
    .from(table)
    .select("parameter_definition_id", { count: "exact", head: true })
    .eq("parameter_definition_id", parameterDefinitionId);

  if (error) {
    throw new Error(`REFERENCE_AUDIT_FAILED:${table}:${error.message}`);
  }
  if (typeof count !== "number") {
    throw new Error(`REFERENCE_AUDIT_COUNT_MISSING:${table}`);
  }
  return count;
}

async function enrich(row) {
  const referenceCounts = {};
  const references = [];
  let totalReferenceCount = 0;

  for (const table of REFERENCE_TABLES) {
    const count = await referenceCount(table, row.id);
    referenceCounts[table] = count;
    totalReferenceCount += count;
    if (count > 0) references.push(table);
  }

  return {
    id: String(row.id),
    parameterCode: String(row.parameter_code),
    title: String(row.title ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    dimensionCode: String(row.dimension_code ?? ""),
    valueTypeCode: String(row.value_type_code ?? ""),
    canonicalUnitCode: String(row.canonical_unit_code ?? ""),
    allowedUnitCodes: stringArray(row.allowed_unit_codes),
    aggregationMethodCode: String(row.aggregation_method_code ?? ""),
    defaultWindowCode: String(row.default_window_code ?? ""),
    allowNegative: row.allow_negative === true,
    sourceVersion: typeof row.source_version === "string" ? row.source_version : null,
    status: String(row.status ?? ""),
    references,
    referenceCounts,
    totalReferenceCount,
  };
}

function durationContractCompatible(item) {
  return (
    item.parameterCode === "duration" &&
    item.dimensionCode === "time" &&
    item.valueTypeCode === "numeric" &&
    item.canonicalUnitCode === "minute" &&
    item.allowedUnitCodes.includes("minute") &&
    item.aggregationMethodCode === "sum" &&
    item.defaultWindowCode === "event" &&
    item.allowNegative === false
  );
}

async function audit() {
  const { data: retiredRows, error: retiredError } = await supabase
    .from("value_object_parameter_definitions")
    .select(RETIRED_SELECT)
    .eq("scope_code", "system")
    .eq("status", "retired")
    .neq("parameter_code", "process_count")
    .order("parameter_code", { ascending: true });

  if (retiredError) {
    throw new Error(`RETIRED_PARAMETER_READ_FAILED:${retiredError.message}`);
  }

  const { data: countRows, error: countError } = await supabase
    .from("value_object_parameter_definitions")
    .select("id,parameter_code,status")
    .eq("scope_code", "system")
    .eq("parameter_code", "count");

  if (countError) {
    throw new Error(`COUNT_PARAMETER_READ_FAILED:${countError.message}`);
  }

  const activeCountRows = (countRows ?? []).filter((row) => row.status === "active");
  if (activeCountRows.length !== 1) {
    throw new Error(`COUNT_PARAMETER_ACTIVE_SHAPE_INVALID:${activeCountRows.length}`);
  }

  const { data: durationRows, error: durationError } = await supabase
    .from("value_object_parameter_definitions")
    .select(RETIRED_SELECT)
    .eq("scope_code", "system")
    .eq("parameter_code", "duration");

  if (durationError) {
    throw new Error(`DURATION_PARAMETER_READ_FAILED:${durationError.message}`);
  }
  if ((durationRows ?? []).length !== 1) {
    throw new Error(`DURATION_PARAMETER_SHAPE_INVALID:${(durationRows ?? []).length}`);
  }

  const duration = await enrich(durationRows[0]);
  const durationCompatible = durationContractCompatible(duration);
  if (!durationCompatible) {
    throw new Error(
      `DURATION_CONTRACT_MISMATCH:${JSON.stringify({
        dimensionCode: duration.dimensionCode,
        valueTypeCode: duration.valueTypeCode,
        canonicalUnitCode: duration.canonicalUnitCode,
        allowedUnitCodes: duration.allowedUnitCodes,
        aggregationMethodCode: duration.aggregationMethodCode,
        defaultWindowCode: duration.defaultWindowCode,
        allowNegative: duration.allowNegative,
      })}`,
    );
  }

  const candidates = [];
  const protectedRows = [];

  for (const row of retiredRows ?? []) {
    const item =
      String(row.parameter_code) === "duration" ? duration : await enrich(row);

    // Duration is intentionally preserved for reuse/reactivation.
    if (item.parameterCode === "duration") continue;

    if (item.totalReferenceCount === 0) candidates.push(item);
    else protectedRows.push(item);
  }

  return {
    contract: "arctor_retired_system_parameter_purge_v1_0_3",
    referenceTables: REFERENCE_TABLES,
    retiredVisibleCount: (retiredRows ?? []).length,
    candidateCount: candidates.length,
    protectedCount: protectedRows.length,
    candidates,
    protected: protectedRows,
    duration,
    durationPreservedForReuse: true,
    durationContractCompatible: durationCompatible,
    activeCountParameterId: String(activeCountRows[0].id),
  };
}

async function purge() {
  const before = await audit();
  const candidateIds = before.candidates.map((item) => item.id);

  if (candidateIds.length === 0) {
    return {
      ...before,
      deletedCount: 0,
      deleted: [],
      remainingTargetCount: 0,
      mutationApplied: false,
    };
  }

  // Single bulk DELETE statement: if any omitted/unknown FK still protects a row,
  // PostgreSQL rejects the statement atomically and deletes nothing.
  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .delete()
    .eq("scope_code", "system")
    .eq("status", "retired")
    .neq("parameter_code", "process_count")
    .neq("parameter_code", "duration")
    .in("id", candidateIds)
    .select("id,parameter_code");

  if (error) {
    if (error.code === "23503") {
      throw new Error(`PURGE_BLOCKED_BY_FOREIGN_KEY:${error.message}`);
    }
    throw new Error(`PURGE_DELETE_FAILED:${error.code ?? "UNKNOWN"}:${error.message}`);
  }

  const deleted = (data ?? []).map((row) => ({
    id: String(row.id),
    parameterCode: String(row.parameter_code),
  }));

  const deletedIds = new Set(deleted.map((item) => item.id));
  const missingDeletes = candidateIds.filter((id) => !deletedIds.has(id));
  if (missingDeletes.length > 0 || deleted.length !== candidateIds.length) {
    throw new Error(
      `PURGE_DELETE_COUNT_MISMATCH:expected=${candidateIds.length}:actual=${deleted.length}`,
    );
  }

  const { data: remaining, error: remainingError } = await supabase
    .from("value_object_parameter_definitions")
    .select("id,parameter_code")
    .in("id", candidateIds);

  if (remainingError) {
    throw new Error(`PURGE_VERIFY_FAILED:${remainingError.message}`);
  }
  if ((remaining ?? []).length !== 0) {
    throw new Error(`PURGE_VERIFY_REMAINING:${remaining.length}`);
  }

  const { data: durationRows, error: durationError } = await supabase
    .from("value_object_parameter_definitions")
    .select("id,parameter_code,status")
    .eq("id", before.duration.id)
    .eq("parameter_code", "duration");

  if (durationError) {
    throw new Error(`DURATION_POST_PURGE_VERIFY_FAILED:${durationError.message}`);
  }
  if ((durationRows ?? []).length !== 1) {
    throw new Error("DURATION_WAS_NOT_PRESERVED");
  }

  const after = await audit();
  return {
    ...before,
    deletedCount: deleted.length,
    deleted,
    remainingTargetCount: 0,
    mutationApplied: deleted.length > 0,
    afterRetiredVisibleCount: after.retiredVisibleCount,
    afterCandidateCount: after.candidateCount,
    afterProtectedCount: after.protectedCount,
    durationAfterPurge: after.duration,
  };
}

const mode = process.argv[2] || "audit";
if (!["audit", "purge"].includes(mode)) {
  throw new Error("Usage: node script.mjs [audit|purge]");
}

const result = mode === "purge" ? await purge() : await audit();
process.stdout.write(`${JSON.stringify(result)}\n`);
