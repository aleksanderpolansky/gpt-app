import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const calendar = read("src/app/calendar-rebuild/CalendarRebuildClient.tsx");
const composer = read("src/components/calendar/cux2-inline-activity-composer.tsx");
const timingEditor = read("src/components/activity/pp1/activity-timing-editor.tsx");

const checks = [
  ["01_component_exists", composer.includes("export function Cux2InlineActivityComposer")],
  ["02_calendar_imports_component", calendar.includes("Cux2InlineActivityComposer")],
  ["03_add_button_is_inline_toggle", calendar.includes("aria-controls=\"calendar-inline-composer\"") && calendar.includes("setComposerOpen")],
  ["04_no_primary_add_navigation", !calendar.includes("href={addFlowHref}")],
  ["05_component_rendered_above_tabs", calendar.indexOf("<Cux2InlineActivityComposer") < calendar.indexOf("Step 9A calendar/log top tabs")],
  ["06_semantic_preview_used", composer.includes("/api/calendar/activity-review/semantic-preview")],
  ["07_canonical_write_path_used", composer.includes("fetch(\"/api/activity/events\"")],
  ["08_cux1_timing_reused", composer.includes("inferActivityTimingDraftPp1") && composer.includes("mergeActivityTimingDraftPp1")],
  ["09_radio_cards_reused", composer.includes("ActivityTimingEditorPp1") && timingEditor.includes("type=\"radio\"")],
  ["10_planned_targets_available", composer.includes("PlannedTargetSelectorPp1")],
  ["11_activity_container_optional", composer.includes("/calendar/activity-review?")],
  ["12_voice_entry_point_present", composer.includes("copy.voiceSoon") && composer.includes("disabled title={copy.voiceSoon}")],
  ["13_rules_priority_visible", composer.includes("rulesPriority") && composer.includes("Explicit data in the current message")],
  ["14_unscheduled_projection_guard", composer.includes("createCalendarProjection: timingDraft.scheduleModeCode === \"exact\"")],
  ["15_refresh_callback_present", calendar.includes("setEventsRefreshKey((value) => value + 1)")],
  ["16_draft_persists_when_collapsed", composer.includes("if (!open)") && calendar.includes("open={composerOpen}")],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) failed += 1;
}

console.log(`RESULT ${checks.length - failed}/${checks.length}`);
if (failed > 0) process.exit(1);
