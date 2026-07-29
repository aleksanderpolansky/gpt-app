import fs from "node:fs";

const FILES = {
  shelfApi: "src/app/api/calendar/task-shelf/route.ts",
  detailApi:
    "src/app/api/calendar/task-shelf/[activityEventId]/route.ts",
  shelf: "src/components/calendar/cux6-task-shelf.tsx",
  modal: "src/components/calendar/cux6-task-detail-modal.tsx",
  composer:
    "src/components/calendar/cux2-inline-activity-composer.tsx",
  client: "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
  doc: "docs/CUX6_PRODUCTION_SMOKE_UX_HOTFIX_RU_20260729.md",
};

const source = Object.fromEntries(
  Object.entries(FILES).map(([key, path]) => [
    key,
    fs.readFileSync(path, "utf8"),
  ]),
);

const checks = [];

function check(name, condition) {
  checks.push({
    name,
    passed: Boolean(condition),
  });
}

function includes(file, fragment) {
  return source[file].includes(fragment);
}

function excludes(file, fragment) {
  return !source[file].includes(fragment);
}

function count(file, fragment) {
  return source[file].split(fragment).length - 1;
}

// File and scope lock.
for (const [key, path] of Object.entries(FILES)) {
  check(`file:${key}`, fs.existsSync(path));
}

check(
  "doc:baseline",
  includes(
    "doc",
    "f0b74c17d5a3c333495d932d9ab47ff42bf362df",
  ),
);
check("doc:one-card-link", includes("doc", "ровно одна ссылка"));
check("doc:per-group-collapse", includes("doc", "отдельно свёрнуты"));
check("doc:ai-deferred", includes("doc", "Master Plan v5"));

// Shelf response carries detail data.
check("shelf-api:input-text-type", includes("shelfApi", "inputText: string | null"));
check("shelf-api:description-type", includes("shelfApi", "description: string | null"));
check("shelf-api:source-type", includes("shelfApi", "source: string | null"));
check("shelf-api:privacy-type", includes("shelfApi", "privacyScope: string | null"));
check("shelf-api:select-source", includes("shelfApi", '"source"'));
check("shelf-api:select-privacy", includes("shelfApi", '"privacy_scope"'));
check("shelf-api:return-input", includes("shelfApi", "inputText: asString(row.input_text)"));
check("shelf-api:return-description", includes("shelfApi", "description: asString(row.description)"));
check("shelf-api:return-source", includes("shelfApi", "source: asString(row.source)"));
check("shelf-api:return-privacy", includes("shelfApi", "privacyScope: asString(row.privacy_scope)"));

// Shelf UI: one action and default collapsed groups.
check("shelf:export-item", includes("shelf", "export type Cux6ShelfItem"));
check("shelf:details-callback-prop", includes("shelf", "onOpenDetails: (item: Cux6ShelfItem) => void"));
check("shelf:no-next-link", excludes("shelf", 'import Link from "next/link"'));
check("shelf:no-review-href", excludes("shelf", "/calendar/activity-review?"));
check("shelf:one-details-render", count("shelf", "{copy.details}") === 1);
check("shelf:details-callback", includes("shelf", "onClick={() => onOpenDetails(item)}"));
check("shelf:unscheduled-default-closed", includes("shelf", "unscheduled: false"));
check("shelf:due-soon-default-closed", includes("shelf", "dueSoon: false"));
check("shelf:clarification-default-closed", includes("shelf", "needsClarification: false"));
check("shelf:aria-expanded", includes("shelf", "aria-expanded={isExpanded}"));
check("shelf:chevron-open", includes("shelf", '{isExpanded ? "⌃" : "⌄"}'));
check("shelf:items-gated", includes("shelf", "{isExpanded ? ("));
check("shelf:no-slice-preview", excludes("shelf", "group.items.slice(0, 3)"));
check("shelf:no-bottom-can-expand", excludes("shelf", "const canExpand"));
check("shelf:no-bottom-show-all", excludes("shelf", "{canExpand ? ("));
check("shelf:independent-state", includes("shelf", "[group.key]: !current[group.key]"));

// Detail route: ownership, edit and cancellation.
check("detail-api:patch", includes("detailApi", "export async function PATCH"));
check("detail-api:delete", includes("detailApi", "export async function DELETE"));
check("detail-api:user-context", includes("detailApi", "getActivityUserContext"));
check("detail-api:user-filter", includes("detailApi", '.eq("user_id", params.userId)'));
check("detail-api:actor-filter", includes("detailApi", '.eq("acting_as_actor_id", params.actorId)'));
check("detail-api:planned-filter", includes("detailApi", '.eq("activity_role_code", "planned")'));
check("detail-api:active-statuses", includes("detailApi", '["draft", "planned", "confirmed"]'));
check("detail-api:unscheduled", includes("detailApi", '"unscheduled"'));
check("detail-api:date-only", includes("detailApi", '"date_only"'));
check("detail-api:date-range", includes("detailApi", '"date_range"'));
check("detail-api:deadline", includes("detailApi", '"deadline"'));
check("detail-api:exact", includes("detailApi", '"exact"'));
check("detail-api:date-validation", includes("detailApi", "function isDateKey"));
check("detail-api:range-order", includes("detailApi", "scheduleEndDate < scheduleStartDate"));
check("detail-api:deadline-validation", includes("detailApi", "deadlineAt is required for deadline"));
check("detail-api:exact-validation", includes("detailApi", "Valid startedAt and endedAt"));
check("detail-api:update-title", includes("detailApi", "title,"));
check("detail-api:update-description", includes("detailApi", "description: asNullableString(body.description)"));
check("detail-api:clear-unused-date", includes("detailApi", 'scheduleModeCode === "date_only" ? scheduledDate : null'));
check("detail-api:cancel-status", includes("detailApi", 'status: "cancelled"'));
check("detail-api:cancel-projection", includes("detailApi", "cancelCalendarProjection"));
check("detail-api:sync-exact-projection", includes("detailApi", "syncExactCalendarProjection"));
check("detail-api:relation-column", includes("detailApi", "related_activity_event_id"));
check("detail-api:projection-count-guard", includes("detailApi", "rows.length > 1"));
check("detail-api:no-semantic-run-create", excludes("detailApi", "createActivitySemanticEnrichmentRunCux4"));
check("detail-api:no-after", excludes("detailApi", "after("));

// Modal parity with calendar card.
check("modal:dialog", includes("modal", 'role="dialog"'));
check("modal:aria-modal", includes("modal", 'aria-modal="true"'));
check("modal:edit-button", includes("modal", "{copy.edit}"));
check("modal:cancel-button", includes("modal", "{copy.cancel}"));
check("modal:container-button", includes("modal", "{copy.activityContainer}"));
check("modal:container-href", includes("modal", "/calendar/activity-review?"));
check("modal:patch-call", includes("modal", 'method: "PATCH"'));
check("modal:delete-call", includes("modal", 'method: "DELETE"'));
check("modal:title-field", includes("modal", "setTitle(event.target.value)"));
check("modal:description-field", includes("modal", "setDescription(event.target.value)"));
check("modal:mode-select", includes("modal", "setScheduleMode("));
check("modal:date-field", includes("modal", 'type="date"'));
check("modal:datetime-field", includes("modal", 'type="datetime-local"'));
check("modal:duration-field", includes("modal", 'type="number"'));
check("modal:seven-locales", count("modal", "eyebrow:") === 8);
check("modal:no-analysis-start", excludes("modal", "semantic-preview"));
check("modal:no-create-post", excludes("modal", 'method: "POST"'));

// Calendar client wiring.
check("client:modal-import", includes("client", "Cux6TaskDetailModal"));
check("client:item-type-import", includes("client", "type Cux6ShelfItem"));
check("client:selected-shelf-state", includes("client", "selectedShelfItem"));
check("client:open-details-callback", includes("client", "onOpenDetails={(item) =>"));
check("client:clear-calendar-selection", includes("client", "setSelectedEventId(null)"));
check("client:set-shelf-selection", includes("client", "setSelectedShelfItem(item)"));
check("client:modal-render", includes("client", "<Cux6TaskDetailModal"));
check("client:refresh-after-change", includes("client", "setEventsRefreshKey((value) => value + 1)"));
check("client:no-return-to-shelf-prop", excludes("client", "returnToTarget={returnToTarget}\n          refreshKey"));

// Composer CTA moved to header.
check("composer:one-save-handler-button", count("composer", "onClick={() => void saveActivity()}") === 1);
check("composer:add-label-once", count("composer", "copy.saving : copy.add") === 1);
check("composer:header-actions", includes("composer", 'className="flex flex-wrap items-center gap-2"'));
check("composer:add-before-grid", source.composer.indexOf("copy.saving : copy.add") < source.composer.indexOf('className="mt-4 grid gap-4'));
check("composer:close-near-add", Math.abs(source.composer.indexOf("copy.saving : copy.add") - source.composer.indexOf("{copy.close}")) < 1500);
check("composer:no-bottom-full-width-cta", excludes("composer", 'className="w-full rounded-[16px] bg-[#3b6ef8]'));
check("composer:canonical-save-function", includes("composer", "async function saveActivity()"));
check("composer:canonical-post-preserved", includes("composer", 'method: "POST"'));
check("composer:background-metadata-preserved", includes("composer", "backgroundAnalysis: true"));
check("composer:idempotency-preserved", includes("composer", "idempotencyKey"));

// No AI-rule architecture changes in hotfix payload sources.
check("boundary:shelf-no-ai-rules", excludes("shelf", "Cux3AiRulesEditor"));
check("boundary:modal-no-ai-rules", excludes("modal", "Cux3AiRulesEditor"));
check("boundary:detail-api-no-ai-rules", excludes("detailApi", "personal_rules"));
check(
  "boundary:no-cux7-implementation",
  ["shelfApi", "detailApi", "shelf", "modal", "composer", "client"]
    .every((key) => !source[key].includes("CUX7")),
);

const failed = checks.filter((item) => !item.passed);

for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}`);
}

console.log("");
console.log(
  `CUX6 UX hotfix contract checks: ${checks.length - failed.length}/${checks.length}`,
);

if (failed.length > 0) {
  process.exit(1);
}
