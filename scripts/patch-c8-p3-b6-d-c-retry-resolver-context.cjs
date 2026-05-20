const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const rootDir = process.cwd();
const targetPath = path.join(rootDir, "lib", "activity", "categoryDerivation", "resolver.ts");
const resultPath = path.join(
  rootDir,
  "docs",
  "value-objects",
  "category-derivation-resolver-c8-p3-b6-d-c-retry-result.json",
);

function fail(message) {
  throw new Error(message);
}

function findFunctionRange(source, name) {
  const marker = `function ${name}`;
  const markerIndex = source.indexOf(marker);

  if (markerIndex < 0) {
    fail(`Function marker not found: ${marker}`);
  }

  const braceStart = source.indexOf("{", markerIndex);

  if (braceStart < 0) {
    fail(`Opening brace not found for function: ${name}`);
  }

  let depth = 0;

  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return {
          start: markerIndex,
          bodyStart: braceStart,
          end: index + 1,
        };
      }
    }
  }

  fail(`Closing brace not found for function: ${name}`);
}

function replaceSlice(source, start, end, replacement) {
  return source.slice(0, start) + replacement + source.slice(end);
}

function findCallRange(source, startSearch, callStartText) {
  const callStart = source.indexOf(callStartText, startSearch);

  if (callStart < 0) {
    fail(`Call not found: ${callStartText}`);
  }

  const parenStart = source.indexOf("(", callStart);

  if (parenStart < 0) {
    fail(`Opening parenthesis not found for call: ${callStartText}`);
  }

  let depth = 0;

  for (let index = parenStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;

      if (depth === 0) {
        let end = index + 1;

        while (end < source.length && /\s/.test(source[end])) {
          end += 1;
        }

        if (source[end] === ";") {
          end += 1;
        }

        return {
          start: callStart,
          end,
          text: source.slice(callStart, end),
        };
      }
    }
  }

  fail(`Closing parenthesis not found for call: ${callStartText}`);
}

function validateSource(source) {
  const diagnostics = ts.transpileModule(source, {
    fileName: targetPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
    },
    reportDiagnostics: true,
  }).diagnostics || [];

  const requiredPatterns = [
    "import type {",
    "DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE = \"personal_activity\"",
    "function findDefaultCategoryDerivationContextId",
    ".from<ContextRow>(\"contexts\")",
    ".eq(\"code\", DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE)",
    ".eq(\"is_active\", true)",
    "function normalizeContextualCategorySourceType",
    "contextId?: string | null",
    ".eq(\"context_id\", contextId)",
    "context_id: contextId",
    "normalizeContextualCategorySourceType(options.sourceType)",
    "const defaultContextResult =",
    "const defaultContextId = defaultContextResult.contextId",
    "missingContextCode: DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE",
    "Cannot create contextual category without default context",
    "defaultContextId,",
  ];

  const forbiddenPatterns = [
    "context_id: contextId,tegoryCandidate",
    ");import type",
    "    if (!defaultContextId) {\n      unresolvedCount += 1;\n",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));
  const forbiddenFound = forbiddenPatterns.filter((pattern) => source.includes(pattern));
  const failedChecks = [];

  if (!source.trimStart().startsWith("import type {")) {
    failedChecks.push("resolver.ts does not start with import type");
  }

  const createRange = findFunctionRange(source, "createContextualCategory");
  const createBlock = source.slice(createRange.start, createRange.end);

  if (!createBlock.includes("contextId: string")) {
    failedChecks.push("createContextualCategory signature does not accept contextId");
  }

  const payloadMatch = /const payload\s*(?::\s*Record<string,\s*unknown>)?\s*=\s*\{/.exec(createBlock);

  if (!payloadMatch) {
    failedChecks.push("could not locate payload block inside createContextualCategory");
  } else {
    const payloadBlock = createBlock.slice(payloadMatch.index, createBlock.indexOf("};", payloadMatch.index));

    if (!payloadBlock.includes("context_id: contextId")) {
      failedChecks.push("payload block does not contain context_id: contextId");
    }

    if (!payloadBlock.includes("source_type: normalizeContextualCategorySourceType(options.sourceType)")) {
      failedChecks.push("payload block does not normalize source_type");
    }
  }

  const findExistingRange = findFunctionRange(source, "findExistingCategory");
  const findExistingBlock = source.slice(findExistingRange.start, findExistingRange.end);

  if (!findExistingBlock.includes("contextId?: string | null")) {
    failedChecks.push("findExistingCategory signature does not accept contextId");
  }

  if (!findExistingBlock.includes(".eq(\"context_id\", contextId)")) {
    failedChecks.push("findExistingCategory does not filter by context_id");
  }

  const resolveRange = findFunctionRange(source, "resolveCategoryCandidates");
  const resolveBlock = source.slice(resolveRange.start, resolveRange.end);

  if (!resolveBlock.includes("await findDefaultCategoryDerivationContextId(supabase)")) {
    failedChecks.push("resolveCategoryCandidates does not look up default context");
  }

  const findCall = findCallRange(source, resolveRange.start, "findExistingCategory(");

  if (!findCall.text.includes("defaultContextId")) {
    failedChecks.push("findExistingCategory call does not pass defaultContextId");
  }

  const createCall = findCallRange(source, resolveRange.start, "createContextualCategory(");

  if (!createCall.text.includes("defaultContextId")) {
    failedChecks.push("createContextualCategory call does not pass defaultContextId");
  }

  if (diagnostics.length > 0) {
    failedChecks.push("typescript transpile diagnostics are present");
  }

  return {
    ok:
      diagnostics.length === 0 &&
      missingPatterns.length === 0 &&
      forbiddenFound.length === 0 &&
      failedChecks.length === 0,
    diagnostics,
    missingPatterns,
    forbiddenFound,
    failedChecks,
  };
}

function main() {
  let source = fs.readFileSync(targetPath, "utf8").replace(/\r\n/g, "\n");

  if (!source.trimStart().startsWith("import type {")) {
    fail("Refusing to patch: resolver.ts does not start with import type.");
  }

  if (source.includes("findDefaultCategoryDerivationContextId")) {
    fail("Refusing to patch: findDefaultCategoryDerivationContextId already exists.");
  }

  if (source.includes("context_id: contextId,tegoryCandidate")) {
    fail("Refusing to patch: corruption marker is present before retry.");
  }

  source = source.replace(
    "eq(column: string, value: string): SupabaseSelectBuilder<T>;",
    "eq(column: string, value: string | number | boolean | null): SupabaseSelectBuilder<T>;",
  );

  if (!source.includes("eq(column: string, value: string | number | boolean | null): SupabaseSelectBuilder<T>;")) {
    fail("Could not widen SupabaseSelectBuilder.eq type.");
  }

  const contextualInterfaceMarker = "interface ContextualCategoryRow {";

  if (!source.includes(contextualInterfaceMarker)) {
    fail("ContextualCategoryRow interface marker not found.");
  }

  const contextRowBlock = `interface ContextRow {
  id: string;
  code: string;
  name?: string | null;
  status?: string | null;
  is_active?: boolean | null;
}

`;

  source = source.replace(contextualInterfaceMarker, contextRowBlock + contextualInterfaceMarker);

  const contextInterfaceRange = source.indexOf("interface ContextualCategoryRow {");
  const contextInterfaceEnd = source.indexOf("}", contextInterfaceRange);
  const contextInterfaceBlock = source.slice(contextInterfaceRange, contextInterfaceEnd);

  if (!contextInterfaceBlock.includes("context_id")) {
    const idLine = "  id: string;\n";
    const insertAt = source.indexOf(idLine, contextInterfaceRange) + idLine.length;
    source = replaceSlice(source, insertAt, insertAt, "  context_id?: string | null;\n");
  }

  const errorMessageBlock = `function errorMessage(error: { message?: string } | null): string | null {
  return error?.message ?? null;
}

`;

  if (!source.includes(errorMessageBlock)) {
    fail("errorMessage block not found.");
  }

  const helperBlock = `const DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE = "personal_activity";

const CONTEXTUAL_CATEGORY_ALLOWED_SOURCE_TYPES = new Set([
  "system_seed",
  "manual",
  "ai_suggested",
  "imported",
  "migrated",
  "owner_confirmed",
  "platform_verified",
]);

function normalizeContextualCategorySourceType(sourceType: string | undefined): string {
  const normalized = sourceType?.trim();

  if (normalized && CONTEXTUAL_CATEGORY_ALLOWED_SOURCE_TYPES.has(normalized)) {
    return normalized;
  }

  return "ai_suggested";
}

async function findDefaultCategoryDerivationContextId(
  supabase: CategoryResolverSupabaseClient,
): Promise<{ contextId: string | null; error: string | null }> {
  const result = await supabase
    .from<ContextRow>("contexts")
    .select("id, code, status, is_active")
    .eq("code", DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return {
    contextId: result.data?.id ?? null,
    error: errorMessage(result.error),
  };
}

`;

  source = source.replace(errorMessageBlock, errorMessageBlock + helperBlock);

  let findExistingRange = findFunctionRange(source, "findExistingCategory");
  let findExistingBlock = source.slice(findExistingRange.start, findExistingRange.end);

  findExistingBlock = findExistingBlock.replace(
    "  semanticLayer?: string,\n): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {",
    "  semanticLayer?: string,\n  contextId?: string | null,\n): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {",
  );

  if (!findExistingBlock.includes("contextId?: string | null")) {
    fail("Failed to add contextId parameter to findExistingCategory.");
  }

  findExistingBlock = findExistingBlock.replace(
    `    .select("*")
    .eq("slug", slug);

  if (semanticLayer && semanticLayer.trim().length > 0) {`,
    `    .select("*")
    .eq("slug", slug);

  if (contextId && contextId.trim().length > 0) {
    query = query.eq("context_id", contextId);
  }

  if (semanticLayer && semanticLayer.trim().length > 0) {`,
  );

  if (!findExistingBlock.includes(".eq(\"context_id\", contextId)")) {
    fail("Failed to add context_id filter to findExistingCategory.");
  }

  source = replaceSlice(source, findExistingRange.start, findExistingRange.end, findExistingBlock);

  let createRange = findFunctionRange(source, "createContextualCategory");
  let createSignature = source.slice(createRange.start, createRange.bodyStart);

  if (!createSignature.includes("contextId: string")) {
    if (!createSignature.includes("normalizedSlug: string,")) {
      fail("normalizedSlug parameter anchor not found in createContextualCategory signature.");
    }

    createSignature = createSignature.replace(
      "normalizedSlug: string,",
      "normalizedSlug: string,\n  contextId: string,",
    );

    source = replaceSlice(source, createRange.start, createRange.bodyStart, createSignature);
  }

  createRange = findFunctionRange(source, "createContextualCategory");
  let createBlock = source.slice(createRange.start, createRange.end);

  const payloadMatch = /const payload\s*(?::\s*Record<string,\s*unknown>)?\s*=\s*\{/.exec(createBlock);

  if (!payloadMatch) {
    fail("Payload anchor not found inside createContextualCategory.");
  }

  if (!createBlock.includes("context_id: contextId")) {
    const insertAt = createRange.start + payloadMatch.index + payloadMatch[0].length;
    source = replaceSlice(source, insertAt, insertAt, "\n    context_id: contextId,");
  }

  createRange = findFunctionRange(source, "createContextualCategory");
  createBlock = source.slice(createRange.start, createRange.end);

  if (createBlock.includes('source_type: options.sourceType ?? "ai_suggested",')) {
    createBlock = createBlock.replace(
      'source_type: options.sourceType ?? "ai_suggested",',
      "source_type: normalizeContextualCategorySourceType(options.sourceType),",
    );
  } else if (createBlock.includes("source_type: options.sourceType,")) {
    createBlock = createBlock.replace(
      "source_type: options.sourceType,",
      "source_type: normalizeContextualCategorySourceType(options.sourceType),",
    );
  } else if (!createBlock.includes("source_type: normalizeContextualCategorySourceType(options.sourceType),")) {
    fail("Could not find source_type payload line to normalize.");
  }

  source = replaceSlice(source, createRange.start, createRange.end, createBlock);

  let resolveRange = findFunctionRange(source, "resolveCategoryCandidates");
  let resolveBlock = source.slice(resolveRange.start, resolveRange.end);

  const loopAnchor = "  for (const candidate of candidates) {";

  if (!resolveBlock.includes(loopAnchor)) {
    fail("Candidate loop anchor not found.");
  }

  const contextLookupBlock = `  const defaultContextResult =
    await findDefaultCategoryDerivationContextId(supabase);

  const defaultContextId = defaultContextResult.contextId;

  if (defaultContextResult.error) {
    warnings.push(
      \`Default category derivation context lookup failed: \${defaultContextResult.error}\`,
    );
  }

  if (!defaultContextId && createPolicy !== "never") {
    warnings.push(
      \`Default category derivation context not found: \${DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE}\`,
    );
  }

`;

  resolveBlock = resolveBlock.replace(loopAnchor, contextLookupBlock + loopAnchor);
  source = replaceSlice(source, resolveRange.start, resolveRange.end, resolveBlock);

  resolveRange = findFunctionRange(source, "resolveCategoryCandidates");

  let findCall = findCallRange(source, resolveRange.start, "findExistingCategory(");

  if (!findCall.text.includes("defaultContextId")) {
    let updatedCallText = findCall.text;

    if (updatedCallText.includes("semanticLayer,\n    );")) {
      updatedCallText = updatedCallText.replace(
        "semanticLayer,\n    );",
        "semanticLayer,\n      defaultContextId,\n    );",
      );
    } else if (updatedCallText.includes("candidate.semanticLayer,\n    );")) {
      updatedCallText = updatedCallText.replace(
        "candidate.semanticLayer,\n    );",
        "candidate.semanticLayer,\n      defaultContextId,\n    );",
      );
    } else {
      fail("Could not insert defaultContextId into findExistingCategory call.");
    }

    source = replaceSlice(source, findCall.start, findCall.end, updatedCallText);
  }

  resolveRange = findFunctionRange(source, "resolveCategoryCandidates");
  let createCall = findCallRange(source, resolveRange.start, "createContextualCategory(");

  if (!source.slice(resolveRange.start, createCall.start).includes("Cannot create contextual category without default context")) {
    const guardBlock = `    if (!defaultContextId) {
      unresolvedCount += 1;
      warnings.push(
        \`Cannot create contextual category without default context: \${normalizedSlug}\`,
      );
      resolved.push({
        ...candidate,
        categoryId: null,
        resolutionStatus: "unresolved",
        metadata: {
          ...(candidate.metadata ?? {}),
          normalizedSlug,
          createPolicy,
          missingContextCode: DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE,
        },
      });
      continue;
    }

`;

    source = replaceSlice(source, createCall.start, createCall.start, guardBlock);
  }

  resolveRange = findFunctionRange(source, "resolveCategoryCandidates");
  createCall = findCallRange(source, resolveRange.start, "createContextualCategory(");

  if (!createCall.text.includes("defaultContextId")) {
    let updatedCreateCallText = createCall.text;

    if (updatedCreateCallText.includes("normalizedSlug,\n      ")) {
      updatedCreateCallText = updatedCreateCallText.replace(
        "normalizedSlug,\n      ",
        "normalizedSlug,\n      defaultContextId,\n      ",
      );
    } else {
      fail("Could not insert defaultContextId into createContextualCategory call.");
    }

    source = replaceSlice(source, createCall.start, createCall.end, updatedCreateCallText);
  }

  const validation = validateSource(source);

  const output = {
    ok: validation.ok,
    checkId: "P4.10.0-C8-P3-B6-D-C-retry",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    diagnosticsCount: validation.diagnostics.length,
    missingPatterns: validation.missingPatterns,
    forbiddenFound: validation.forbiddenFound,
    failedChecks: validation.failedChecks,
    diagnostics: validation.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      message:
        typeof diagnostic.messageText === "string"
          ? diagnostic.messageText
          : diagnostic.messageText.messageText,
    })),
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  if (!validation.ok) {
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  fs.writeFileSync(targetPath, `${source.replace(/\n/g, "\r\n")}`, "utf8");

  console.log("RESULT: PASS — resolver patched safely in memory and then written.");
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);
}

main();