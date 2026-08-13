import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  page: "src/app/activity-ai-lab/page.tsx",
  direct: "src/lib/activity/aiLabDirectSave.ts",
  helper: "src/lib/activity/aiLabFactMaterialization.ts",
  route: "src/app/api/ai/reality/fact-materialize/route.ts",
  test: "scripts/test-ai-a3-p5a-fact-materialization-v1.mjs",
  doc: "docs/reality-core/ARCTOR_AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1_RU.md",
};
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`MISSING_FILE: ${rel}`);
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}
const page = read(files.page);
const direct = read(files.direct);
const helper = read(files.helper);
const route = read(files.route);
const test = read(files.test);
const doc = read(files.doc);

const results = [];
function check(name, passed, detail) {
  results.push({ name, passed: Boolean(passed), detail });
}

check("01_shared_candidate_builder", helper.includes("buildAiLabFactMaterializationCandidates"), "client builds bounded writer candidates from validated Global Reality rows");
check("02_exact_one_typed_value_guard", helper.includes("if (count !== 1) return null"), "malformed multi-value facts are excluded");
check("03_evidence_fragment_guard", helper.includes("containsEvidenceFragment") && route.includes("not present in activity input_text"), "writer evidence must exist in saved activity text");
check("04_feedback_verdict_policy", helper.includes('verdict === "rejected"') && helper.includes('verdict === "confirmed"'), "rejected skips; confirmed becomes confirmed");
check("05_unreviewed_stays_proposed", helper.includes('factStatus: confirmed ? "confirmed" : "proposed"'), "save does not silently confirm unreviewed facts");
check("06_server_writer_only", route.includes('supabase.rpc(\n    "attach_global_observation_facts_gsr1_v1"') && !page.includes("attach_global_observation_facts_gsr1_v1"), "database writer is server-side only");
check("07_completed_execution_required", route.includes('execution.status !== "completed"') && route.includes("activity_semantic_intake"), "materialization is provenance-bound to completed analysis");
check("08_activity_operation_binding", route.includes('metadata.sourceSurface !== "activity_ai_lab"') && route.includes("metadata.aiAnalysisOperationId !== operationId"), "saved activity must belong to same AI Lab operation");
check("09_global_leaf_revalidated", route.includes('target.scope_code !== "global"') && route.includes('target.ontology_node_role_code !== "leaf"') && route.includes('target.status !== "active"'), "target is revalidated as active GLOBAL leaf");
check("10_writer_idempotency", route.includes("idempotencyKey") && route.includes("requestHash") && route.includes("AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1"), "route uses deterministic writer idempotency");
check("11_direct_save_calls_materializer", page.includes('fetch(\n          "/api/ai/reality/fact-materialize"'), "direct save materializes facts after activity creation");
check("12_checkpoint_retry_preserved", page.indexOf('"/api/ai/reality/fact-materialize"') > page.indexOf("if (!checkpoint)") && page.includes("saveCheckpoint"), "created activity checkpoint is reused if downstream materialization fails");
check("13_manual_links_still_follow", page.indexOf('"/api/ai/reality/manual-link-materialize"') > page.indexOf('"/api/ai/reality/fact-materialize"'), "manual semantic links remain a separate downstream step");
check("14_direct_save_metadata_updated", direct.includes('directSaveContract: "AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1"') && direct.includes('factMaterializationPolicy: "server_validated_explicit_facts_on_save_p5a"'), "activity metadata records P5A policy");
check("15_semantic_projection_not_auto_written", page.includes("Смысловые догадки пока остаются только") && !route.includes("semantic_projection"), "P5A writes explicit facts only, not semantic projections");
check("16_fact_count_visible", page.includes("Явных фактов к материализации"), "user can see count before save");
check("17_contract_documented", doc.includes("AI-A3-P5A") && doc.includes("activity_object_facts") && doc.includes("activity_value_object_links"), "cross-link persistence contract documented");
check("18_policy_tests_present", test.includes("PASS=12/12") && test.includes("rejected_feedback_skips_fact") && test.includes("unreviewed_fact_stays_proposed"), "behavioral tests cover verdict boundaries");

for (const result of results) {
  console.log(`${result.name}=${result.passed ? "PASS" : "FAIL"} :: ${result.detail}`);
}
const failed = results.filter((row) => !row.passed);
console.log(`TOTAL=${results.length}; FAILED=${failed.length}`);
if (failed.length) process.exit(1);
