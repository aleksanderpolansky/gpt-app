const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const rootDir = process.cwd();
const targetPath = path.join(rootDir, "lib", "activity", "categoryDerivation", "resolver.ts");
const resultPath = path.join(
  rootDir,
  "docs",
  "value-objects",
  "category-derivation-resolver-c8-p3-b6-d-c-retry3-result.json",
);

function fail(message) {
  throw new Error(message);
}

function replaceOnce(source, oldText, newText, label) {
  const count = source.split(oldText).length - 1;

  if (count !== 1) {
    fail(`${label}: expected exactly one match, found ${count}`);
  }

  return source.replace(oldText, newText);
}

function validate(source) {
  const diagnostics =
    ts.transpileModule(source, {
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
    "DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE = \"personal_activity\"",
    "interface ContextRow",
    "function findDefaultCategoryDerivationContextId",
    "function normalizeContextualCategorySourceType",
    ".from<ContextRow>(\"contexts\")",
    ".eq(\"code\", DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE)",
    ".eq(\"is_active\", true)",
    "context_id?: string | null",
    "contextId?: string | null",
    ".eq(\"context_id\", contextId)",
    "context_id: contextId",
    "source_type: normalizeContextualCategorySourceType(options.sourceType)",
    "const defaultContextResult =",
    "const defaultContextId = defaultContextResult.contextId",
    "Cannot create contextual category without default context",
    "missingContextCode: DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE",
    "async function createCategory(",
    "defaultContextId,",
  ];

  const forbiddenPatterns = [
    "context_id: contextId,tegoryCandidate",
    ");import type",
    "source_type: options.sourceType ?? \"rule\"",
    "source_type: options.sourceType ?? \"ai_suggested\"",
    "source_type: options.sourceType,",
    "async function createContextualCategory",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));
  const forbiddenFound = forbiddenPatterns.filter((pattern) => source.includes(pattern));
  const failedChecks = [];

  if (!source.trimStart().startsWith("import type {")) {
    failedChecks.push("resolver does not start with import type");
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
    fail("Refusing to patch: resolver already contains context patch marker.");
  }

  if (source.includes("context_id: contextId,tegoryCandidate")) {
    fail("Refusing to patch: corruption marker exists.");
  }

  source = replaceOnce(
    source,
    "  eq(column: string, value: string): SupabaseSelectBuilder<T>;",
    "  eq(column: string, value: string | number | boolean | null): SupabaseSelectBuilder<T>;",
    "widen SupabaseSelectBuilder.eq type",
  );

  source = replaceOnce(
    source,
    "interface ContextualCategoryRow {\n  id: string;\n",
    `interface ContextRow {
  id: string;
  code: string;
  name?: string | null;
  status?: string | null;
  is_active?: boolean | null;
}

interface ContextualCategoryRow {
  id: string;
  context_id?: string | null;
`,
    "add ContextRow and context_id field",
  );

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

  source = replaceOnce(
    source,
    `function errorMessage(error: { message?: string } | null): string | null {
  return error?.message ?? null;
}

`,
    `function errorMessage(error: { message?: string } | null): string | null {
  return error?.message ?? null;
}

${helperBlock}`,
    "insert helper block after errorMessage",
  );

  source = replaceOnce(
    source,
    `async function findExistingCategory(
  supabase: CategoryResolverSupabaseClient,
  slug: string,
  semanticLayer?: string,
): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
`,
    `async function findExistingCategory(
  supabase: CategoryResolverSupabaseClient,
  slug: string,
  semanticLayer?: string,
  contextId?: string | null,
): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
`,
    "update findExistingCategory signature",
  );

  source = replaceOnce(
    source,
    `  let query = supabase
    .from<ContextualCategoryRow>("contextual_categories")
    .select("*")
    .eq("slug", slug);

  if (semanticLayer && semanticLayer.trim().length > 0) {
`,
    `  let query = supabase
    .from<ContextualCategoryRow>("contextual_categories")
    .select("*")
    .eq("slug", slug);

  if (contextId && contextId.trim().length > 0) {
    query = query.eq("context_id", contextId);
  }

  if (semanticLayer && semanticLayer.trim().length > 0) {
`,
    "make findExistingCategory context-aware",
  );

  source = replaceOnce(
    source,
    `async function createCategory(
  supabase: CategoryResolverSupabaseClient,
  candidate: CategoryCandidate,
  normalizedSlug: string,
  options: Required<Pick<CategoryResolverOptions, "createPolicy">> &
    CategoryResolverOptions,
): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
`,
    `async function createCategory(
  supabase: CategoryResolverSupabaseClient,
  candidate: CategoryCandidate,
  normalizedSlug: string,
  contextId: string,
  options: Required<Pick<CategoryResolverOptions, "createPolicy">> &
    CategoryResolverOptions,
): Promise<{ row: ContextualCategoryRow | null; error: string | null }> {
`,
    "update createCategory signature",
  );

  source = replaceOnce(
    source,
    `  const payload: Record<string, unknown> = {
    slug: normalizedSlug,
`,
    `  const payload: Record<string, unknown> = {
    context_id: contextId,
    slug: normalizedSlug,
`,
    "add context_id to payload",
  );

  source = replaceOnce(
    source,
    `    source_type: options.sourceType ?? "rule",
`,
    `    source_type: normalizeContextualCategorySourceType(options.sourceType),
`,
    "normalize source_type",
  );

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

  source = replaceOnce(
    source,
    "  for (const candidate of candidates) {\n",
    contextLookupBlock + "  for (const candidate of candidates) {\n",
    "insert default context lookup",
  );

  source = replaceOnce(
    source,
    `    const existing = await findExistingCategory(
      supabase,
      normalizedSlug,
      semanticLayer,
    );
`,
    `    const existing = await findExistingCategory(
      supabase,
      normalizedSlug,
      semanticLayer,
      defaultContextId,
    );
`,
    "pass defaultContextId into findExistingCategory",
  );

  source = replaceOnce(
    source,
    `    const created = await createCategory(
      supabase,
      candidate,
      normalizedSlug,
      {
        ...options,
        createPolicy,
      },
    );
`,
    `    if (!defaultContextId) {
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

    const created = await createCategory(
      supabase,
      candidate,
      normalizedSlug,
      defaultContextId,
      {
        ...options,
        createPolicy,
      },
    );
`,
    "guard missing context and pass defaultContextId into createCategory",
  );

  const validation = validate(source);

  const output = {
    ok: validation.ok,
    checkId: "P4.10.0-C8-P3-B6-D-C-retry3",
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

  console.log("RESULT: PASS — retry3 patched resolver.ts safely.");
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);
}

main();