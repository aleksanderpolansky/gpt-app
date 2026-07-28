import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  events: "src/app/api/activity/events/route.ts",
  calendar: "src/app/calendar-rebuild/CalendarRebuildClient.tsx",
  page: "src/app/calendar/activity-review/page.tsx",
  saved: "src/app/calendar/activity-review/saved-activity-review-client.tsx",
  composer: "src/components/calendar/cux2-inline-activity-composer.tsx",
  server: "src/lib/calendar/activitySemanticEnrichment.server.ts",
  status: "src/app/api/calendar/activity-enrichment/[activityEventId]/route.ts",
  doc: "docs/CUX4_FAST_CAPTURE_REQUIRED_CONTAINER_RU_20260728.md",
};

const content = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => {
    const absolutePath = path.join(root, relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Missing required file: ${relativePath}`);
    }

    return [key, fs.readFileSync(absolutePath, "utf8")];
  }),
);

const checks = [];

function check(code, passed, details) {
  checks.push({ code, passed: Boolean(passed), details });
}

check("01_events_import_after", content.events.includes('import { after, NextResponse } from "next/server";'), "Next.js after() is used.");
check("02_events_keeps_pp1", content.events.includes("createActivityEventViaPp1Rpc"), "Canonical PP1 write remains.");
check("03_events_create_run", content.events.includes("createActivitySemanticEnrichmentRunCux4"), "Run is created after anchor.");
check("04_events_process_run", content.events.includes("processActivitySemanticEnrichmentRunCux4"), "Background processor is scheduled.");
check("05_events_after_callback", content.events.includes("after(async () =>"), "Processing is attached through after().");
check("06_events_flag_gate", content.events.includes("cux4Metadata.backgroundAnalysis === true"), "Only requested CUX4 captures start background analysis.");
check("07_events_planned_only", content.events.includes('activityRoleCode === "planned"'), "CUX4 background run is planned-activity scoped.");
check("08_events_response_run", content.events.includes("semanticEnrichment,"), "Response returns enrichment status.");
check("09_events_required_container", content.events.includes("requiredActivityContainer"), "Required container flag is retained.");
check("10_events_anchor_survives", content.events.includes("failed_to_start"), "Run start failure does not reject the anchor.");

check("11_server_create_rpc", content.server.includes("create_activity_semantic_enrichment_run_cux4_v1"), "Existing CUX4A1 create RPC is reused.");
check("12_server_claim_rpc", content.server.includes("claim_activity_semantic_enrichment_run_cux4_v1"), "Existing CUX4A1 claim RPC is reused.");
check("13_server_finish_rpc", content.server.includes("finish_activity_semantic_enrichment_run_cux4_v1"), "Existing CUX4A1 finish RPC is reused.");
check("14_server_existing_preview", content.server.includes("params.previewUrl"), "Existing semantic preview remains the parser.");
check("15_server_existing_rules", content.server.includes("readEffectiveCalendarAiRules"), "Existing personal rules remain in use.");
check("16_server_no_apply_rpc", !content.server.includes("apply_activity_semantic_enrichment"), "No automatic AI apply is added.");
check("17_server_processed", content.server.includes('"processed"'), "Processed status supported.");
check("18_server_clarification", content.server.includes('"needs_clarification"'), "Clarification status supported.");
check("19_server_failed", content.server.includes('"failed"'), "Failed status supported.");
check("20_server_no_unhandled", content.server.includes("must not create an unhandled background rejection"), "Background finish errors are contained.");

check("21_composer_no_debounce", !content.composer.includes("window.setTimeout"), "Automatic pre-save OpenAI debounce removed from quick path.");
check("22_composer_optional_preview", content.composer.includes('onClick={() => void analyzeText(text)}'), "Explicit preview button remains.");
check("23_composer_immediate_button", content.composer.includes('disabled={!text.trim() || saveStatus === "saving" || saveStatus === "saved"}'), "Add is not blocked by analysis or timing.");
check("24_composer_invalid_to_unscheduled", content.composer.includes('inferActivityTimingDraftPp1("", "future")'), "Incomplete timing falls back to an unscheduled anchor.");
check("25_composer_background_flag", content.composer.includes("backgroundAnalysis: true"), "Quick capture requests background analysis.");
check("26_composer_required_flag", content.composer.includes("requiredActivityContainer: true"), "Container remains mandatory.");
check("27_composer_protected_fields", content.composer.includes("protectedFieldCodes"), "Manual fields are snapshotted as protected.");
check("28_composer_returns_id", content.composer.includes("activityEventId: payload.activityEvent.id"), "Saved ID is returned to parent.");
check("29_composer_collapses", content.composer.includes("onClose();"), "Composer collapses after save.");
check("30_composer_no_draft_details", !content.composer.includes("detailedAnalysisHref"), "Details no longer forces the pre-save waiting route.");

check("31_calendar_notice_state", content.calendar.includes("lastQuickCapture"), "Calendar stores compact success state.");
check("32_calendar_notice_copy", content.calendar.includes("CUX4_CAPTURE_NOTICE_UI"), "Success notice is localized.");
check("33_calendar_details_id", content.calendar.includes("activityEventId: lastQuickCapture.activityEventId"), "Details opens by saved activity ID.");
check("34_calendar_notice_dismiss", content.calendar.includes("setLastQuickCapture(null)"), "Success notice can be dismissed.");

check("35_page_saved_branch", content.page.includes("SavedActivityReviewClient"), "Activity-review route supports saved container mode.");
check("36_page_activity_id", content.page.includes("resolved.activityEventId"), "Saved mode is selected by activityEventId.");

check("37_status_auth", content.status.includes("getActivityUserContext"), "Status endpoint requires user context.");
check("38_status_owner_user", content.status.includes('.eq("user_id", appUser.id)'), "Activity ownership filters user.");
check("39_status_owner_actor", content.status.includes('.eq("acting_as_actor_id", personActor.id)'), "Activity ownership filters actor.");
check("40_status_run_owner", content.status.includes('.eq("owner_actor_id", personActor.id)'), "Run ownership filters actor.");
check("41_status_no_store", content.status.includes('response.headers.set("Cache-Control", "no-store")'), "Status response is not cached.");

check("42_saved_poll", content.saved.includes("timer = setTimeout(load, 1500)"), "Container polls while analysis runs.");
check("43_saved_pending", content.saved.includes('status === "pending" || status === "processing"'), "Pending/processing status is visible.");
check("44_saved_fields", content.saved.includes("fields.map((field, index)"), "Semantic fields are rendered.");
check("45_saved_warnings", content.saved.includes("warnings.map((warning)"), "Warnings are rendered.");
check("46_saved_failure_preserves", content.saved.includes("The activity remains saved") || content.saved.includes("Активность остаётся сохранённой"), "Failure copy preserves the activity.");
check("47_saved_no_add", !content.saved.includes("createActivityEventViaPp1Rpc") && !content.saved.includes('fetch("/api/activity/events"'), "Saved container cannot create a duplicate activity.");

check("48_doc_mandatory", content.doc.includes("The Activity Container is mandatory"), "Documentation locks mandatory container.");
check("49_doc_no_ai_redesign", content.doc.includes("does not redesign"), "Documentation excludes AI-rule redesign.");
check("50_doc_no_migration", content.doc.includes("No migration is included"), "Documentation confirms no schema change.");

const passed = checks.filter((item) => item.passed).length;
const total = checks.length;

for (const item of checks) {
  console.log(
    `${item.passed ? "PASS" : "FAIL"} ${item.code}: ${item.details}`,
  );
}

console.log(`CUX4 UI contract checks: ${passed}/${total}`);

if (passed !== total) {
  process.exitCode = 1;
}
