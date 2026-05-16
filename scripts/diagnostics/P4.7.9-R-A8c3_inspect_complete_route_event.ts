import { supabase } from "../../lib/supabase";

import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../lib/activity/activityRubricatorClassificationLifecycle";

const EVENT_ID = "e20680a6-585a-480b-a267-524aacdbedcd";
const TEMPLATE_SLUG = "german-marketing-handwriting-practice";
const EXPECTED_RULE_KEY =
  "german_marketing_handwriting_practice_to_business_german";

type GenericRow = Record<string, unknown>;

function asRecord(value: unknown): GenericRow {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as GenericRow;
  }

  return {};
}

function getString(row: GenericRow, key: string): string | null {
  const value = row[key];

  return typeof value === "string" ? value : null;
}

function scanForTokens(value: unknown): {
  hasDbMetadataSource: boolean;
  hasDbMetadataMatchesHardcoded: boolean;
  hasMismatches: boolean;
  hasEmptyMismatches: boolean;
  hasRuleKey: boolean;
  hasRubricator: boolean;
  hasRuleResolver: boolean;
} {
  const serialized = JSON.stringify(value);

  return {
    hasDbMetadataSource: serialized.includes("db_metadata"),
    hasDbMetadataMatchesHardcoded: serialized.includes(
      "dbMetadataMatchesHardcoded"
    ),
    hasMismatches: serialized.includes("mismatches"),
    hasEmptyMismatches:
      serialized.includes('"mismatches":[]') ||
      serialized.includes('"mismatches": []'),
    hasRuleKey: serialized.includes(EXPECTED_RULE_KEY),
    hasRubricator: serialized.includes("rubricator"),
    hasRuleResolver: serialized.includes("ruleResolver"),
  };
}

function compactLog(row: GenericRow) {
  const metadata = asRecord(row.metadata_json);

  return {
    id: getString(row, "id"),
    createdAt: getString(row, "created_at") ?? getString(row, "createdAt"),
    processorName:
      getString(row, "processor_name") ??
      getString(row, "processorName") ??
      getString(row, "processor"),
    processingStatus:
      getString(row, "processing_status") ??
      getString(row, "processingStatus") ??
      getString(row, "status"),
    severity: getString(row, "severity"),
    metadataKeys: Object.keys(metadata),
    tokens: scanForTokens(row),
  };
}

async function readEvent() {
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("id", EVENT_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read activity_event: ${error.message}`);
  }

  if (!data) {
    throw new Error(`activity_event not found: ${EVENT_ID}`);
  }

  return data as GenericRow;
}

async function readClassifications() {
  const { data, error } = await supabase
    .from("entity_classifications")
    .select("*")
    .eq("entity_type", "activity_event")
    .eq("entity_id", EVENT_ID);

  if (error) {
    throw new Error(`Failed to read entity_classifications: ${error.message}`);
  }

  return (data ?? []) as GenericRow[];
}

async function readRecentProcessingLogs() {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    throw new Error(`Failed to read activity_processing_logs: ${error.message}`);
  }

  return (data ?? []) as GenericRow[];
}

async function main() {
  const event = await readEvent();
  const classificationsBefore = await readClassifications();

  const userId = getString(event, "user_id");

  if (!userId) {
    throw new Error(`activity_event has no user_id: ${EVENT_ID}`);
  }

  const lifecycleResult =
    await ensureActivityEventRubricatorClassificationForKnownTemplate({
      supabase,
      eventId: EVENT_ID,
      userId,
      activityTemplateId: getString(event, "activity_template_id"),
      templateSlug: TEMPLATE_SLUG,
      processorName: "p479_r_a8c3_complete_route_existing_event_diagnostic",
    });

  const classificationsAfter = await readClassifications();
  const recentLogs = await readRecentProcessingLogs();

  const eventLogs = recentLogs.filter((row) =>
    JSON.stringify(row).includes(EVENT_ID)
  );

  const classificationTokens = scanForTokens(classificationsAfter);
  const lifecycleTokens = scanForTokens(lifecycleResult);
  const eventLogTokens = scanForTokens(eventLogs);

  const checks = {
    eventFound: true,
    eventId: EVENT_ID,
    eventTitle: getString(event, "title"),
    eventStatus: getString(event, "status"),
    eventProcessingStatus: getString(event, "processing_status"),
    eventTemplateId: getString(event, "activity_template_id"),
    startedAt: getString(event, "started_at"),
    endedAt: getString(event, "ended_at"),
    durationMinutes: event.duration_minutes,

    classificationsBeforeCount: classificationsBefore.length,
    classificationsAfterCount: classificationsAfter.length,
    classificationCountUnchanged:
      classificationsBefore.length === classificationsAfter.length,
    hasClassification: classificationsAfter.length > 0,

    lifecycleOk: lifecycleResult.ok,
    lifecycleSkipped: lifecycleResult.skipped,
    lifecycleAlreadyExisted: lifecycleResult.alreadyExisted,
    lifecycleRuleKey: lifecycleResult.ruleKey,
    lifecycleHasDbMetadataSource: lifecycleTokens.hasDbMetadataSource,
    lifecycleHasRuleResolver: lifecycleTokens.hasRuleResolver,
    lifecycleHasDbMetadataMatchesHardcoded:
      lifecycleTokens.hasDbMetadataMatchesHardcoded,
    lifecycleHasEmptyMismatches: lifecycleTokens.hasEmptyMismatches,

    eventLogsCount: eventLogs.length,
    eventLogsHaveRubricator: eventLogTokens.hasRubricator,
    eventLogsHaveRuleKey: eventLogTokens.hasRuleKey,
    eventLogsExposeRuleResolver: eventLogTokens.hasRuleResolver,
    eventLogsExposeDbMetadata: eventLogTokens.hasDbMetadataSource,

    classificationsHaveRuleKey: classificationTokens.hasRuleKey,
  };

  const summary = {
    step: "P4.7.9-R-A8c-3",
    completeRouteCompletedEvent: checks.eventStatus === "completed",
    routeEvidenceOk:
      checks.hasClassification &&
      checks.eventLogsCount > 0 &&
      checks.eventLogsHaveRubricator &&
      checks.eventLogsHaveRuleKey,
    lifecycleResolverEvidenceOk:
      checks.lifecycleOk &&
      checks.lifecycleHasRuleResolver &&
      checks.lifecycleHasDbMetadataSource &&
      checks.lifecycleHasDbMetadataMatchesHardcoded &&
      checks.lifecycleHasEmptyMismatches,
    noDuplicateClassification: checks.classificationCountUnchanged,
    processingLogsExposeResolverMetadata:
      checks.eventLogsExposeRuleResolver && checks.eventLogsExposeDbMetadata,
    allOk:
      checks.eventStatus === "completed" &&
      checks.hasClassification &&
      checks.eventLogsCount > 0 &&
      checks.eventLogsHaveRubricator &&
      checks.eventLogsHaveRuleKey &&
      checks.lifecycleOk &&
      checks.lifecycleHasRuleResolver &&
      checks.lifecycleHasDbMetadataSource &&
      checks.lifecycleHasDbMetadataMatchesHardcoded &&
      checks.lifecycleHasEmptyMismatches &&
      checks.classificationCountUnchanged,
  };

  console.log(
    JSON.stringify(
      {
        summary,
        checks,
        lifecycleResult: {
          ok: lifecycleResult.ok,
          skipped: lifecycleResult.skipped,
          skipReason: lifecycleResult.skipReason,
          ruleKey: lifecycleResult.ruleKey,
          classificationId: lifecycleResult.classificationId,
          classificationStatus: lifecycleResult.classificationStatus,
          created: lifecycleResult.created,
          alreadyExisted: lifecycleResult.alreadyExisted,
          metadata: lifecycleResult.metadata,
          errors: lifecycleResult.errors,
        },
        compactEventLogs: eventLogs.map(compactLog),
      },
      null,
      2
    )
  );

  if (!summary.allOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
