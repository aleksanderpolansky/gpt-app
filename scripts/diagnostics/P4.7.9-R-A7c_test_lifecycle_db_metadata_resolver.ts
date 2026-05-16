import { supabase } from "../../lib/supabase";

import { ensureActivityEventRubricatorClassificationForKnownTemplate } from "../../lib/activity/activityRubricatorClassificationLifecycle";

type TemplateSlug =
  | "german-marketing-handwriting-practice"
  | "knee-training-health-practice";

type ActivityTemplateRow = {
  id: string;
  slug: TemplateSlug;
};

type ActivityEventRow = {
  id: string;
  user_id: string;
  activity_template_id: string | null;
  title: string | null;
  status: string | null;
  created_at: string;
};

type EntityClassificationRow = {
  id: string;
  entity_id: string;
  classification_role: string | null;
};

type RuleResolverMetadata = {
  source?: unknown;
  diagnostics?: {
    dbMetadataMatchesHardcoded?: unknown;
    mismatches?: unknown;
    selectedSource?: unknown;
    dbMetadataReadOk?: unknown;
    dbMetadataFound?: unknown;
  };
  errors?: unknown;
};

const TEMPLATE_SLUGS: TemplateSlug[] = [
  "german-marketing-handwriting-practice",
  "knee-training-health-practice",
];

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readRuleResolverMetadata(metadata: unknown): RuleResolverMetadata {
  const metadataRecord = asRecord(metadata);
  const ruleResolver = asRecord(metadataRecord.ruleResolver);

  return ruleResolver as RuleResolverMetadata;
}

async function readTemplate(templateSlug: TemplateSlug): Promise<ActivityTemplateRow> {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("id, slug")
    .eq("slug", templateSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`${templateSlug}: failed to read activity_template: ${error.message}`);
  }

  if (!data) {
    throw new Error(`${templateSlug}: activity_template not found`);
  }

  return data as ActivityTemplateRow;
}

async function findPreclassifiedEvent(template: ActivityTemplateRow) {
  const { data: eventsData, error: eventsError } = await supabase
    .from("activity_events")
    .select("id, user_id, activity_template_id, title, status, created_at")
    .eq("activity_template_id", template.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventsError) {
    throw new Error(
      `${template.slug}: failed to read candidate events: ${eventsError.message}`
    );
  }

  const events = (eventsData ?? []) as ActivityEventRow[];

  if (events.length === 0) {
    throw new Error(`${template.slug}: no candidate activity_events found`);
  }

  const eventIds = events.map((event) => event.id);

  const { data: classificationsData, error: classificationsError } = await supabase
    .from("entity_classifications")
    .select("id, entity_id, classification_role")
    .eq("entity_type", "activity_event")
    .in("entity_id", eventIds);

  if (classificationsError) {
    throw new Error(
      `${template.slug}: failed to read existing classifications: ${classificationsError.message}`
    );
  }

  const classifications = (classificationsData ?? []) as EntityClassificationRow[];

  const event = events.find((candidate) =>
    classifications.some((classification) => classification.entity_id === candidate.id)
  );

  if (!event) {
    throw new Error(
      `${template.slug}: no preclassified event found; diagnostic intentionally does not call lifecycle on unclassified events`
    );
  }

  const eventClassifications = classifications.filter(
    (classification) => classification.entity_id === event.id
  );

  return {
    event,
    beforeClassificationCount: eventClassifications.length,
  };
}

async function countClassifications(eventId: string): Promise<number> {
  const { data, error } = await supabase
    .from("entity_classifications")
    .select("id")
    .eq("entity_type", "activity_event")
    .eq("entity_id", eventId);

  if (error) {
    throw new Error(`failed to count classifications for event ${eventId}: ${error.message}`);
  }

  return (data ?? []).length;
}

async function runForTemplate(templateSlug: TemplateSlug) {
  const errors: string[] = [];

  try {
    const template = await readTemplate(templateSlug);
    const { event, beforeClassificationCount } = await findPreclassifiedEvent(template);

    const result = await ensureActivityEventRubricatorClassificationForKnownTemplate({
      supabase,
      eventId: event.id,
      userId: event.user_id,
      activityTemplateId: event.activity_template_id,
      templateSlug,
      processorName: `p479_r_a7c_lifecycle_patch_diagnostic_${templateSlug}`,
    });

    const afterClassificationCount = await countClassifications(event.id);

    const ruleResolver = readRuleResolverMetadata(result.metadata);
    const diagnostics = ruleResolver.diagnostics ?? {};

    if (!result.ok) {
      errors.push(`${templateSlug}: lifecycle result ok=false`);
      errors.push(...result.errors);
    }

    if (ruleResolver.source !== "db_metadata") {
      errors.push(
        `${templateSlug}: expected ruleResolver.source=db_metadata, got ${String(
          ruleResolver.source
        )}`
      );
    }

    if (diagnostics.dbMetadataMatchesHardcoded !== true) {
      errors.push(
        `${templateSlug}: expected dbMetadataMatchesHardcoded=true, got ${String(
          diagnostics.dbMetadataMatchesHardcoded
        )}`
      );
    }

    if (!Array.isArray(diagnostics.mismatches) || diagnostics.mismatches.length !== 0) {
      errors.push(
        `${templateSlug}: expected empty mismatches, got ${JSON.stringify(
          diagnostics.mismatches
        )}`
      );
    }

    if (afterClassificationCount !== beforeClassificationCount) {
      errors.push(
        `${templateSlug}: classification count changed unexpectedly: before=${beforeClassificationCount}, after=${afterClassificationCount}`
      );
    }

    return {
      templateSlug,
      ok: errors.length === 0,
      selectedEvent: {
        id: event.id,
        title: event.title,
        status: event.status,
        createdAt: event.created_at,
      },
      resultOk: result.ok,
      skipped: result.skipped,
      skipReason: result.skipReason,
      ruleKey: result.ruleKey,
      ruleResolver,
      beforeClassificationCount,
      afterClassificationCount,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      templateSlug,
      ok: false,
      selectedEvent: null,
      resultOk: false,
      skipped: null,
      skipReason: null,
      ruleKey: null,
      ruleResolver: null,
      beforeClassificationCount: null,
      afterClassificationCount: null,
      errors: [message],
    };
  }
}

async function main() {
  const rows = [];

  for (const templateSlug of TEMPLATE_SLUGS) {
    rows.push(await runForTemplate(templateSlug));
  }

  const summary = {
    step: "P4.7.9-R-A7c",
    templatesCount: TEMPLATE_SLUGS.length,
    checksCount: rows.length,
    allOk: rows.every((row) => row.ok),
    allUsedDbMetadata: rows.every(
      (row) =>
        row.ruleResolver &&
        typeof row.ruleResolver === "object" &&
        (row.ruleResolver as RuleResolverMetadata).source === "db_metadata"
    ),
    noClassificationCountChanged: rows.every(
      (row) => row.beforeClassificationCount === row.afterClassificationCount
    ),
  };

  console.log(
    JSON.stringify(
      {
        summary,
        rows,
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
