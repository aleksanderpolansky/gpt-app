import fs from "node:fs";

const checks = [];
function check(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
}

function callBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const end = source.indexOf("\n    });", start);
  if (end < 0) return "";
  return source.slice(start, end + "\n    });".length);
}

const localizationPath = "src/lib/localization/contentLocalization.server.ts";
const compilerPath = "src/lib/ai/runtimeContextCompiler.server.ts";
const processingPath = "src/lib/ai/processingInstructions.server.ts";
const diagnosticPath = "supabase/diagnostics/20260816_ai_a1_1_localization_execution_boundary_postcheck_READONLY.sql";

for (const file of [localizationPath, compilerPath, processingPath, diagnosticPath]) {
  check(`FILE_EXISTS:${file}`, fs.existsSync(file));
}

if (checks.some((item) => !item.passed)) {
  console.log(JSON.stringify({
    check: "ARCTOR_AI_A1_1_LOCALIZATION_EXECUTION_BOUNDARY_V1",
    passed: false,
    checks,
  }, null, 2));
  process.exit(1);
}

function readNormalized(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
}

const localization = readNormalized(localizationPath);
const compiler = readNormalized(compilerPath);
const processing = readNormalized(processingPath);
const diagnostic = readNormalized(diagnosticPath);
const gateway = readNormalized("src/lib/ai-billing/gateway.server.ts");
const usageCall = callBlock(
  localization,
  "const response = await runBillableAiJson<TranslationOutput>({",
);

check(
  "LOCALIZATION_HAS_OWN_EXECUTION",
  localization.includes('surfaceCode: "content_localization"') &&
    localization.includes('operationKind: "content_localization"') &&
    localization.includes("const localizationExecutionId = await createAiAnalysisExecution"),
);
check(
  "PARENT_SEMANTIC_EXECUTION_IS_LINEAGE_ONLY",
  localization.includes("parentSemanticExecutionId: input.analysisExecutionId ?? null") &&
    usageCall.includes("analysisExecutionId: localizationExecutionId") &&
    usageCall.includes("parentSemanticExecutionId: input.analysisExecutionId ?? null") &&
    !usageCall.includes("analysisExecutionId: input.analysisExecutionId"),
);
check(
  "LOCALIZATION_USAGE_LINKS_OWN_EXECUTION",
  usageCall.includes("analysisExecutionId: localizationExecutionId") &&
    usageCall.includes('operationKind: "content_localization"') &&
    gateway.includes("analysis_execution_id: analysisExecutionId"),
);
check(
  "LOCALIZATION_CONTEXT_COMPILER_USED",
  localization.includes("const compiledContext = await compileRuntimeContextPackV1") &&
    localization.includes('runtimeCode: "content_localization"'),
);
check(
  "COMPILED_CONTEXT_PRECEDES_BUDGET",
  localization.indexOf("const compiledContext = await compileRuntimeContextPackV1") >= 0 &&
    localization.indexOf("const compiledContext = await compileRuntimeContextPackV1") <
      localization.indexOf("const response = await runBillableAiJson<TranslationOutput>"),
);
check(
  "GATEWAY_USES_COMPILED_CONTEXT",
  localization.includes("system: compiledContext.systemPrompt") &&
    localization.includes("user: compiledContext.requestPayload"),
);
check(
  "MANIFEST_LINKS_USAGE_AND_EXECUTION",
  localization.includes("contextManifestId = await createAiContextManifest") &&
    localization.includes("analysisExecutionId: localizationExecutionId") &&
    localization.includes("aiUsageEventId: null") &&
    usageCall.includes("contextManifestId") &&
    gateway.includes("ai_usage_event_id: input.usageEventId"),
);
check(
  "MANIFEST_USES_EXACT_COMPILED_CONTEXT",
  localization.includes("systemPrompt: compiledContext.systemPrompt") &&
    localization.includes("requestPayload: compiledContext.requestPayload") &&
    localization.includes("instructionRefs: compiledContext.instructionRefs") &&
    localization.includes("retrievalSnapshot: compiledContext.retrievalSnapshot"),
);
check(
  "PROVIDER_USES_EXACT_COMPILED_CONTEXT",
  localization.includes("system: compiledContext.systemPrompt") &&
    localization.includes("user: compiledContext.requestPayload") &&
    localization.includes("store: false") &&
    localization.includes("maxRetries: 0"),
);
check(
  "GATEWAY_SETTLES_BEFORE_OUTPUT_VALIDATION",
  localization.indexOf("const response = await runBillableAiJson<TranslationOutput>") >= 0 &&
    localization.indexOf("const response = await runBillableAiJson<TranslationOutput>") <
      localization.indexOf("await markAiContextManifestProviderCompleted(") &&
    localization.indexOf("await markAiContextManifestProviderCompleted(") <
      localization.indexOf("const outputItems = Array.isArray(response.parsed?.items)"),
);
check(
  "MANIFEST_PROVIDER_AND_VALIDATOR_LIFECYCLE",
  localization.includes("markAiContextManifestProviderCompleted") &&
    localization.includes("markAiContextManifestValidated") &&
    localization.includes('validator: "sanitizeTranslatedItem"') &&
    localization.includes("markAiContextManifestFailed"),
);
check(
  "EXECUTION_SUCCESS_AND_FAILURE_LIFECYCLE",
  localization.includes("completeAiAnalysisExecution(localizationExecutionId)") &&
    localization.includes("failAiAnalysisExecution(localizationExecutionId, error)"),
);
check(
  "GATEWAY_OWNS_USAGE_SETTLEMENT",
  localization.includes("runBillableAiJson<TranslationOutput>") &&
    !localization.includes("CONTENT_LOCALIZATION_USAGE_FINALIZE_FAILED") &&
    !localization.includes("preflight_ai_pilot_call_budget_v1") &&
    !localization.includes('from("ai_usage_events")'),
);
check(
  "LOCALIZATION_INPUT_HASH_IS_STRING",
  localization.includes('}) ?? "{}";') &&
    localization.includes("inputText: localizationInputText"),
);
check(
  "LOCALIZATION_RETRIEVAL_SNAPSHOT_IS_REFERENCE_ONLY",
  localization.includes("sourceItemKeys: items.map((item) => item.key)") &&
    localization.includes("fieldCodesByItem: items.map") &&
    !localization.includes("retrievalSnapshot: {\n        items,"),
);
check(
  "ACTOR_ID_BOUND_TO_LOCALIZATION",
  localization.includes("actorId: input.actorId") &&
    localization.includes("generateLocalizedContentBatch({"),
);
check(
  "CONTENT_LOCALIZATION_RUNTIME_REGISTERED",
  processing.includes('  | "content_localization"\n') &&
    processing.includes("CONTENT_LOCALIZATION_IMMUTABLE_GUARD") &&
    processing.includes('case "content_localization":') &&
    processing.includes("content_localization: []"),
);
check(
  "ACTOR_GUIDANCE_POLICY_EXPLICIT",
  processing.includes("isActorGuidanceAllowedForRuntime") &&
    compiler.includes("isActorGuidanceAllowedForRuntime") &&
    compiler.includes("actorInstructionPolicy"),
);
check(
  "ACTOR_GUIDANCE_DISABLED_FOR_LOCALIZATION",
  processing.includes('return runtimeCode !== "content_localization";') &&
    compiler.includes("isActorGuidanceAllowedForRuntime(input.runtimeCode)") &&
    compiler.includes('source: "none" as const'),
);
check(
  "DIAGNOSTIC_IS_READ_ONLY_AND_EXACT",
  diagnostic.includes("ARCTOR_AI_A1_1_EXECUTION_BOUNDARY_POSTCHECK_V1") &&
    diagnostic.includes("semanticHasExactlyTwoManifests") &&
    diagnostic.includes("semanticHasTwoUsageEvents") &&
    diagnostic.includes("semanticManifestUsageLinksExact") &&
    diagnostic.includes("localizationHasExactlyOneManifest") &&
    diagnostic.includes("localizationHasOneUsageEvent") &&
    diagnostic.includes("localizationManifestUsageLinkExact") &&
    diagnostic.includes("localizationActorPolicyDisabled") &&
    !/\b(insert|update|delete|alter|drop|create\s+table|truncate)\b/i.test(
      diagnostic.replace(/--.*$/gm, ""),
    ),
);

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({
  check: "ARCTOR_AI_A1_1_LOCALIZATION_EXECUTION_BOUNDARY_V1",
  passed: failed.length === 0,
  total: checks.length,
  failed,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
