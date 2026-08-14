import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = path.resolve(process.argv[2] || process.cwd());
const require = createRequire(path.join(repo, "package.json"));
const ts = require("typescript");
const checks = [];

function check(name, condition, detail = "") {
  checks.push({ name, passed: Boolean(condition), detail: String(detail || "") });
}
function read(rel) {
  return fs.readFileSync(path.join(repo, rel), "utf8").replace(/\r\n?/gu, "\n");
}
function parseTsx(rel) {
  try {
    const source = read(rel);
    const file = ts.createSourceFile(rel, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    check(`TS_PARSE:${rel}`, file.parseDiagnostics.length === 0,
      file.parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " | ")).join(" | "));
  } catch (error) {
    check(`TS_PARSE:${rel}`, false, error instanceof Error ? error.message : String(error));
  }
}

const pagePath = "src/app/activity-ai-lab/page.tsx";
parseTsx(pagePath);
const page = read(pagePath);
const durable = read("src/lib/activity/aiLabQuickCaptureDurable.server.ts");

check(
  "REVIEW_TRACE_CONTROLS_NOT_GATED_BY_EDIT_MODE",
  page.includes("operationId={analysisOperationId || null}") && !page.includes("reviewEditing"),
);
check(
  "REVIEW_MANUAL_PICKER_ALWAYS_VISIBLE_AFTER_ANALYSIS",
  page.includes("fullAnalysisSucceeded &&\n            analysisOperationId ? (") && !page.includes("(!reviewActivityEventId || reviewEditing)"),
);
check("REVIEW_MANUAL_PICKER_RECEIVES_ACTIVITY_ID", page.includes("activityEventId={reviewActivityEventId}"));
check("MANUAL_PICKER_ACTIVITY_ID_PROP", page.includes("activityEventId = null,") && page.includes("activityEventId?: string | null;"));
check(
  "REVIEW_PLUS_MATERIALIZES_IMMEDIATELY",
  page.includes('fetch("/api/ai/reality/manual-link-materialize"') &&
    page.includes("feedbackEventIds: [feedbackEventId]") &&
    page.includes("activityEventId,\n          operationId,"),
);
check(
  "NORMAL_PLUS_STILL_DEFERRED_UNTIL_ACTIVITY_EXISTS",
  page.includes("if (activityEventId) {") && page.includes("activityEventId ? copy.immediateSaved : copy.deferredSaved"),
);
check(
  "FEEDBACK_CAN_BE_CORRECTED_IN_SAME_REVIEW",
  page.includes('const locked = state?.phase === "saving";') &&
    !page.includes('const locked = state?.phase === "saving" || state?.phase === "saved";'),
);
check("REVIEW_CONFIRM_BUTTON_PRESENT", page.includes('aria-label={copy.confirm}') && page.includes('>✓</button>'));
check("REVIEW_REJECT_BUTTON_PRESENT", page.includes('aria-label={copy.reject}') && page.includes('>✕</button>'));
check("REVIEW_PENCIL_PRESENT", page.includes('aria-label={copy.explain}') && page.includes('>✎</button>'));
check("REVIEW_WHY_PRESENT", page.includes('aria-label={copy.why}') && page.includes('>?</button>'));
check("REVIEW_PLUS_PRESENT", page.includes("copy.add"));
check("REVIEW_MULTISELECT_CONFIRM_REQUIRED", page.includes("pendingItems") && page.includes("confirmPendingLinks"));
check(
  "REVIEW_NOT_AUTO_RESOLVED",
  !page.includes('quickCaptureReviewStatus: "resolved"') && durable.includes('quickCaptureReviewStatus: "pending"'),
);
check(
  "DURABLE_HANDOFF_PRESERVED",
  durable.includes("raw_activity_signals") && durable.includes('processing_status: "pending"') && durable.includes('path: "/api/ai/reality/fact-materialize"'),
);

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
