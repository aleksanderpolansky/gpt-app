const fs = require("fs");

const files = {
  timing: "src/lib/activity/aiLabQuickCapture.ts",
  route: "src/app/api/activity/quick-capture/route.ts",
};

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const timing = read(files.timing);
const route = read(files.route);

const checks = [
  [
    "timing exposes internal no-anchor option for sequential reconstruction",
    timing.includes("anchorUnspecifiedPastToReportedAt?: boolean;"),
  ],
  [
    "default anchoring applies only to past activities",
    timing.includes('temporalDirection === "past" &&') &&
      timing.includes("input.anchorUnspecifiedPastToReportedAt !== false"),
  ],
  [
    "default anchoring requires no explicit temporal evidence",
    timing.includes("!explicitTemporalEvidence &&") &&
      timing.includes("!startedAt &&") &&
      timing.includes("!endedAt;"),
  ],
  [
    "message reportedAt is the point anchor",
    timing.includes("const messageAnchor = reportedAtInstant.toISOString();"),
  ],
  [
    "duration-only actual activity ends at message time",
    timing.includes("endedAt = messageAnchor;"),
  ],
  [
    "duration-only actual activity starts duration minutes before message time",
    timing.includes("reportedAtInstant.getTime() - durationMinutes * 60_000"),
  ],
  [
    "no-time/no-duration actual activity becomes point-in-time",
    timing.includes("startedAt = messageAnchor;") &&
      timing.includes("endedAt = messageAnchor;"),
  ],
  [
    "sequential reconstruction disables per-row automatic anchor",
    timing.includes("anchorUnspecifiedPastToReportedAt: false,"),
  ],
  [
    "sequential explicit temporal evidence includes source text",
    timing.includes("hasExplicitQuickCaptureTemporalEvidence(input.sourceTexts[index])"),
  ],
  [
    "sequential no-duration past row becomes point-in-time at cursor",
    timing.includes("const pointInTime = new Date(cursor.getTime());") &&
      timing.includes("startedAt: pointInTime.toISOString(),") &&
      timing.includes("endedAt: pointInTime.toISOString(),"),
  ],
  [
    "quick capture captures one request receipt timestamp",
    route.includes("const requestReportedAt = new Date().toISOString();"),
  ],
  [
    "durable receipt stores the same request timestamp",
    route.includes("reportedAt: requestReportedAt,"),
  ],
  [
    "retry/direct save reuses durable signal reportedAt",
    route.includes("text(asRecord(signal.raw_payload).reportedAt) || requestReportedAt"),
  ],
  [
    "snapshot resolver guard is not weakened by this patch",
    !timing.includes("SOURCE_SNAPSHOT_ACTIVITY_TIME_REQUIRED") &&
      !route.includes("SOURCE_SNAPSHOT_ACTIVITY_TIME_REQUIRED"),
  ],
];

let passed = 0;

for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`PASS ${label}`);
  }
}

if (process.exitCode) {
  console.error(`VALIDATOR=FAIL_${passed}_${checks.length}`);
  process.exit(process.exitCode);
}

console.log(`VALIDATOR=PASS_${passed}_${checks.length}`);
