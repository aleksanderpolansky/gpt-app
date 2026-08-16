import fs from "node:fs";

const checks = [];
function check(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
}

const compilerPath = "src/lib/ai/runtimeContextCompiler.server.ts";
const pilotPath = "lib/reality/globalObservationPilot.ts";
const contextManifestPath = "lib/ai/contextManifest.ts";
const processingPath = "src/lib/ai/processingInstructions.server.ts";
const sqlPath = "supabase/manual-applied/20260812_ai_a1_context_manifest_foundation_v1.sql";

for (const file of [compilerPath, pilotPath, contextManifestPath, processingPath, sqlPath]) {
  check(`FILE_EXISTS:${file}`, fs.existsSync(file));
}

if (checks.some((item) => !item.passed)) {
  console.log(JSON.stringify({ check: "AI_A1_RUNTIME_CONTEXT_COMPILER_V1", passed: false, checks }, null, 2));
  process.exit(1);
}

const compiler = fs.readFileSync(compilerPath, "utf8");
const pilot = fs.readFileSync(pilotPath, "utf8");
const contextManifest = fs.readFileSync(contextManifestPath, "utf8");
const processing = fs.readFileSync(processingPath, "utf8");
const sql = fs.readFileSync(sqlPath, "utf8");

check("COMPILER_VERSION", compiler.includes('ARCTOR_RUNTIME_CONTEXT_PACK_V1'));
check("COMPILER_SERVER_INSTRUCTION_SOURCE", compiler.includes("readSystemInstructionResolution") && compiler.includes("AI_PROCESSING_INSTRUCTION_DEFINITIONS"));
check("COMPILER_IMMUTABLE_GUARD", compiler.includes("immutableGuardForRuntime(input.runtimeCode)"));
check("COMPILER_ACTOR_INSTRUCTION_SOURCE", compiler.includes("readActorProcessingResolution"));
check("ACTOR_GUIDANCE_UNTRUSTED", compiler.includes('trust: "untrusted_user_guidance"'));
check("ACTOR_GUIDANCE_NOT_SYSTEM_PROMPT", !compiler.includes("actorInstruction.text,\n    `[embedded:"));
check("SYSTEM_PROMPT_INCLUDES_DB_AND_EMBEDDED", compiler.includes("...systemInstructions.map") && compiler.includes("embeddedSystemPrompt"));
check("RUNTIME_ENVELOPE_IN_PROVIDER_PAYLOAD", compiler.includes("__arctorRuntimeContext") && compiler.includes("actorGuidance"));
check("DATA_USE_SERVICE_ONLY", compiler.includes('purposeCodes: ["service_delivery"]') && compiler.includes("trainingAllowed: false") && compiler.includes("researchAllowed: false") && compiler.includes("exportAllowed: false"));
check("NO_PRETEND_AI_A4_RIGHTS", compiler.includes('source: "runtime_default_until_ai_a4"'));
check("CONTEXT_BOUNDS", compiler.includes("MAX_SYSTEM_PROMPT_CHARS") && compiler.includes("MAX_REQUEST_PAYLOAD_BYTES") && compiler.includes("MAX_RETRIEVAL_SNAPSHOT_BYTES") && compiler.includes("MAX_CANDIDATES_PER_ARRAY = 20"));
check("CANDIDATE_ARRAY_BOUND_ENFORCED", compiler.includes("RUNTIME_CONTEXT_CANDIDATE_ARRAY_TOO_LARGE"));
check("TIMEZONE_VALIDATED", compiler.includes("RUNTIME_CONTEXT_TIME_ZONE_INVALID") && compiler.includes("Intl.DateTimeFormat"));
check("HASH_PROTOCOL", compiler.includes("const protocolHash = hashCanonicalJson"));
check("HASH_SCHEMA", compiler.includes("const schemaHash = hashCanonicalJson(input.schema)"));
check("HASH_SYSTEM_PROMPT", compiler.includes("const systemPromptHash = sha256Text(systemPrompt)"));
check("HASH_REQUEST_PAYLOAD", compiler.includes("const requestPayloadHash = hashCanonicalJson(requestPayload)"));
check("HASH_RETRIEVAL", compiler.includes("const retrievalSnapshotHash = hashCanonicalJson(retrievalSnapshot)"));
check("HASH_TOOLS", compiler.includes("const toolPermissionsHash = hashCanonicalJson(toolPermissions)"));
check("HASH_INSTRUCTIONS", compiler.includes("const instructionRefsHash = hashCanonicalJson(instructionRefs)"));
check("HASH_ACTOR_BINDING", compiler.includes("const actorBindingHash = hashCanonicalJson({ appUserId, actorId })"));
check("HASH_CONTEXT_PACK", compiler.includes("const contextPackHash = hashCanonicalJson"));
check("NO_RAW_PROVIDER_STATE", compiler.includes("storeProviderState") && !compiler.includes("providerStateText"));
check("MANIFEST_FOUNDATION_REUSED", contextManifest.includes('from("ai_context_manifests")') && sql.includes("create table if not exists public.ai_context_manifests"));
check("NO_PARALLEL_MANIFEST_TABLE", !compiler.includes("create table") && !compiler.includes("ai_runtime_context_manifests"));
check("PILOT_IMPORTS_COMPILER", pilot.includes('from "../../src/lib/ai/runtimeContextCompiler.server"'));
check("PILOT_COMPILES_BEFORE_BUDGET", pilot.indexOf("const compiledContext = await compileRuntimeContextPackV1") >= 0 && pilot.indexOf("const compiledContext = await compileRuntimeContextPackV1") < pilot.indexOf("const estimatedInputTokens = estimateInputTokensUpperBound"));
check("BUDGET_USES_COMPILED_PROMPT", pilot.includes("system: compiledContext.systemPrompt") && pilot.includes("user: compiledContext.requestPayload"));
check("MANIFEST_USES_COMPILED_PROMPT", pilot.includes("systemPrompt: compiledContext.systemPrompt") && pilot.includes("requestPayload: compiledContext.requestPayload"));
check("MANIFEST_USES_COMPILED_REFS", pilot.includes("instructionRefs: compiledContext.instructionRefs") && pilot.includes("retrievalSnapshot: compiledContext.retrievalSnapshot") && pilot.includes("toolPermissions: compiledContext.toolPermissions"));
check("MANIFEST_USES_CONTEXT_PACK_METADATA", pilot.includes("contextMetadata: compiledContext.contextMetadata"));
check("PROVIDER_USES_EXACT_COMPILED_CONTEXT", pilot.includes("system: compiledContext.systemPrompt") && pilot.includes("user: compiledContext.requestPayload"));
check("PILOT_ACTOR_BOUND", (pilot.match(/actorId: request\.actorId/g) ?? []).length >= 2);
check("PILOT_TIMEZONE_BOUND", (pilot.match(/timeZone,/g) ?? []).length >= 2);
check("PILOT_OPERATIONAL_LAYER_MARKED", !pilot.includes("operationalInstructionLayerApplied: false") && pilot.includes("operationalInstructionLayerApplied: true"));
check("OLD_A1_RAW_INPUT_RULE_PRESERVED", contextManifest.includes("input_hash: sha256Text(input.inputText)") && !contextManifest.includes("raw_message_text:"));
check("PROCESSING_RUNTIME_HAS_ACTIVITY", processing.includes('"activity_semantic_preview"'));

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({
  check: "AI_A1_RUNTIME_CONTEXT_COMPILER_V1",
  passed: failed.length === 0,
  total: checks.length,
  failed,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
