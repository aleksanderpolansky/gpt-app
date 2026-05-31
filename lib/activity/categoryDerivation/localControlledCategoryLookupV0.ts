export const LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0 =
  "local_controlled_category_lookup_v0" as const;

export const LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0 =
  "read_only_local_controlled_category_lookup_no_db_write" as const;

export type LocalControlledCategoryLookupPolicyV0 =
  typeof LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0;

export type LocalControlledCategoryLookupModeV0 =
  typeof LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0;

export type LocalControlledCategoryLookupLanguageV0 =
  | "ru"
  | "pl"
  | "en"
  | "de"
  | "es"
  | "uk"
  | "unknown";

export type LocalControlledCategoryRoleV0 =
  | "activity_kind"
  | "knowledge_domain"
  | "social_role"
  | "care_function"
  | "family_context"
  | "movement_context"
  | "work_context"
  | "generic_context";

export type LocalControlledCategoryMatchStatusV0 =
  | "confident_match"
  | "possible_match"
  | "ambiguous_match"
  | "no_confident_match";

export type LocalControlledCategoryAliasMatchKindV0 =
  | "phrase"
  | "token";

export type LocalControlledCategoryAliasV0 = {
  text: string;
  language: LocalControlledCategoryLookupLanguageV0;
  weight: number;
  matchKind: LocalControlledCategoryAliasMatchKindV0;
};

export type LocalControlledCategoryV0 = {
  categoryKey: string;
  canonicalSlug: string;
  title: string;
  role: LocalControlledCategoryRoleV0;
  description: string;
  aliases: LocalControlledCategoryAliasV0[];
  stableForPreview: true;
  canEnterStableBundleAfterResolver: true;
  externalConceptRequired: false;
  canCreateStateFact: false;
};

export type LocalControlledCategoryMatchEvidenceV0 = {
  aliasText: string;
  aliasLanguage: LocalControlledCategoryLookupLanguageV0;
  matchKind: LocalControlledCategoryAliasMatchKindV0;
  weight: number;
  normalizedAlias: string;
  matchedTokens: string[];
};

export type LocalControlledCategoryMatchV0 = {
  categoryKey: string;
  canonicalSlug: string;
  title: string;
  role: LocalControlledCategoryRoleV0;
  status: LocalControlledCategoryMatchStatusV0;
  score: number;
  confidence: number;
  evidence: LocalControlledCategoryMatchEvidenceV0[];
  source: "local_controlled_registry_v0";
  externalConceptRequired: false;
  canEnterStableBundleAfterResolver: true;
  canCreateStateFact: false;
  safetyNotes: string[];
};

export type LocalControlledCategoryLookupRawInputV0 = {
  rawText?: unknown;
  inputText?: unknown;
  naturalInput?: unknown;
  activityText?: unknown;
  text?: unknown;
  inputLanguage?: unknown;
  detectedLanguage?: unknown;
  languageCode?: unknown;
  maxResults?: unknown;
};

export type LocalControlledCategoryLookupWritesV0 = {
  sqlExecuted: false;
  dbReadExecuted: false;
  dbWriteExecuted: false;
  supabaseReadExecuted: false;
  supabaseWriteExecuted: false;
  categoryInserted: false;
  categoryUpdated: false;
  categoryAliasInserted: false;
  unknownTermCandidateInserted: false;
  externalConceptCandidateInserted: false;
  resolverCandidateInserted: false;
  stableBundleCreated: false;
  activityEventInserted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
};

export type LocalControlledCategoryLookupResultV0 = {
  ok: boolean;
  policy: LocalControlledCategoryLookupPolicyV0;
  mode: LocalControlledCategoryLookupModeV0;
  inputText: string | null;
  normalizedText: string | null;
  inputLanguage: LocalControlledCategoryLookupLanguageV0;
  tokens: string[];
  matches: LocalControlledCategoryMatchV0[];
  confidentMatches: LocalControlledCategoryMatchV0[];
  possibleMatches: LocalControlledCategoryMatchV0[];
  ambiguousMatches: LocalControlledCategoryMatchV0[];
  unmatchedTokensPreview: string[];
  categoryRegistryCount: number;
  errors: string[];
  warnings: string[];
  safetyNotes: string[];
  writes: LocalControlledCategoryLookupWritesV0;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function firstInputText(input: LocalControlledCategoryLookupRawInputV0): string | null {
  return (
    readString(input.rawText) ??
    readString(input.inputText) ??
    readString(input.naturalInput) ??
    readString(input.activityText) ??
    readString(input.text)
  );
}

function normalizeLanguage(
  value: unknown
): LocalControlledCategoryLookupLanguageV0 {
  const language = readString(value)?.toLowerCase();

  if (
    language === "ru" ||
    language === "pl" ||
    language === "en" ||
    language === "de" ||
    language === "es" ||
    language === "uk"
  ) {
    return language;
  }

  return "unknown";
}

function firstLanguage(
  input: LocalControlledCategoryLookupRawInputV0
): LocalControlledCategoryLookupLanguageV0 {
  return normalizeLanguage(
    input.inputLanguage ?? input.detectedLanguage ?? input.languageCode
  );
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeTextForLookup(value: string): string {
  return value
    .replace(/[łŁ]/g, "l")
    .replace(/[ёЁ]/g, "е")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeNormalizedText(value: string): string[] {
  const normalized = normalizeTextForLookup(value);

  if (!normalized) {
    return [];
  }

  return Array.from(new Set(normalized.split(" ").filter(Boolean)));
}

function alias(
  text: string,
  language: LocalControlledCategoryLookupLanguageV0,
  weight: number,
  matchKind: LocalControlledCategoryAliasMatchKindV0 = "phrase"
): LocalControlledCategoryAliasV0 {
  return {
    text,
    language,
    weight,
    matchKind,
  };
}

export const LOCAL_CONTROLLED_CATEGORY_REGISTRY_V0: readonly LocalControlledCategoryV0[] =
  [
    {
      categoryKey: "learning-activity",
      canonicalSlug: "learning-activity",
      title: "Learning activity",
      role: "activity_kind",
      description:
        "The activity has the meaning of learning, studying, teaching, training or knowledge acquisition.",
      aliases: [
        alias("studied", "en", 0.95, "token"),
        alias("study", "en", 0.9, "token"),
        alias("learning", "en", 0.9, "token"),
        alias("learn", "en", 0.85, "token"),
        alias("teaching", "en", 0.85, "token"),
        alias("учил", "ru", 0.95, "token"),
        alias("учить", "ru", 0.85, "token"),
        alias("изучал", "ru", 0.9, "token"),
        alias("обучение", "ru", 0.8, "token"),
        alias("uczyłem", "pl", 0.95, "token"),
        alias("uczyłem się", "pl", 0.95, "phrase"),
        alias("uczyć", "pl", 0.8, "token"),
        alias("nauka", "pl", 0.8, "token"),
        alias("lernte", "de", 0.9, "token"),
        alias("lernen", "de", 0.85, "token"),
        alias("aprendí", "es", 0.9, "token"),
        alias("aprender", "es", 0.85, "token"),
      ],
      stableForPreview: true,
      canEnterStableBundleAfterResolver: true,
      externalConceptRequired: false,
      canCreateStateFact: false,
    },
    {
      categoryKey: "mathematics-learning",
      canonicalSlug: "mathematics-learning",
      title: "Mathematics learning",
      role: "knowledge_domain",
      description:
        "The activity is related to mathematics as a learning or teaching domain.",
      aliases: [
        alias("math", "en", 0.95, "token"),
        alias("mathematics", "en", 0.95, "token"),
        alias("maths", "en", 0.9, "token"),
        alias("математика", "ru", 0.95, "token"),
        alias("математике", "ru", 0.95, "token"),
        alias("математику", "ru", 0.95, "token"),
        alias("matematyka", "pl", 0.95, "token"),
        alias("matematyki", "pl", 0.95, "token"),
        alias("matematyce", "pl", 0.95, "token"),
        alias("mathematik", "de", 0.95, "token"),
        alias("matemáticas", "es", 0.95, "token"),
        alias("matematicas", "es", 0.95, "token"),
      ],
      stableForPreview: true,
      canEnterStableBundleAfterResolver: true,
      externalConceptRequired: false,
      canCreateStateFact: false,
    },
    {
      categoryKey: "child-learning-support",
      canonicalSlug: "child-learning-support",
      title: "Child learning support",
      role: "care_function",
      description:
        "The activity supports a child in learning and should be distinguished from generic learning.",
      aliases: [
        alias("with child", "en", 0.75, "phrase"),
        alias("child", "en", 0.7, "token"),
        alias("kid", "en", 0.65, "token"),
        alias("homework with child", "en", 0.95, "phrase"),
        alias("ребёнка", "ru", 0.75, "token"),
        alias("ребенка", "ru", 0.75, "token"),
        alias("с ребёнком", "ru", 0.8, "phrase"),
        alias("с ребенком", "ru", 0.8, "phrase"),
        alias("dziecko", "pl", 0.75, "token"),
        alias("z dzieckiem", "pl", 0.8, "phrase"),
        alias("kind", "de", 0.7, "token"),
        alias("mit kind", "de", 0.8, "phrase"),
        alias("niño", "es", 0.7, "token"),
        alias("nino", "es", 0.7, "token"),
        alias("con niño", "es", 0.8, "phrase"),
        alias("con nino", "es", 0.8, "phrase"),
      ],
      stableForPreview: true,
      canEnterStableBundleAfterResolver: true,
      externalConceptRequired: false,
      canCreateStateFact: false,
    },
    {
      categoryKey: "parental-care",
      canonicalSlug: "parental-care",
      title: "Parental care",
      role: "social_role",
      description:
        "The activity has a parent/caregiver role meaning, not only an object/action meaning.",
      aliases: [
        alias("with child", "en", 0.65, "phrase"),
        alias("helped child", "en", 0.9, "phrase"),
        alias("child", "en", 0.45, "token"),
        alias("parental care", "en", 1, "phrase"),
        alias("с ребёнком", "ru", 0.7, "phrase"),
        alias("с ребенком", "ru", 0.7, "phrase"),
        alias("ребёнка", "ru", 0.55, "token"),
        alias("ребенка", "ru", 0.55, "token"),
        alias("ребёнком", "ru", 0.55, "token"),
        alias("ребенком", "ru", 0.55, "token"),
        alias("помогал ребёнку", "ru", 0.95, "phrase"),
        alias("помогал ребенку", "ru", 0.95, "phrase"),
        alias("opieka nad dzieckiem", "pl", 1, "phrase"),
        alias("z dzieckiem", "pl", 0.7, "phrase"),
        alias("dziecko", "pl", 0.45, "token"),
        alias("elterliche betreuung", "de", 1, "phrase"),
        alias("cuidado parental", "es", 1, "phrase"),
      ],
      stableForPreview: true,
      canEnterStableBundleAfterResolver: true,
      externalConceptRequired: false,
      canCreateStateFact: false,
    },
    {
      categoryKey: "family-care-load",
      canonicalSlug: "family-care-load",
      title: "Family care load",
      role: "family_context",
      description:
        "The activity consumes attention/time in a family care responsibility context.",
      aliases: [
        alias("with child", "en", 0.65, "phrase"),
        alias("child", "en", 0.4, "token"),
        alias("family", "en", 0.55, "token"),
        alias("care", "en", 0.5, "token"),
        alias("с ребёнком", "ru", 0.7, "phrase"),
        alias("с ребенком", "ru", 0.7, "phrase"),
        alias("ребёнка", "ru", 0.45, "token"),
        alias("ребенка", "ru", 0.45, "token"),
        alias("семья", "ru", 0.55, "token"),
        alias("z dzieckiem", "pl", 0.7, "phrase"),
        alias("dziecko", "pl", 0.45, "token"),
        alias("rodzina", "pl", 0.55, "token"),
        alias("family care load", "en", 1, "phrase"),
        alias("care load", "en", 0.85, "phrase"),
      ],
      stableForPreview: true,
      canEnterStableBundleAfterResolver: true,
      externalConceptRequired: false,
      canCreateStateFact: false,
    },
    {
      categoryKey: "walking-movement",
      canonicalSlug: "walking-movement",
      title: "Walking movement",
      role: "movement_context",
      description:
        "The activity contains walking or pedestrian movement.",
      aliases: [
        alias("walking", "en", 0.95, "token"),
        alias("walked", "en", 0.95, "token"),
        alias("walk", "en", 0.9, "token"),
        alias("ходил", "ru", 0.9, "token"),
        alias("шёл", "ru", 0.9, "token"),
        alias("шел", "ru", 0.9, "token"),
        alias("spacer", "pl", 0.9, "token"),
        alias("szedłem", "pl", 0.9, "token"),
        alias("szedlem", "pl", 0.9, "token"),
        alias("gehen", "de", 0.85, "token"),
        alias("caminé", "es", 0.9, "token"),
        alias("camine", "es", 0.9, "token"),
      ],
      stableForPreview: true,
      canEnterStableBundleAfterResolver: true,
      externalConceptRequired: false,
      canCreateStateFact: false,
    },
    {
      categoryKey: "commute-context",
      canonicalSlug: "commute-context",
      title: "Commute context",
      role: "work_context",
      description:
        "The activity is related to commuting or moving to/from work.",
      aliases: [
        alias("to work", "en", 0.8, "phrase"),
        alias("commute", "en", 0.9, "token"),
        alias("commuting", "en", 0.9, "token"),
        alias("на работу", "ru", 0.85, "phrase"),
        alias("do pracy", "pl", 0.85, "phrase"),
        alias("zur arbeit", "de", 0.85, "phrase"),
        alias("al trabajo", "es", 0.85, "phrase"),
      ],
      stableForPreview: true,
      canEnterStableBundleAfterResolver: true,
      externalConceptRequired: false,
      canCreateStateFact: false,
    },
  ] as const;

export function buildLocalControlledCategoryLookupWritesV0(): LocalControlledCategoryLookupWritesV0 {
  return {
    sqlExecuted: false,
    dbReadExecuted: false,
    dbWriteExecuted: false,
    supabaseReadExecuted: false,
    supabaseWriteExecuted: false,
    categoryInserted: false,
    categoryUpdated: false,
    categoryAliasInserted: false,
    unknownTermCandidateInserted: false,
    externalConceptCandidateInserted: false,
    resolverCandidateInserted: false,
    stableBundleCreated: false,
    activityEventInserted: false,
    valueObjectCreated: false,
    activityValueObjectLinkCreated: false,
    stateFactCreated: false,
    stateDeltaCreated: false,
    stateSnapshotCreated: false,
  };
}

function buildMatchForCategory(params: {
  category: LocalControlledCategoryV0;
  normalizedText: string;
  inputTokens: string[];
  inputLanguage: LocalControlledCategoryLookupLanguageV0;
}): LocalControlledCategoryMatchV0 | null {
  const evidence: LocalControlledCategoryMatchEvidenceV0[] = [];
  let score = 0;

  for (const item of params.category.aliases) {
    const normalizedAlias = normalizeTextForLookup(item.text);
    const aliasTokens = tokenizeNormalizedText(item.text);

    if (!normalizedAlias || aliasTokens.length === 0) {
      continue;
    }

    const languageCompatible =
      item.language === "unknown" ||
      params.inputLanguage === "unknown" ||
      item.language === params.inputLanguage;

    const languageMultiplier = languageCompatible ? 1 : 0.72;

    if (item.matchKind === "phrase") {
      const phraseMatched =
        params.normalizedText === normalizedAlias ||
        params.normalizedText.includes(` ${normalizedAlias} `) ||
        params.normalizedText.startsWith(`${normalizedAlias} `) ||
        params.normalizedText.endsWith(` ${normalizedAlias}`);

      if (phraseMatched) {
        const weightedScore = item.weight * languageMultiplier;

        score += weightedScore;
        evidence.push({
          aliasText: item.text,
          aliasLanguage: item.language,
          matchKind: item.matchKind,
          weight: weightedScore,
          normalizedAlias,
          matchedTokens: aliasTokens,
        });
      }

      continue;
    }

    const matchedTokens = aliasTokens.filter((token) =>
      params.inputTokens.includes(token)
    );

    if (matchedTokens.length > 0) {
      const coverage = matchedTokens.length / aliasTokens.length;
      const weightedScore = item.weight * coverage * languageMultiplier;

      score += weightedScore;
      evidence.push({
        aliasText: item.text,
        aliasLanguage: item.language,
        matchKind: item.matchKind,
        weight: weightedScore,
        normalizedAlias,
        matchedTokens,
      });
    }
  }

  const normalizedScore = clamp01(score);

  if (normalizedScore < 0.25) {
    return null;
  }

  const status: LocalControlledCategoryMatchStatusV0 =
    normalizedScore >= 0.68 ? "confident_match" : "possible_match";

  return {
    categoryKey: params.category.categoryKey,
    canonicalSlug: params.category.canonicalSlug,
    title: params.category.title,
    role: params.category.role,
    status,
    score: Number(normalizedScore.toFixed(4)),
    confidence: Number(normalizedScore.toFixed(4)),
    evidence,
    source: "local_controlled_registry_v0",
    externalConceptRequired: false,
    canEnterStableBundleAfterResolver: true,
    canCreateStateFact: false,
    safetyNotes: [
      "This is a local controlled category lookup result only.",
      "No category, alias, unknown term, external concept or resolver row is inserted.",
      "The match may enter a stable semantic bundle only through resolver and later persistence gate.",
      "Category match does not create state facts, state deltas or state snapshots.",
    ],
  };
}

function detectUnmatchedTokens(params: {
  tokens: string[];
  matches: LocalControlledCategoryMatchV0[];
}): string[] {
  const matched = new Set<string>();

  for (const match of params.matches) {
    for (const evidence of match.evidence) {
      for (const token of evidence.matchedTokens) {
        matched.add(token);
      }
    }
  }

  const ignored = new Set([
    "for",
    "with",
    "to",
    "the",
    "a",
    "an",
    "and",
    "of",
    "in",
    "on",
    "at",
    "30",
    "15",
    "minutes",
    "minute",
    "min",
    "минут",
    "минуты",
    "przez",
    "minut",
    "do",
    "z",
    "с",
    "на",
  ]);

  return params.tokens.filter((token) => !matched.has(token) && !ignored.has(token));
}

export function buildLocalControlledCategoryLookupV0(
  rawInput: LocalControlledCategoryLookupRawInputV0
): LocalControlledCategoryLookupResultV0 {
  const writes = buildLocalControlledCategoryLookupWritesV0();

  if (!isRecord(rawInput)) {
    return {
      ok: false,
      policy: LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0,
      mode: LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0,
      inputText: null,
      normalizedText: null,
      inputLanguage: "unknown",
      tokens: [],
      matches: [],
      confidentMatches: [],
      possibleMatches: [],
      ambiguousMatches: [],
      unmatchedTokensPreview: [],
      categoryRegistryCount: LOCAL_CONTROLLED_CATEGORY_REGISTRY_V0.length,
      errors: ["Input must be a JSON object."],
      warnings: [],
      safetyNotes: [
        "Invalid input cannot be resolved by local controlled category lookup.",
        "No SQL, DB write, Supabase write or state write is performed.",
      ],
      writes,
    };
  }

  const inputText = firstInputText(rawInput);
  const inputLanguage = firstLanguage(rawInput);
  const maxResults = readNumber(rawInput.maxResults);

  if (!inputText) {
    return {
      ok: false,
      policy: LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0,
      mode: LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0,
      inputText: null,
      normalizedText: null,
      inputLanguage,
      tokens: [],
      matches: [],
      confidentMatches: [],
      possibleMatches: [],
      ambiguousMatches: [],
      unmatchedTokensPreview: [],
      categoryRegistryCount: LOCAL_CONTROLLED_CATEGORY_REGISTRY_V0.length,
      errors: [
        "Local controlled category lookup requires one of rawText, inputText, naturalInput, activityText or text.",
      ],
      warnings: [],
      safetyNotes: [
        "Missing input cannot be resolved by local controlled category lookup.",
        "No SQL, DB write, Supabase write or state write is performed.",
      ],
      writes,
    };
  }

  const normalizedText = normalizeTextForLookup(inputText);
  const tokens = tokenizeNormalizedText(inputText);

  const matches = LOCAL_CONTROLLED_CATEGORY_REGISTRY_V0
    .map((category) =>
      buildMatchForCategory({
        category,
        normalizedText,
        inputTokens: tokens,
        inputLanguage,
      })
    )
    .filter((match): match is LocalControlledCategoryMatchV0 => match !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.categoryKey.localeCompare(right.categoryKey);
    });

  const limitedMatches =
    maxResults !== null && maxResults > 0 ? matches.slice(0, maxResults) : matches;

  const confidentMatches = limitedMatches.filter(
    (match) => match.status === "confident_match"
  );

  const possibleMatches = limitedMatches.filter(
    (match) => match.status === "possible_match"
  );

  const ambiguousMatches: LocalControlledCategoryMatchV0[] = [];

  const unmatchedTokensPreview = detectUnmatchedTokens({
    tokens,
    matches: limitedMatches,
  });

  return {
    ok: true,
    policy: LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0,
    mode: LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0,
    inputText,
    normalizedText,
    inputLanguage,
    tokens,
    matches: limitedMatches,
    confidentMatches,
    possibleMatches,
    ambiguousMatches,
    unmatchedTokensPreview,
    categoryRegistryCount: LOCAL_CONTROLLED_CATEGORY_REGISTRY_V0.length,
    errors: [],
    warnings:
      limitedMatches.length === 0
        ? [
            "No local controlled category match found. C33-F.3 unknown term detector should handle this later.",
          ]
        : [],
    safetyNotes: [
      "Local controlled category lookup is read-only.",
      "It does not call SQL, Supabase or external ontology providers.",
      "It does not create categories, unknown term candidates, external concept candidates or resolver rows.",
      "It does not create Activity Events, Value Objects, links, state facts, state deltas or state snapshots.",
      "External concepts may only appear later as candidates after local-first lookup fails or remains ambiguous.",
    ],
    writes,
  };
}

export function buildLocalControlledCategoryLookupReadinessV0() {
  return {
    ok: true,
    policy: LOCAL_CONTROLLED_CATEGORY_LOOKUP_POLICY_V0,
    mode: "route_contract_readiness_no_lookup_execution",
    routeMode: LOCAL_CONTROLLED_CATEGORY_LOOKUP_MODE_V0,
    categoryRegistryCount: LOCAL_CONTROLLED_CATEGORY_REGISTRY_V0.length,
    categoryKeys: LOCAL_CONTROLLED_CATEGORY_REGISTRY_V0.map(
      (category) => category.categoryKey
    ),
    supportedInputFields: [
      "rawText",
      "inputText",
      "naturalInput",
      "activityText",
      "text",
      "inputLanguage",
      "detectedLanguage",
      "languageCode",
      "maxResults",
    ],
    searchOrderPosition: {
      after: [
        "raw Activity Event capture",
        "language detection / normalization",
        "metric separation",
      ],
      before: [
        "unknown term candidate detection",
        "external concept candidate lookup",
        "resolver decision",
        "stable semantic bundle",
        "Value Object policy",
        "state hook generation",
      ],
    },
    safetyNotes: [
      "This is the first local-first controlled lookup step.",
      "External concepts are not consulted by this contract.",
      "Unknown term candidates are not inserted by this contract.",
      "No persistence gate is opened by this contract.",
    ],
    writes: buildLocalControlledCategoryLookupWritesV0(),
  };
}

