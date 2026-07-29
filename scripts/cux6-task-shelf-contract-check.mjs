import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  route: path.join(
    root,
    "src/app/api/calendar/task-shelf/route.ts",
  ),
  component: path.join(
    root,
    "src/components/calendar/cux6-task-shelf.tsx",
  ),
  client: path.join(
    root,
    "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
  ),
  docs: path.join(
    root,
    "docs/CUX6_TASK_SHELF_RU_20260729.md",
  ),
};

for (const [label, filePath] of Object.entries(files)) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

const route = fs.readFileSync(files.route, "utf8");
const component = fs.readFileSync(files.component, "utf8");
const client = fs.readFileSync(files.client, "utf8");
const docs = fs.readFileSync(files.docs, "utf8");

const checks = [
  ["route exports GET", /export async function GET\(request: Request\)/.test(route)],
  ["route is dynamic", /export const dynamic = "force-dynamic"/.test(route)],
  ["route uses user context", /getActivityUserContext/.test(route)],
  ["route reads activity_events", /\.from\("activity_events"\)/.test(route)],
  ["route reads semantic runs", /\.from\("activity_semantic_enrichment_runs_cux4"\)/.test(route)],
  ["route filters user", /\.eq\("user_id", appUser\.id\)/.test(route)],
  ["route filters actor", /\.eq\("acting_as_actor_id", personActor\.id\)/.test(route)],
  ["route filters planned role", /\.eq\("activity_role_code", "planned"\)/.test(route)],
  ["route uses active statuses", /ACTIVE_PLANNED_STATUSES/.test(route)],
  ["active draft status", /"draft", "planned", "confirmed"/.test(route)],
  ["route caps preview", /MAX_PREVIEW_LIMIT = 20/.test(route)],
  ["route default preview", /DEFAULT_PREVIEW_LIMIT = 12/.test(route)],
  ["route caps scan", /MAX_SCAN_LIMIT = 500/.test(route)],
  ["route default scan", /DEFAULT_SCAN_LIMIT = 300/.test(route)],
  ["route default due days", /DEFAULT_DUE_DAYS = 7/.test(route)],
  ["route caps due days", /MAX_DUE_DAYS = 31/.test(route)],
  ["unscheduled grouping", /item\.scheduleModeCode === "unscheduled"/.test(route)],
  ["deadline effective date", /scheduleModeCode === "deadline"/.test(route)],
  ["date only effective date", /scheduleModeCode === "date_only"/.test(route)],
  ["date range effective date", /scheduleModeCode === "date_range"/.test(route)],
  ["date range uses end", /row\.schedule_end_date/.test(route)],
  ["due starts now", /dueTimestamp >= now/.test(route)],
  ["due ends window", /dueTimestamp <= dueWindowEnd/.test(route)],
  ["exact excluded from due helper", !/scheduleModeCode === "exact"[\s\S]*return parseTimestamp/.test(route)],
  ["latest run map", /latestRunByActivityId/.test(route)],
  ["latest run first wins", /!latestRunByActivityId\.has\(activityEventId\)/.test(route)],
  ["clarification latest status", /asString\(latestRun\.status\) === "needs_clarification"/.test(route)],
  ["unscheduled newest first", /unscheduled\.sort/.test(route)],
  ["due ascending", /dueSoon\.sort/.test(route)],
  ["clarification newest first", /needsClarification\.sort/.test(route)],
  ["group total count", /totalCount: items\.length/.test(route)],
  ["group preview slice", /items: items\.slice\(0, limit\)/.test(route)],
  ["route returns all three groups", /unscheduled: buildGroup[\s\S]*dueSoon: buildGroup[\s\S]*needsClarification: buildGroup/.test(route)],
  ["route no POST", !/export async function POST/.test(route)],
  ["route no PATCH", !/export async function PATCH/.test(route)],
  ["route no DELETE", !/export async function DELETE/.test(route)],
  ["component client", /^"use client";/.test(component)],
  ["component exports shelf", /export function Cux6TaskShelf/.test(component)],
  ["component fetches shelf API", /\/api\/calendar\/task-shelf/.test(component)],
  ["component limit 20", /limit: "20"/.test(component)],
  ["component due days 7", /dueDays: "7"/.test(component)],
  ["component three group order", /"unscheduled",\s*"dueSoon",\s*"needsClarification"/.test(component)],
  ["component defaults collapsed", /unscheduled: false[\s\S]*dueSoon: false[\s\S]*needsClarification: false/.test(component)],
  ["component preview three", /group\.items\.slice\(0, 3\)/.test(component)],
  ["component can expand", /copy\.showAll/.test(component)],
  ["component can collapse", /copy\.collapse/.test(component)],
  ["component item details link", /buildDetailsHref/.test(component)],
  ["details uses activity id", /activityEventId: item\.id/.test(component)],
  ["details temporal future", /temporalDirection: "future"/.test(component)],
  ["details uses return target", /returnTo: returnToTarget/.test(component)],
  ["component formats deadline", /item\.scheduleModeCode === "deadline"/.test(component)],
  ["component formats date only", /item\.scheduleModeCode === "date_only"/.test(component)],
  ["component formats date range", /item\.scheduleModeCode === "date_range"/.test(component)],
  ["component formats exact if clarification", /item\.scheduleModeCode === "exact"/.test(component)],
  ["component English", /title: "Task shelf"/.test(component)],
  ["component Polish", /title: "Półka zadań"/.test(component)],
  ["component Russian", /title: "Полка задач"/.test(component)],
  ["component Ukrainian", /title: "Полиця завдань"/.test(component)],
  ["component German", /title: "Aufgabenablage"/.test(component)],
  ["component Spanish", /title: "Bandeja de tareas"/.test(component)],
  ["component Czech", /title: "Police úkolů"/.test(component)],
  ["component has no mutation fetch", !/method:\s*"(POST|PATCH|DELETE)"/.test(component)],
  ["client imports shelf", /import \{ Cux6TaskShelf \}/.test(client)],
  ["client renders shelf", /<Cux6TaskShelf/.test(client)],
  ["client passes locale", /locale=\{locale\}/.test(client)],
  ["client passes return target", /returnToTarget=\{returnToTarget\}/.test(client)],
  ["client passes refresh key", /refreshKey=\{eventsRefreshKey\}/.test(client)],
  ["shelf before calendar tabs", client.indexOf("<Cux6TaskShelf") < client.indexOf("{/* Step 9A calendar/log top tabs */}")],
  ["docs names three groups", /Без даты[\s\S]*Срок скоро[\s\S]*Нужно уточнение/.test(docs)],
  ["docs says direct activity_events", /не строится только по `calendar_events`/.test(docs)],
  ["docs forbids analysis start", /не запускают и не повторяют semantic analysis/.test(docs)],
  ["docs excludes CUX7", /не входят в CUX7/.test(docs)],
];

const failed = checks.filter(([, passed]) => !passed);

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

console.log(`CUX6 task shelf contract checks: ${checks.length - failed.length}/${checks.length}`);

if (failed.length > 0) {
  process.exitCode = 1;
}
