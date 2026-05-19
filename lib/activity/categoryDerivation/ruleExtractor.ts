import type {
  CategoryCandidate,
  CategoryDerivationInput,
  CategoryDerivationResult,
  JsonRecord,
} from "./types";

export const CATEGORY_DERIVATION_PROCESSOR_VERSION = "category_derivation_v1";
export const CATEGORY_DERIVATION_RULE_VERSION = "rules_v1";

type CandidateDraft = Omit<CategoryCandidate, "source"> & {
  source?: CategoryCandidate["source"];
};

function normalizeInputText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function makeMetadata(
  ruleId: string,
  evidence: string[],
  extra: Record<string, string | number | boolean> = {},
): JsonRecord {
  return {
    ruleId,
    evidence,
    ...extra,
  };
}

function dedupeCandidates(candidates: CategoryCandidate[]): CategoryCandidate[] {
  const byKey = new Map<string, CategoryCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.semanticLayer ?? "other"}::${candidate.slug}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }

    const existingConfidence = existing.confidence ?? 0;
    const candidateConfidence = candidate.confidence ?? 0;

    byKey.set(key, {
      ...existing,
      ...candidate,
      confidence: Math.max(existingConfidence, candidateConfidence),
      isRequired: Boolean(existing.isRequired || candidate.isRequired),
      isConfirmed: Boolean(existing.isConfirmed || candidate.isConfirmed),
      needsUserReview: Boolean(
        existing.needsUserReview || candidate.needsUserReview,
      ),
    });
  }

  return Array.from(byKey.values());
}

function addCandidate(
  target: CategoryCandidate[],
  candidate: CandidateDraft,
): void {
  target.push({
    source: "rule",
    ...candidate,
  });
}

function addDurationMetricCandidate(
  target: CategoryCandidate[],
  input: CategoryDerivationInput,
  text: string,
): void {
  const hasDuration =
    typeof input.durationMinutes === "number" ||
    /\b\d+\s*(minute|minutes|min)\b/.test(text) ||
    /\b\d+\s*(минута|минуты|минут)\b/.test(text);

  if (!hasDuration) {
    return;
  }

  addCandidate(target, {
    slug: "duration-minutes",
    title: "Duration in minutes",
    semanticLayer: "metric",
    categoryType: "measurement",
    confidence: 0.98,
    isRequired: true,
    isConfirmed: true,
    metadata: makeMetadata("duration_minutes_metric", ["durationMinutes or minute expression"]),
  });
}

export function deriveCategoryCandidates(
  input: CategoryDerivationInput,
): CategoryDerivationResult {
  const rawText = [input.inputText, input.title ?? "", input.description ?? ""]
    .filter(Boolean)
    .join(" ");

  const text = normalizeInputText(rawText);
  const candidates: CategoryCandidate[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (text.length === 0) {
    return {
      ok: true,
      skipped: true,
      skipReason: "empty_input_text",
      processorVersion: CATEGORY_DERIVATION_PROCESSOR_VERSION,
      ruleVersion: CATEGORY_DERIVATION_RULE_VERSION,
      confidence: null,
      candidates: [],
      warnings: ["No input text was available for deterministic category derivation."],
      errors: [],
      metadata: {
        extractor: "ruleExtractor",
        extractorVersion: CATEGORY_DERIVATION_RULE_VERSION,
      },
    };
  }

  const walkedToWork = includesAny(text, [
    "walked to work",
    "walking to work",
    "walk to work",
    "шёл на работу",
    "шел на работу",
    "ходил на работу",
    "пешком на работу",
  ]);

  if (walkedToWork) {
    addCandidate(candidates, {
      slug: "walking",
      title: "Walking",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["walked to work"]),
    });

    addCandidate(candidates, {
      slug: "work",
      title: "Work",
      semanticLayer: "context",
      categoryType: "life_domain",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["work destination"]),
    });

    addCandidate(candidates, {
      slug: "commute-to-work",
      title: "Commute to work",
      semanticLayer: "purpose",
      categoryType: "activity_meaning",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["walked to work"]),
    });

    addCandidate(candidates, {
      slug: "walking-to-work",
      title: "Walking to work",
      semanticLayer: "activity_meaning",
      categoryType: "derived_activity_bundle",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_to_work_duration", ["walking plus work destination"]),
    });
  }

  const walkingDog = includesAny(text, [
    "walking dog",
    "walked dog",
    "walked with dog",
    "гулял с собакой",
    "гуляла с собакой",
    "выгуливал собаку",
    "выгуливала собаку",
  ]);

  if (walkingDog) {
    addCandidate(candidates, {
      slug: "walking",
      title: "Walking",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.93,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_dog", ["walking dog"]),
    });

    addCandidate(candidates, {
      slug: "dog",
      title: "Dog",
      semanticLayer: "participant",
      categoryType: "animal_participant",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_dog", ["dog"]),
    });

    addCandidate(candidates, {
      slug: "pet-care",
      title: "Pet care",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.86,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("walking_dog", ["dog walking care function"]),
    });
  }

  const childStudiedNearby = includesAny(text, [
    "ребенок учил математику рядом",
    "ребёнок учил математику рядом",
    "ребенок занимался математикой рядом",
    "ребёнок занимался математикой рядом",
  ]);

  const taughtMathWithChild =
    !childStudiedNearby &&
    includesAny(text, [
      "учил математику с ребенком",
      "учил математику с ребёнком",
      "занимался математикой с ребенком",
      "занимался математикой с ребёнком",
      "helped child with math",
      "taught math to child",
    ]);

  if (taughtMathWithChild) {
    addCandidate(candidates, {
      slug: "teaching",
      title: "Teaching",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child", ["teach math with child"]),
    });

    addCandidate(candidates, {
      slug: "mathematics",
      title: "Mathematics",
      semanticLayer: "domain",
      categoryType: "knowledge_domain",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child", ["mathematics"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.96,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child", ["child participant"]),
    });

    addCandidate(candidates, {
      slug: "family",
      title: "Family",
      semanticLayer: "relationship_context",
      categoryType: "social_context",
      confidence: 0.82,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child", ["family context inferred from child"]),
    });

    addCandidate(candidates, {
      slug: "parental-care",
      title: "Parental care",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child", ["adult helps child learn"]),
    });

    addCandidate(candidates, {
      slug: "helping-child-learn",
      title: "Helping child learn",
      semanticLayer: "activity_meaning",
      categoryType: "activity_meaning",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("teach_math_with_child", ["teaching math with child"]),
    });
  }

  if (childStudiedNearby) {
    addCandidate(candidates, {
      slug: "mathematics",
      title: "Mathematics",
      semanticLayer: "domain",
      categoryType: "knowledge_domain",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("child_studied_math_nearby", ["child studied mathematics nearby"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("child_studied_math_nearby", ["child"]),
    });

    addCandidate(candidates, {
      slug: "supervision",
      title: "Supervision",
      semanticLayer: "care_function",
      categoryType: "care_function",
      confidence: 0.72,
      isRequired: false,
      isConfirmed: false,
      needsUserReview: true,
      metadata: makeMetadata("child_studied_math_nearby", ["nearby adult context"]),
    });
  }

  const watchedFilmWithChild = includesAny(text, [
    "смотрел фильм с ребенком",
    "смотрел фильм с ребёнком",
    "watched film with child",
    "watched movie with child",
  ]);

  if (watchedFilmWithChild) {
    addCandidate(candidates, {
      slug: "watching",
      title: "Watching",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_film_with_child", ["watch film with child"]),
    });

    addCandidate(candidates, {
      slug: "film",
      title: "Film",
      semanticLayer: "object",
      categoryType: "media_object",
      confidence: 0.93,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_film_with_child", ["film"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_film_with_child", ["child"]),
    });
  }

  const watchedEnglishCartoonWithChild = includesAny(text, [
    "английский мультфильм с ребенком",
    "английский мультфильм с ребёнком",
    "english cartoon with child",
  ]);

  const discussedWords = includesAny(text, [
    "обсуждал слова",
    "обсуждали слова",
    "discussed words",
    "discussed vocabulary",
  ]);

  if (watchedEnglishCartoonWithChild) {
    addCandidate(candidates, {
      slug: "watching",
      title: "Watching",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["watch english cartoon"]),
    });

    addCandidate(candidates, {
      slug: "english-language",
      title: "English language",
      semanticLayer: "domain",
      categoryType: "knowledge_domain",
      confidence: 0.91,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["english language"]),
    });

    addCandidate(candidates, {
      slug: "cartoon",
      title: "Cartoon",
      semanticLayer: "object",
      categoryType: "media_object",
      confidence: 0.88,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["cartoon"]),
    });

    addCandidate(candidates, {
      slug: "child",
      title: "Child",
      semanticLayer: "participant",
      categoryType: "person_participant",
      confidence: 0.94,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("watch_english_cartoon_with_child", ["child"]),
    });

    if (discussedWords) {
      addCandidate(candidates, {
        slug: "vocabulary-discussion",
        title: "Vocabulary discussion",
        semanticLayer: "activity_meaning",
        categoryType: "learning_support",
        confidence: 0.88,
        isRequired: true,
        isConfirmed: true,
        metadata: makeMetadata("watch_english_cartoon_with_child", ["discussed words"]),
      });

      addCandidate(candidates, {
        slug: "helping-child-learn",
        title: "Helping child learn",
        semanticLayer: "activity_meaning",
        categoryType: "activity_meaning",
        confidence: 0.84,
        isRequired: true,
        isConfirmed: true,
        metadata: makeMetadata("watch_english_cartoon_with_child", ["cartoon plus vocabulary discussion"]),
      });
    }
  }

  const wroteCommercialProposal = includesAny(text, [
    "писал коммерческое предложение клиенту",
    "написал коммерческое предложение клиенту",
    "commercial proposal to client",
    "wrote proposal to client",
    "wrote commercial offer to client",
  ]);

  if (wroteCommercialProposal) {
    addCandidate(candidates, {
      slug: "writing",
      title: "Writing",
      semanticLayer: "action",
      categoryType: "activity_action",
      confidence: 0.9,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("write_commercial_proposal_to_client", ["writing proposal"]),
    });

    addCandidate(candidates, {
      slug: "commercial-proposal",
      title: "Commercial proposal",
      semanticLayer: "object",
      categoryType: "business_document",
      confidence: 0.95,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("write_commercial_proposal_to_client", ["commercial proposal"]),
    });

    addCandidate(candidates, {
      slug: "client",
      title: "Client",
      semanticLayer: "participant",
      categoryType: "business_participant",
      confidence: 0.92,
      isRequired: true,
      isConfirmed: true,
      metadata: makeMetadata("write_commercial_proposal_to_client", ["client"]),
    });

    addCandidate(candidates, {
      slug: "b2b-sales",
      title: "B2B sales",
      semanticLayer: "context",
      categoryType: "business_domain",
      confidence: 0.82,
      isRequired: false,
      isConfirmed: true,
      metadata: makeMetadata("write_commercial_proposal_to_client", ["commercial proposal to client"]),
    });
  }

  addDurationMetricCandidate(candidates, input, text);

  const uniqueCandidates = dedupeCandidates(candidates);
  const confidenceValues = uniqueCandidates
    .map((candidate) => candidate.confidence)
    .filter((value): value is number => typeof value === "number");

  const confidence =
    confidenceValues.length > 0
      ? Number(
          (
            confidenceValues.reduce((sum, value) => sum + value, 0) /
            confidenceValues.length
          ).toFixed(4),
        )
      : null;

  if (uniqueCandidates.length === 0) {
    warnings.push("No deterministic category derivation rule matched the input text.");
  }

  return {
    ok: true,
    skipped: uniqueCandidates.length === 0,
    skipReason: uniqueCandidates.length === 0 ? "no_rule_match" : null,
    processorVersion: CATEGORY_DERIVATION_PROCESSOR_VERSION,
    ruleVersion: CATEGORY_DERIVATION_RULE_VERSION,
    confidence,
    candidates: uniqueCandidates,
    warnings,
    errors,
    metadata: {
      extractor: "ruleExtractor",
      extractorVersion: CATEGORY_DERIVATION_RULE_VERSION,
      inputLength: text.length,
    },
  };
}
