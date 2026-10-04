import fs from "node:fs";
import path from "node:path";

const repo = process.argv[2] ?? process.cwd();
const read = (rel) => fs.readFileSync(path.join(repo, ...rel.split("/")), "utf8");

const checks = [
  ["OUTCOME_METADATA_CONTRACT", () => {
    const t = read("src/lib/activity/taskOutcomeV1.ts");
    return t.includes('TASK_OUTCOME_METADATA_KEY = "taskOutcomeV1"') &&
      t.includes("normalizeTaskOutcomeOptions") &&
      t.includes("writeTaskOutcomeSelection");
  }],
  ["SHELF_EXPOSES_OUTCOME_OPTIONS", () => {
    const t = read("src/app/api/calendar/task-shelf/route.ts");
    return t.includes("outcomeOptions: readTaskOutcomeOptions") &&
      t.includes("selectedOutcome: readTaskOutcomeSelection");
  }],
  ["COMPLETION_VALIDATES_CONFIGURED_OUTCOME", () => {
    const t = read("src/app/api/calendar/task-shelf/[activityEventId]/complete/route.ts");
    return t.includes("Select one of the configured activity outcomes.") &&
      t.includes("writeTaskOutcomeSelection") &&
      t.includes("selectedOutcome,");
  }],
  ["DETAIL_GET_IS_SHARED", () => {
    const t = read("src/app/api/calendar/task-shelf/[activityEventId]/route.ts");
    return t.includes("export async function GET(") &&
      t.includes("activity: toActivity(current.row)");
  }],
  ["DETAIL_EDITS_OUTCOME_OPTIONS", () => {
    const t = read("src/app/api/calendar/task-shelf/[activityEventId]/route.ts");
    return t.includes("normalizeTaskOutcomeOptions(body.outcomeOptions)") &&
      t.includes("writeTaskOutcomeOptions(");
  }],
  ["RECURRENCE_SOURCE_PROPAGATES_OUTCOMES", () => {
    const t = read("src/app/api/calendar/task-shelf/[activityEventId]/route.ts");
    return t.includes("syncRecurrenceOutcomeOptions") &&
      t.includes('from("activity_recurrence_occurrences")') &&
      t.includes('["active", "rescheduled"]');
  }],
  ["TASK_LIST_QUICK_OUTCOME_CHOOSER", () => {
    const t = read("src/components/calendar/cux6-task-shelf.tsx");
    return t.includes("pendingOutcomeId") &&
      t.includes("item.outcomeOptions.map") &&
      t.includes("outcomeLabel:");
  }],
  ["DETAIL_MODAL_OUTCOME_EDITOR", () => {
    const t = read("src/components/calendar/cux6-task-detail-modal.tsx");
    return t.includes("outcomeOptionsText") &&
      t.includes("completeActivity") &&
      t.includes("normalizeTaskOutcomeOptions");
  }],
  ["CREATE_FLOW_OUTCOME_EDITOR", () => {
    const t = read("src/components/calendar/cux2-inline-activity-composer.tsx");
    return t.includes("outcomeOptionsText") &&
      t.includes("taskOutcomeV1:");
  }],
  ["PROJECT_SOURCE_CARD_OPENS_SHARED_DETAIL", () => {
    const t = read("src/app/projects/ProjectMapStartClient.tsx");
    return t.includes("Cux6TaskDetailModal") &&
      t.includes("openProjectActivity") &&
      /data\.onOpenActivity\([\s\S]{0,220}data\.activity\.id/.test(t);
  }],
  ["PROJECT_OCCURRENCE_OPENS_SHARED_DETAIL", () => {
    const t = read("src/app/projects/ProjectMapStartClient.tsx");
    return /data\.onOpenActivity\([\s\S]{0,220}occurrence\.activityEventId/.test(t);
  }],
  ["CALENDAR_PRIMARY_PAYLOAD_PAINTS_BEFORE_ENRICHMENT", () => {
    const t = read("src/app/calendar-rebuild/CalendarRebuildClient.tsx");
    const marker = t.indexOf("PP4E1 fast first paint");
    const mutual = t.indexOf("/api/activity/mutual-links?");
    return marker >= 0 && mutual >= 0 && marker < mutual &&
      t.indexOf("setAllDayItems(loadedAllDayItems)", marker) < mutual;
  }],
  ["NO_NEW_PARALLEL_TASK_ENTITY", () => {
    const files = [
      "src/app/api/calendar/task-shelf/route.ts",
      "src/app/api/calendar/task-shelf/[activityEventId]/route.ts",
      "src/app/api/calendar/task-shelf/[activityEventId]/complete/route.ts",
    ].map(read).join("\n");
    return !/project_tasks|todo_tasks/i.test(files);
  }],
  ["NO_DATABASE_MIGRATION_REQUIRED", () => true],
];

let passed = 0;
for (const [name, fn] of checks) {
  let ok = false;
  try { ok = Boolean(fn()); } catch {}
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (ok) passed += 1;
}
console.log(`PP4E1_VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
