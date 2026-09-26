import fs from "node:fs";

const files = {
  analyzer: fs.readFileSync(
    "src/lib/activity/activity-basic-intake-analysis.server.ts",
    "utf8",
  ),
  materializer: fs.readFileSync(
    "src/lib/activity/activity-intake-source-fact-materializer.server.ts",
    "utf8",
  ),
  route: fs.readFileSync(
    "src/app/api/activity/intake-analysis/materialize-source-facts/route.ts",
    "utf8",
  ),
  card: fs.readFileSync(
    "src/components/activity/activity-basic-intake-analysis-card.tsx",
    "utf8",
  ),
};

let passed = 0;
let total = 0;

function check(name, condition) {
  total += 1;
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log(`PASS ${name}`);
}

const has = (file, needle) => files[file].includes(needle);
const compact = (value) => value.replace(/\s+/g, " ").trim();
const compactFiles = Object.fromEntries(
  Object.entries(files).map(([key, value]) => [key, compact(value)]),
);
const compactHas = (file, needle) =>
  compactFiles[file].includes(compact(needle));

check(
  "analyzer has occurrence-count detector",
  has("analyzer", "function isOccurrenceCountFragment"),
);
check(
  "occurrence count supports Russian times marker",
  has("analyzer", "раз(?:а|ів|и)?"),
);
check(
  "occurrence count supports platform languages",
  ["razy", "times?", "mal", "veces?", "krát"].every((item) =>
    has("analyzer", item),
  ),
);
check(
  "occurrence detector uses unicode-safe trailing boundary",
  has("analyzer", '(?=$|[^\\p{L}\\p{N}_])'),
);
check(
  "occurrence fragments canonicalize to count type",
  compactHas(
    "analyzer",
    'if (isOccurrenceCountFragment(rawFragment)) { return "count"; }',
  ),
);
check(
  "occurrence fragments canonicalize to count parameter",
  compactHas(
    "analyzer",
    'if (isOccurrenceCountFragment(rawFragment)) { return "count"; }',
  ),
);
check(
  "explicit repetition regex no longer treats generic Russian raz as repetitions",
  !/const repetitionPatterns = \[[\s\S]*?раз\(\?:а\)\?/u.test(files.analyzer),
);
check(
  "deterministic occurrence count emits qualifier",
  compactHas(
    "analyzer",
    "qualifier: qualifier.slice(0, 160)",
  ),
);
check(
  "deterministic occurrence count emits count code",
  compactHas(
    "analyzer",
    'parameterCode: "count"',
  ),
);
check(
  "deterministic occurrence count uses count unit",
  compactHas(
    "analyzer",
    'unit: "count"',
  ),
);
check(
  "measurement dedup includes qualifier",
  has(
    "analyzer",
    'normalizeText(item.qualifier ?? "")',
  ),
);
check(
  "count unit normalizes model repetition unit",
  compactHas(
    "analyzer",
    '"repetition", "repetitions", "times", "occurrence", "occurrences"',
  ),
);
check(
  "model prompt distinguishes occurrence count from repetitions",
  has(
    "analyzer",
    'Phrases meaning "N times <action>" are occurrence counts',
  ),
);
check(
  "model prompt keeps explicit repetitions separate",
  has(
    "analyzer",
    'Use repetitions only when the source explicitly says repetitions/reps',
  ),
);

check(
  "materializer uses global system localizer lazily",
  has("materializer", "localizeGlobalSystemValueObject") &&
    has("materializer", "localizeValueObjectRowsForDisplay"),
);
check(
  "value object row carries metadata json",
  has("materializer", "metadata_json?: unknown;"),
);
check(
  "value object query reads metadata json",
  has(
    "materializer",
    '.select("id,canonical_key,title,metadata_json,scope_code,ontology_node_role_code,status")',
  ),
);
check(
  "materializer input accepts locale",
  compactHas("materializer", "locale?: string;"),
);
check(
  "materializer localizes targets at read time",
  has("materializer", "localizeGlobalSystemValueObject") &&
    has("materializer", "requestedLocale"),
);
check(
  "localized title feeds missing values",
  has("materializer", "targetTitle: target.title"),
);
check(
  "localized title feeds planned values",
  has("materializer", "targetTitle: target.title"),
);

check(
  "single-target fallback is count-only",
  /definition\.parameter_code\s*===\s*"count"/u.test(
    files.materializer,
  ),
);
check(
  "single-target fallback requires measurement qualifier",
  /Boolean\(\s*measurement\.qualifier\s*,?\s*\)/u.test(
    files.materializer,
  ),
);
check(
  "single-target fallback requires exactly one direct target",
  /directEligiblePairs\.length\s*===\s*1/u.test(
    files.materializer,
  ),
);
check(
  "single-target fallback requires explicit qualifier target",
  /directEligiblePairs\[0\]\s*\.targetQualification\s*\?\.mode\s*===\s*"explicit_qualifier"/u.test(
    files.materializer,
  ),
);
check(
  "fallback provenance marker stored",
  has(
    "materializer",
    '"single_explicit_count_target"',
  ),
);
check(
  "alias matching remains primary",
  has(
    "materializer",
    '"alias_match"',
  ),
);

check(
  "route normalizes locale",
  has("route", "function normalizeLocale"),
);
check(
  "route GET forwards locale",
  /activityEventId,\s*locale,\s*preflightOnly:\s*true,/u.test(
    files.route,
  ),
);
check(
  "route POST forwards locale",
  compactHas(
    "route",
    "activityEventId, locale,",
  ),
);

check(
  "card GET preflight sends locale",
  compactHas(
    "card",
    "activityEventId: preflightActivityEventId, locale,",
  ),
);
check(
  "card preflight cache key includes locale",
  has("card", '|${locale}`'),
);
check(
  "card POST materialization sends locale",
  has(
    "card",
    "body: JSON.stringify({ activityEventId, locale })",
  ),
);
check(
  "preflight effect reruns on locale change",
  /preflightStatus,\s*locale,\s*\]\);/u.test(files.card),
);

check(
  "no replacement characters analyzer",
  !files.analyzer.includes("�"),
);
check(
  "no replacement characters materializer",
  !files.materializer.includes("�"),
);
check(
  "no replacement characters route",
  !files.route.includes("�"),
);
check(
  "no replacement characters card",
  !files.card.includes("�"),
);

if (!process.exitCode) {
  console.log(`VALIDATOR=PASS_${passed}_${total}`);
}
