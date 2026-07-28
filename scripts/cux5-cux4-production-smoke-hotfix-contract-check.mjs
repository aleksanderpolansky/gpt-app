import fs from "node:fs";

const files = {
  selector: fs.readFileSync(
    "src/components/activity/pp1/planned-target-selector.tsx",
    "utf8",
  ),
  timing: fs.readFileSync(
    "src/lib/activity/pp1/activityTiming.ts",
    "utf8",
  ),
  editor: fs.readFileSync(
    "src/components/activity/pp1/activity-timing-editor.tsx",
    "utf8",
  ),
  composer: fs.readFileSync(
    "src/components/calendar/cux2-inline-activity-composer.tsx",
    "utf8",
  ),
  events: fs.readFileSync(
    "src/app/api/activity/events/route.ts",
    "utf8",
  ),
  enrichment: fs.readFileSync(
    "src/lib/calendar/activitySemanticEnrichment.server.ts",
    "utf8",
  ),
  details: fs.readFileSync(
    "src/app/api/calendar/activity-enrichment/[activityEventId]/route.ts",
    "utf8",
  ),
};

const checks = [
  ["search is full-width row", files.selector.includes('<div className="mt-4">')],
  ["search input binds query", files.selector.includes("value={query}")],
  ["search input updates query", files.selector.includes("setQuery(event.target.value)")],
  ["search placeholder exists", files.selector.includes("placeholder={copy.searchPlaceholder}")],
  ["search aria label exists", files.selector.includes("aria-label={copy.searchPlaceholder}")],
  ["old clipped three-column grid removed", !files.selector.includes("lg:grid-cols-[minmax(0,1fr)_220px_190px]")],
  ["filters follow search", files.selector.includes('className="mt-3 grid gap-3 sm:grid-cols-2"')],
  ["branch filter preserved", files.selector.includes("value={branchFilter}")],
  ["level filter preserved", files.selector.includes("value={levelFilter}")],
  ["query reaches selector endpoint", files.selector.includes("q: debouncedQuery")],
  ["existing selector endpoint preserved", files.selector.includes("/api/value-objects/selector?")],
  ["parent search remains separate", files.selector.includes("value={parentQuery}")],

  ["default constant is 15", files.timing.includes("DEFAULT_EXACT_DURATION_MINUTES_PP1 = 15")],
  ["default helper exported", files.timing.includes("export function applyExactStartOnlyDefaultPp1")],
  ["default only exact", files.timing.includes('draft.scheduleModeCode !== "exact"')],
  ["default requires start", files.timing.includes("!draft.startedAtLocal.trim()")],
  ["explicit end protected", files.timing.includes("draft.endedAtLocal.trim()")],
  ["explicit duration protected", files.timing.includes("draft.durationMinutes.trim()")],
  ["default sets end", files.timing.includes("endedAtLocal," )],
  ["default sets duration string", files.timing.includes("durationMinutes: String(DEFAULT_EXACT_DURATION_MINUTES_PP1)")],
  ["merge applies default", files.timing.includes("return applyExactStartOnlyDefaultPp1(next)")],
  ["inference applies default", (files.timing.match(/return applyExactStartOnlyDefaultPp1\(draft\)/g) ?? []).length >= 2],
  ["validation uses effective draft", files.timing.includes("const effectiveDraft =")],
  ["past timing is not defaulted", files.timing.includes('temporalDirection === "future"')],

  ["editor imports default", files.editor.includes("DEFAULT_EXACT_DURATION_MINUTES_PP1")],
  ["editor start applies default", files.editor.includes('draft.scheduleModeCode === "exact"')],
  ["editor writes default duration", files.editor.includes("next.durationMinutes = String(")],
  ["editor writes default end", files.editor.includes("next.endedAtLocal = addMinutesToLocal(")],

  ["composer imports helper", files.composer.includes("applyExactStartOnlyDefaultPp1")],
  ["composer computes effective draft", files.composer.includes("const effectiveTimingDraft = useMemo(")],
  ["composer validates effective draft", files.composer.includes("validateActivityTimingDraftPp1(effectiveTimingDraft")],
  ["composer formats effective draft", files.composer.includes("formatActivityTimingDraftPp1(")],
  ["composer saves effective draft", files.composer.includes("? effectiveTimingDraft")],
  ["canonical POST preserved", files.composer.includes('fetch("/api/activity/events"')],
  ["one projection flag preserved", files.composer.includes("createCalendarProjection:")],
  ["target ids preserved", files.composer.includes("plannedTargetValueObjectIds: plannedTargetIds")],

  ["API default constant is 15", files.events.includes("DEFAULT_EXACT_DURATION_MINUTES = 15")],
  ["API detects exact start-only", files.events.includes("exactStartOnlyDefaultApplied")],
  ["API requires planned exact", files.events.includes('plannedScheduleModeCode === "exact"')],
  ["API requires start", files.events.includes("requestedStartedAt !== null")],
  ["API requires missing end", files.events.includes("requestedEndedAt === null")],
  ["API requires missing duration", files.events.includes("requestedDurationMinutes === null")],
  ["API defaults duration", files.events.includes("? DEFAULT_EXACT_DURATION_MINUTES")],
  ["API derives end", files.events.includes("addMinutesToIso(")],
  ["API uses resolved end", files.events.includes("endedAt: resolvedEndedAt")],
  ["explicit actual timing preserved", files.events.includes("endedAt: requestedEndedAt")],

  ["claim helper imported", files.events.includes("claimActivitySemanticEnrichmentRunCux4")],
  ["run created before claim", files.events.indexOf("createActivitySemanticEnrichmentRunCux4({") < files.events.indexOf("claimActivitySemanticEnrichmentRunCux4({")],
  ["run claimed in Add request", files.events.includes("const claim = await claimActivitySemanticEnrichmentRunCux4({")],
  ["response status uses claim", files.events.includes("status: claim.status")],
  ["after only follows claim", files.events.includes("if (claim.claimed) {")],
  ["after still used", files.events.includes("after(async () => {")],
  ["worker marked preclaimed", files.events.includes("alreadyClaimed: true")],

  ["claim RPC renamed internally", files.enrichment.includes("claimActivitySemanticEnrichmentRunRpcCux4")],
  ["claim wrapper exported", files.enrichment.includes("export async function claimActivitySemanticEnrichmentRunCux4")],
  ["claim status normalized", files.enrichment.includes("status: normalizeRunStatus(claim.run?.status)")],
  ["processor supports preclaim", files.enrichment.includes("alreadyClaimed?: boolean")],
  ["processor skips duplicate claim", files.enrichment.includes("if (params.alreadyClaimed !== true)")],
  ["processor still finishes processed", files.enrichment.includes('finalStatus,')],
  ["processor still finishes failed", files.enrichment.includes('finalStatus: "failed"')],

  ["Details route remains GET", files.details.includes("export async function GET(")],
  ["Details route has no POST", !files.details.includes("export async function POST(")],
  ["Details route has no claim RPC", !files.details.includes("claim_activity_semantic_enrichment_run_cux4_v1")],
  ["Details route has no processor", !files.details.includes("processActivitySemanticEnrichmentRunCux4")],
];

const failed = checks.filter(([, passed]) => !passed);

for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}

console.log(
  `CUX5/CUX4 smoke hotfix contract checks: ${checks.length - failed.length}/${checks.length}`,
);

if (failed.length > 0) {
  process.exitCode = 1;
}
